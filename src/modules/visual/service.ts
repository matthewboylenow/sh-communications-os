import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/core/db";
import { emit } from "@/core/events/bus";
import { record } from "@/core/lib/audit";
import { getAssets, listAssets, setPreference, type AssetRow } from "@/modules/assets";
import { comparisons, preferences, type ComparisonRow, type PreferenceRow } from "./schema";
import {
  comparisonInputSchema,
  preferenceInputSchema,
  type ComparisonInput,
  type PreferenceInput,
} from "./types";
import {
  counts,
  preferencesJson,
  reasonTally,
  sourceScores,
  styleGuideMarkdown,
  type GuideAsset,
  type GuideInput,
} from "./guide";

export type Actor = { id: string | null; label: string };

/**
 * Only an asset with something to look at can be judged. Training on a row
 * that renders as a grey rectangle would record an opinion about a grey
 * rectangle.
 */
function trainable(a: AssetRow) {
  return Boolean(a.thumbnailUrl ?? a.fileUrl);
}

function toGuideAsset(a: AssetRow): GuideAsset {
  return {
    id: a.id,
    title: a.title,
    source: a.source,
    type: a.type,
    tags: a.tags,
    sourceUrl: a.sourceUrl,
    thumbnailUrl: a.thumbnailUrl ?? a.fileUrl,
  };
}

/* ---------------------------------------------------------- decisions --- */

export async function ratePreference(input: PreferenceInput, actor: Actor) {
  const data = preferenceInputSchema.parse(input);

  // A rating that is not "rejected" cannot carry reasons for rejection. Left
  // in place they would show up in the tally and quietly skew the guide.
  const reasons = data.rating === "rejected" ? data.rejectionReasons : [];

  const [asset] = await getAssets([data.assetId]);
  const now = new Date();

  const [row] = await db()
    .insert(preferences)
    .values({
      assetId: data.assetId,
      rating: data.rating,
      rejectionReasons: reasons,
      tags: data.tags,
      assetSource: asset?.source ?? null,
      assetTitle: asset?.title ?? null,
      topic: data.topic ?? null,
      notes: data.notes ?? null,
      decidedBy: actor.label,
      decidedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: preferences.assetId,
      set: {
        rating: data.rating,
        rejectionReasons: reasons,
        tags: data.tags,
        topic: data.topic ?? null,
        notes: data.notes ?? null,
        decidedBy: actor.label,
        updatedAt: now,
      },
    })
    .returning();

  // The assets module owns as_assets and exposes this one narrow write for us.
  // We never touch its table directly.
  await setPreference(data.assetId, data.rating, reasons);

  await record({
    module: "visual",
    action: "rated",
    subjectId: data.assetId,
    actorId: actor.id,
    actorLabel: actor.label,
    detail: { rating: data.rating, reasons },
  });
  await emit({ type: "asset.rated", assetId: data.assetId, rating: data.rating });

  return row;
}

/**
 * Record a pairwise judgement, then let it settle the ratings.
 *
 * A win promotes the winner and leaves the loser alone, because losing to a
 * strong image is not the same as being bad. Only "reject both" marks anything
 * down. This is why the comparison log is kept separately: the ratings are a
 * lossy summary of it and we do not want to be stuck with the summary.
 */
export async function recordComparison(input: ComparisonInput, actor: Actor) {
  const data = comparisonInputSchema.parse(input);

  const [row] = await db()
    .insert(comparisons)
    .values({
      leftAssetId: data.leftAssetId,
      rightAssetId: data.rightAssetId,
      outcome: data.outcome,
      decidedBy: actor.label,
    })
    .returning();

  const promote: string[] = [];
  const demote: string[] = [];
  if (data.outcome === "left") promote.push(data.leftAssetId);
  if (data.outcome === "right") promote.push(data.rightAssetId);
  if (data.outcome === "both") promote.push(data.leftAssetId, data.rightAssetId);
  if (data.outcome === "neither") demote.push(data.leftAssetId, data.rightAssetId);

  for (const id of promote) {
    if (await hasVerdict(id, "rejected")) continue; // never quietly un-reject
    await ratePreference({ assetId: id, rating: "approved", rejectionReasons: [], tags: [] }, actor);
  }
  for (const id of demote) {
    await ratePreference({ assetId: id, rating: "rejected", rejectionReasons: [], tags: [] }, actor);
  }

  return row;
}

async function hasVerdict(assetId: string, rating: string) {
  const [row] = await db()
    .select({ rating: preferences.rating })
    .from(preferences)
    .where(eq(preferences.assetId, assetId))
    .limit(1);
  return row?.rating === rating;
}

/* ------------------------------------------------------------ serving --- */

async function decidedIds(): Promise<string[]> {
  const rows = await db().select({ assetId: preferences.assetId }).from(preferences);
  return rows.map((r) => r.assetId);
}

/** Every asset there is something to look at, newest first. */
export async function trainableAssets(): Promise<AssetRow[]> {
  const all = await listAssets({ limit: 500 });
  return all.filter(trainable);
}

/**
 * The next pair to judge.
 *
 * Prefers assets that have been compared least, so training spreads across the
 * library instead of circling the same six images. Undecided assets come first
 * for the same reason.
 */
