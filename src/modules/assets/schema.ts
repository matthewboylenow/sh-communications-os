import { pgTable, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { createId } from "@/core/lib/ids";

export const ASSET_TYPES = ["photo", "graphic", "video", "audio", "template"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_SOURCES = [
  "saint-helen",
  "canva",
  "sunday-social",
  "igniter",
  "unsplash",
  "buffer",
  "youtube",
  "obs",
  "other",
] as const;
export type AssetSource = (typeof ASSET_SOURCES)[number];

export const ASSET_SOURCE_LABELS: Record<AssetSource, string> = {
  "saint-helen": "Saint Helen",
  canva: "Canva",
  "sunday-social": "Sunday Social",
  igniter: "Igniter Media",
  unsplash: "Unsplash",
  buffer: "Buffer",
  youtube: "YouTube",
  obs: "OBS recording",
  other: "Other",
};

export const assets = pgTable(
  "as_assets",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    title: text("title").notNull(),
    type: text("type").$type<AssetType>().notNull().default("photo"),
    source: text("source").$type<AssetSource>().notNull().default("other"),

    sourceUrl: text("source_url"),
    /** Must be public, direct and non-expiring. Providers fetch at publish time. */
    fileUrl: text("file_url"),
    thumbnailUrl: text("thumbnail_url"),
    storageKey: text("storage_key"),

    width: integer("width"),
    height: integer("height"),
    orientation: text("orientation", {
      enum: ["square", "portrait", "landscape", "vertical-video"],
    }),
    durationSeconds: integer("duration_seconds"),
    byteSize: integer("byte_size"),
    contentType: text("content_type"),

    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    ministries: jsonb("ministries").$type<string[]>().notNull().default([]),
    people: jsonb("people").$type<string[]>().notNull().default([]),

    rightsStatus: text("rights_status", { enum: ["approved", "restricted", "unknown"] })
      .notNull()
      .default("unknown"),
    rightsNotes: text("rights_notes"),
    /**
     * Separate from rights on purpose. A photo can be licensed correctly and
     * still not be cleared for a child in it. Both must be true to publish.
     */
    minorReleaseStatus: text("minor_release_status", {
      enum: ["not_applicable", "confirmed", "unconfirmed"],
    })
      .notNull()
      .default("not_applicable"),

    /** Written by the visual module in Phase 2. Assets only stores it. */
    preferenceRating: text("preference_rating", { enum: ["approved", "maybe", "rejected"] }),
    preferenceReasons: jsonb("preference_reasons").$type<string[]>().notNull().default([]),

    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("as_assets_type_idx").on(t.type),
    index("as_assets_source_idx").on(t.source),
    index("as_assets_rights_idx").on(t.rightsStatus),
  ],
);

/** Usage history. Cross-module reference by ID, no foreign key. */
export const assetUsages = pgTable(
  "as_asset_usages",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    assetId: text("asset_id").notNull(),
    /** editorial content id, or a media clip id later. */
    contextId: text("context_id").notNull(),
    contextKind: text("context_kind").notNull().default("content"),
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
    platform: text("platform"),
  },
  (t) => [index("as_asset_usages_asset_idx").on(t.assetId)],
);

export type AssetRow = typeof assets.$inferSelect;
export type AssetUsageRow = typeof assetUsages.$inferSelect;
