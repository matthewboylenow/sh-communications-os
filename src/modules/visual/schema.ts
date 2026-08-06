import { pgTable, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@/core/lib/ids";

/**
 * Visual trainer tables.
 *
 * Two of them, and the split matters. `vt_preferences` holds the settled
 * verdict on an asset, one row per asset. `vt_comparisons` is the log of
 * pairwise judgements, one row per decision, never collapsed.
 *
 * Keeping the log is the point. "Approved" tells you Matthew liked something.
 * "This beat that" tells you what he liked it more than, which is the thing a
 * creative brief actually needs and the thing a single rating throws away.
 *
 * asset_id is a plain text column. No foreign key crosses into the assets
 * module, so deleting the asset library would leave this table orphaned rather
 * than requiring a migration here.
 */

export const RATINGS = ["approved", "maybe", "rejected"] as const;
export type Rating = (typeof RATINGS)[number];

export const preferences = pgTable(
  "vt_preferences",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    /** as_assets.id. Cross-module reference, deliberately not a foreign key. */
    assetId: text("asset_id").notNull(),
    rating: text("rating").$type<Rating>().notNull(),

    /** Only meaningful when the rating is "rejected". */
    rejectionReasons: jsonb("rejection_reasons").$type<string[]>().notNull().default([]),
    /** What was good about it, in Matthew's words rather than the taxonomy. */
    tags: jsonb("tags").$type<string[]>().notNull().default([]),

    /**
     * Copied off the asset at decision time so the export can be built without
     * reaching across a module boundary, and so the record survives the asset
     * being retired or replaced.
     */
    assetSource: text("asset_source"),
    assetTitle: text("asset_title"),
    topic: text("topic"),

    notes: text("notes"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vt_preferences_asset_idx").on(t.assetId),
    index("vt_preferences_rating_idx").on(t.rating),
  ],
);

export const COMPARISON_OUTCOMES = ["left", "right", "both", "neither"] as const;
export type ComparisonOutcome = (typeof COMPARISON_OUTCOMES)[number];

export const comparisons = pgTable(
  "vt_comparisons",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    leftAssetId: text("left_asset_id").notNull(),
    rightAssetId: text("right_asset_id").notNull(),
    outcome: text("outcome").$type<ComparisonOutcome>().notNull(),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vt_comparisons_left_idx").on(t.leftAssetId),
    index("vt_comparisons_right_idx").on(t.rightAssetId),
    index("vt_comparisons_decided_idx").on(t.decidedAt),
  ],
);

export type PreferenceRow = typeof preferences.$inferSelect;
export type ComparisonRow = typeof comparisons.$inferSelect;