export async function nextPair(): Promise<[AssetRow, AssetRow] | null> {
  const pool = await trainableAssets();
  if (pool.length < 2) return null;

  const seen = await db()
    .select({
      id: comparisons.leftAssetId,
      n: sql<number>`count(*)::int`,
    })
    .from(comparisons)
    .groupBy(comparisons.leftAssetId);
  const seenRight = await db()
    .select({
      id: comparisons.rightAssetId,
      n: sql<number>`count(*)::int`,
    })
    .from(comparisons)
    .groupBy(comparisons.rightAssetId);

  const appearances = new Map<string, number>();
  for (const r of [...seen, ...seenRight]) {
    appearances.set(r.id, (appearances.get(r.id) ?? 0) + r.n);
  }

  const sorted = [...pool].sort(
    (a, b) => (appearances.get(a.id) ?? 0) - (appearances.get(b.id) ?? 0),
  );

  // Take the least seen, then a random partner from the leading half, so the
  // pairing is not the same two images every time.
  const left = sorted[0];
  const rest = sorted.slice(1, Math.max(2, Math.ceil(sorted.length / 2)));
  const right = rest[Math.floor(Math.random() * rest.length)] ?? sorted[1];
  return [left, right];
}

/** The next single asset with no verdict against it yet. */
export async function nextUnrated(): Promise<AssetRow | null> {
  const pool = await trainableAssets();
  const decided = new Set(await decidedIds());
  return pool.find((a) => !decided.has(a.id)) ?? null;
}

/** A batch for the grid, undecided first, topped up with already decided. */
export async function gridBatch(size = 12): Promise<AssetRow[]> {
  const pool = await trainableAssets();
  const decided = new Set(await decidedIds());
  const fresh = pool.filter((a) => !decided.has(a.id));
  if (fresh.length >= size) return fresh.slice(0, size);
  return [...fresh, ...pool.filter((a) => decided.has(a.id))].slice(0, size);
}

export async function getPreference(assetId: string): Promise<PreferenceRow | null> {
  const [row] = await db()
    .select()
    .from(preferences)
    .where(eq(preferences.assetId, assetId))
    .limit(1);
  return row ?? null;
}

export async function getPreferences(assetIds: string[]): Promise<PreferenceRow[]> {
  if (!assetIds.length) return [];
  return db().select().from(preferences).where(inArray(preferences.assetId, assetIds));
}

export async function listPreferences(filter: { rating?: string } = {}) {
  return db()
    .select()
    .from(preferences)
    .where(filter.rating ? eq(preferences.rating, filter.rating as never) : undefined)
    .orderBy(desc(preferences.updatedAt))
    .limit(500);
}

export async function listComparisons(limit = 500): Promise<ComparisonRow[]> {
  return db().select().from(comparisons).orderBy(desc(comparisons.decidedAt)).limit(limit);
}

/* --------------------------------------------------------------- stats --- */

export type TrainerStats = {
  library: number;
  trainable: number;
  decided: number;
  undecided: number;
  approved: number;
  maybe: number;
  rejected: number;
  comparisons: number;
  topReasons: { key: string; count: number }[];
  sources: ReturnType<typeof sourceScores>;
};

export async function stats(): Promise<TrainerStats> {
  const [all, prefs, comps] = await Promise.all([
    listAssets({ limit: 500 }),
    listPreferences(),
    listComparisons(),
  ]);

  const pool = all.filter(trainable);
  const guidePrefs = prefs.map(toGuidePreference);
  const c = counts(guidePrefs);

  return {
    library: all.length,
    trainable: pool.length,
    decided: c.total,
    undecided: Math.max(0, pool.length - c.total),
    approved: c.approved,
    maybe: c.maybe,
    rejected: c.rejected,
    comparisons: comps.length,
    topReasons: reasonTally(guidePrefs),
    sources: sourceScores(guidePrefs),
  };
}

function toGuidePreference(p: PreferenceRow) {
  return {
    assetId: p.assetId,
    rating: p.rating,
    rejectionReasons: p.rejectionReasons,
    tags: p.tags,
    assetSource: p.assetSource,
    assetTitle: p.assetTitle,
    topic: p.topic,
    notes: p.notes,
    decidedAt: p.decidedAt,
  };
}

/* -------------------------------------------------------------- export --- */

async function guideInput(): Promise<GuideInput> {
  const [prefs, comps, all] = await Promise.all([
    listPreferences(),
    listComparisons(),
    listAssets({ limit: 500 }),
  ]);
  return {
    preferences: prefs.map(toGuidePreference),
    comparisons: comps.map((c) => ({
      leftAssetId: c.leftAssetId,
      rightAssetId: c.rightAssetId,
      outcome: c.outcome,
    })),
    assets: all.map(toGuideAsset),
  };
}

export async function exportStyleGuide(now = new Date()): Promise<string> {
  return styleGuideMarkdown(await guideInput(), now);
}

export async function exportPreferences() {
  return preferencesJson(await guideInput());
}

/** Assets that have been rejected, so the brief step can steer away from them. */
export async function rejectedAssetIds(): Promise<string[]> {
  const rows = await db()
    .select({ assetId: preferences.assetId })
    .from(preferences)
    .where(eq(preferences.rating, "rejected"));
  return rows.map((r) => r.assetId);
}

/** Approved assets, newest decision first, for the suggestion step to reach for. */
export async function approvedAssets(limit = 40): Promise<AssetRow[]> {
  const rows = await db()
    .select({ assetId: preferences.assetId })
    .from(preferences)
    .where(eq(preferences.rating, "approved"))
    .orderBy(desc(preferences.updatedAt))
    .limit(limit);
  return getAssets(rows.map((r) => r.assetId));
}
