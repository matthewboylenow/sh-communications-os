import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@/core/lib/ids";
import type {
  ApprovalFlag,
  ContentStatus,
  ContentType,
  Overrides,
  Platform,
  Priority,
} from "./types";

/**
 * Editorial owns the ed_ prefix. Nothing outside this module writes these
 * tables. `assetId` points at the assets module by ID with no foreign key, so
 * assets can be swapped for a different library without a migration here.
 */

export const contentItems = pgTable(
  "ed_content_items",
  {
    id: text("id").primaryKey().$defaultFn(createId),

    title: text("title").notNull(),
    contentType: text("content_type").$type<ContentType>().notNull().default("announcement"),
    masterCaption: text("master_caption").notNull().default(""),
    link: text("link"),

    /** assets module ID. Intentionally not a foreign key. */
    assetId: text("asset_id"),

    platforms: jsonb("platforms").$type<Platform[]>().notNull().default([]),
    overrides: jsonb("overrides").$type<Overrides>().notNull().default({}),

    status: text("status").$type<ContentStatus>().notNull().default("idea"),
    priority: text("priority").$type<Priority>().notNull().default("normal"),

    publishAt: timestamp("publish_at", { withTimezone: true }),
    earliestPublishAt: timestamp("earliest_publish_at", { withTimezone: true }),
    latestUsefulAt: timestamp("latest_useful_at", { withTimezone: true }),
    eventDate: timestamp("event_date", { withTimezone: true }),

    ministry: text("ministry"),
    sourceMaterial: text("source_material"),
    creativeBrief: text("creative_brief"),
    notes: text("notes"),

    approvalFlags: jsonb("approval_flags").$type<ApprovalFlag[]>().notNull().default([]),
    clearedFlags: jsonb("cleared_flags").$type<ApprovalFlag[]>().notNull().default([]),
    missingInformation: jsonb("missing_information").$type<string[]>().notNull().default([]),

    repetitionRisk: text("repetition_risk"),
    relatedContentIds: jsonb("related_content_ids").$type<string[]>().notNull().default([]),

    /** Who created it. "agent" when the scheduled daily run did. */
    createdBy: text("created_by"),
    createdByKind: text("created_by_kind", { enum: ["human", "agent"] })
      .notNull()
      .default("human"),

    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    retiredReason: text("retired_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ed_content_status_idx").on(t.status),
    index("ed_content_publish_idx").on(t.publishAt),
    index("ed_content_priority_idx").on(t.priority),
  ],
);

/** Append-only. Every status change, approval and edit note lands here. */
export const contentEvents = pgTable(
  "ed_content_events",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    contentId: text("content_id").notNull(),
    kind: text("kind").notNull(),
    fromStatus: text("from_status").$type<ContentStatus>(),
    toStatus: text("to_status").$type<ContentStatus>(),
    actorId: text("actor_id"),
    actorLabel: text("actor_label"),
    note: text("note"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ed_content_events_content_idx").on(t.contentId)],
);

/**
 * The history log, as a table.
 *
 * This replaces the markdown doc the daily run currently reads and rewrites.
 * The point is repetition avoidance: a creative angle, a Scripture passage, an
 * Unsplash search term and a font pairing are all things we must not reuse too
 * soon, and a table can answer "have we used this" in a way a prose document
 * cannot.
 */
export const historyEntries = pgTable(
  "ed_history_entries",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    kind: text("kind", {
      enum: [
        "creative_angle",
        "scripture",
        "unsplash_search",
        "font_pairing",
        "story_sticker",
        "ministry_spotlight",
        "template",
        "topic",
      ],
    }).notNull(),
    value: text("value").notNull(),
    normalized: text("normalized").notNull(),
    contentId: text("content_id"),
    usedOn: timestamp("used_on", { withTimezone: true }).notNull().defaultNow(),
    /** true once it actually published, false while it is only a draft. */
    published: boolean("published").notNull().default(false),
    /** Days before this may be used again. Null means no cooldown. */
    cooldownDays: integer("cooldown_days"),
    note: text("note"),
  },
  (t) => [
    index("ed_history_kind_idx").on(t.kind),
    index("ed_history_norm_idx").on(t.normalized),
  ],
);

/** Open questions waiting on a human. The "Open flags" section of the log. */
export const openFlags = pgTable(
  "ed_open_flags",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    title: text("title").notNull(),
    detail: text("detail"),
    owner: text("owner"),
    ministry: text("ministry"),
    contentId: text("content_id"),
    severity: text("severity", { enum: ["blocking", "attention", "fyi"] })
      .notNull()
      .default("attention"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedNote: text("resolved_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ed_open_flags_resolved_idx").on(t.resolvedAt)],
);

export type ContentItemRow = typeof contentItems.$inferSelect;
export type ContentEventRow = typeof contentEvents.$inferSelect;
export type HistoryEntryRow = typeof historyEntries.$inferSelect;
export type OpenFlagRow = typeof openFlags.$inferSelect;
