import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/core/db";
import { emit } from "@/core/events/bus";
import { blobStorage } from "./storage";
import {
  assets,
  assetUsages,
  ASSET_SOURCES,
  ASSET_TYPES,
  type AssetRow,
} from "./schema";

export const assetInputSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(ASSET_TYPES).default("photo"),
  source: z.enum(ASSET_SOURCES).default("other"),
  sourceUrl: z.string().url().nullish(),
  fileUrl: z.string().url().nullish(),
  thumbnailUrl: z.string().url().nullish(),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  durationSeconds: z.number().int().nonnegative().nullish(),
  tags: z.array(z.string()).default([]),
  ministries: z.array(z.string()).default([]),
  people: z.array(z.string()).default([]),
  rightsStatus: z.enum(["approved", "restricted", "unknown"]).default("unknown"),
  rightsNotes: z.string().nullish(),
  minorReleaseStatus: z
    .enum(["not_applicable", "confirmed", "unconfirmed"])
    .default("not_applicable"),
  notes: z.string().nullish(),
});
export type AssetInput = z.infer<typeof assetInputSchema>;

export function orientationFor(w?: number | null, h?: number | null) {
  if (!w || !h) return null;
  const ratio = w / h;
  if (Math.abs(ratio - 1) < 0.05) return "square" as const;
  if (ratio < 0.85) return h / w >= 1.6 ? ("vertical-video" as const) : ("portrait" as const);
  return "landscape" as const;
}

export async function listAssets(filter: {
  type?: string;
  source?: string;
  search?: string;
  rights?: string;
  limit?: number;
} = {}) {
  const where = [];
  if (filter.type) where.push(eq(assets.type, filter.type as never));
  if (filter.source) where.push(eq(assets.source, filter.source as never));
  if (filter.rights) where.push(eq(assets.rightsStatus, filter.rights as never));
  if (filter.search) {
    const q = `%${filter.search.toLowerCase()}%`;
    where.push(sql`(lower(${assets.title}) like ${q} or lower(${assets.tags}::text) like ${q})`);
  }
  return db()
    .select()
    .from(assets)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(assets.createdAt))
    .limit(filter.limit ?? 200);
}

export async function getAsset(id: string): Promise<AssetRow | null> {
  const [row] = await db().select().from(assets).where(eq(assets.id, id)).limit(1);
  return row ?? null;
}

export async function getAssets(ids: string[]): Promise<AssetRow[]> {
  if (!ids.length) return [];
  return db().select().from(assets).where(inArray(assets.id, ids));
}

export async function createAsset(input: unknown, createdBy: string | null) {
  const parsed = assetInputSchema.parse(input);
  const [row] = await db()
    .insert(assets)
    .values({
      ...parsed,
      sourceUrl: parsed.sourceUrl ?? null,
      fileUrl: parsed.fileUrl ?? null,
      thumbnailUrl: parsed.thumbnailUrl ?? null,
      width: parsed.width ?? null,
      height: parsed.height ?? null,
      durationSeconds: parsed.durationSeconds ?? null,
      rightsNotes: parsed.rightsNotes ?? null,
      notes: parsed.notes ?? null,
      orientation: orientationFor(parsed.width, parsed.height),
      createdBy,
    })
    .returning();
  await emit({ type: "asset.created", assetId: row.id, source: row.source });
  return row;
}

export async function uploadAsset(
  file: File,
  meta: Omit<AssetInput, "fileUrl"> & { fileUrl?: never },
  createdBy: string | null,
) {
  if (!blobStorage.isConfigured()) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set, so uploads are off. Add an asset by URL instead.",
    );
  }
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase();
  const key = `assets/${Date.now()}-${safe}`;
  const stored = await blobStorage.put(key, file, { contentType: file.type });

  return createAsset(
    {
      ...meta,
      fileUrl: stored.publicUrl,
      thumbnailUrl: stored.publicUrl,
    },
    createdBy,
  ).then(async (row) => {
    await db()
      .update(assets)
      .set({ storageKey: key, byteSize: stored.size, contentType: file.type })
      .where(eq(assets.id, row.id));
    return row;
  });
}

/**
 * Fetch a public URL once and store the bytes ourselves.
 *
 * This is the honest way to use a link from anywhere: Sunday Social, Igniter,
 * Canva, Unsplash, a parish photographer's Dropbox. We do NOT keep pointing at
 * somebody else's CDN, for two reasons that both end badly on a Sunday.
 *
 *  1. Publishing providers fetch media at publish time, not at schedule time.
 *     A link that works when you queue the post on Thursday and 404s on Sunday
 *     morning is the exact failure this system exists to prevent.
 *  2. Hotlinking a paid library's CDN is not what a licence covers. Downloading
 *     under the subscription you already pay for, and serving it from your own
 *     storage, is.
 *
 * Without blob storage configured there is nowhere to put the bytes, so the
 * remote URL is kept and the asset is marked as a link we do not control. It
 * will work, and it is the fragile option, and it says so.
 */
export async function ingestFromUrl(
  url: string,
  meta: Omit<AssetInput, "fileUrl" | "thumbnailUrl">,
  createdBy: string | null,
) {
  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch {
    throw new Error("That URL could not be reached from the server.");
  }
  if (!res.ok) {
    throw new Error(`That URL returned ${res.status}. It has to be publicly readable.`);
  }

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!/^(image|video)\//.test(contentType)) {
    throw new Error(
      `That URL returned ${contentType || "no content type"}, not an image or a video. ` +
        "A gallery or product page will not work. The link has to point at the file itself.",
    );
  }

  if (!blobStorage.isConfigured()) {
    return createAsset(
      {
        ...meta,
        fileUrl: url,
        thumbnailUrl: url,
        notes: [meta.notes, "Remote link, not stored by us. Set BLOB_READ_WRITE_TOKEN to fix."]
          .filter(Boolean)
          .join(" "),
      },
      createdBy,
    );
  }

  const blob = await res.blob();
  const ext = contentType.split("/")[1]?.replace(/[^a-z0-9]/g, "") ?? "bin";
  const safe = meta.title.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase().slice(0, 60);
  const key = `assets/${Date.now()}-${safe}.${ext}`;
  const stored = await blobStorage.put(key, blob, { contentType });

  const row = await createAsset(
    { ...meta, fileUrl: stored.publicUrl, thumbnailUrl: stored.publicUrl, sourceUrl: meta.sourceUrl ?? url },
    createdBy,
  );
  await db()
    .update(assets)
    .set({ storageKey: key, byteSize: stored.size, contentType })
    .where(eq(assets.id, row.id));
  return row;
}

export async function updateAsset(id: string, patch: Partial<AssetInput>) {
  const [row] = await db()
    .update(assets)
    .set({
      ...patch,
      sourceUrl: patch.sourceUrl ?? undefined,
      fileUrl: patch.fileUrl ?? undefined,
      rightsNotes: patch.rightsNotes ?? undefined,
      notes: patch.notes ?? undefined,
      orientation:
        patch.width || patch.height ? orientationFor(patch.width, patch.height) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, id))
    .returning();
  return row;
}

/**
 * Written by the visual module, and only by the visual module.
 *
 * The rating itself lives in vt_preferences, which the visual module owns.
 * This mirrors it onto the asset so the library and the suggestion step can
 * read taste without querying across a module boundary. Assets stores it and
 * never decides it.
 */
export async function setPreference(
  assetId: string,
  rating: "approved" | "maybe" | "rejected",
  reasons: string[] = [],
) {
  const [row] = await db()
    .update(assets)
    .set({ preferenceRating: rating, preferenceReasons: reasons, updatedAt: new Date() })
    .where(eq(assets.id, assetId))
    .returning();
  return row ?? null;
}

export async function recordUsage(
  assetId: string,
  contextId: string,
  contextKind = "content",
  platform?: string,
) {
  await db().insert(assetUsages).values({ assetId, contextId, contextKind, platform: platform ?? null });
  await emit({ type: "asset.used", assetId, contentId: contextId });
}

export async function usageHistory(assetId: string) {
  return db()
    .select()
    .from(assetUsages)
    .where(eq(assetUsages.assetId, assetId))
    .orderBy(desc(assetUsages.usedAt));
}

/**
 * Publish readiness for a single asset. Called before an item can be approved.
 * Rights and minor-release are separate gates and both must pass.
 */
export function publishBlockers(asset: AssetRow | null): string[] {
  if (!asset) return ["No media attached."];
  const out: string[] = [];
  if (!asset.fileUrl) out.push("Asset has no file URL.");
  if (asset.rightsStatus === "restricted") out.push("Asset rights are marked restricted.");
  if (asset.rightsStatus === "unknown") out.push("Asset rights have not been confirmed.");
  if (asset.minorReleaseStatus === "unconfirmed") {
    out.push("Asset shows a minor and the release has not been confirmed.");
  }
  return out;
}
