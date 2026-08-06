import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createId } from "@/core/lib/ids";
import type { PlatformKey } from "@/core/ports/publishing";

/**
 * Publishing owns the pb_ prefix.
 *
 * The important record here is the group. A provider creates one child post
 * per platform, and without a shared internal group ID there is no way to say
 * "these five things are the same Saint Helen item" a month later.
 */

export const publicationGroups = pgTable(
  "pb_publication_groups",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    /** editorial content id. Cross-module reference, no foreign key. */
    masterContentId: text("master_content_id").notNull(),
    provider: text("provider").notNull().default("buffer"),
    providerGroupId: text("provider_group_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    sentBy: text("sent_by"),
    asDraft: text("as_draft").notNull().default("true"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pb_groups_master_idx").on(t.masterContentId)],
);

export const childPosts = pgTable(
  "pb_child_posts",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    groupId: text("group_id").notNull(),
    platform: text("platform").$type<PlatformKey>().notNull(),
    providerPostId: text("provider_post_id"),
    channelId: text("channel_id"),
    status: text("status", {
      enum: ["draft", "scheduled", "sent", "failed", "unknown"],
    })
      .notNull()
      .default("unknown"),
    publishedUrl: text("published_url"),
    error: text("error"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pb_child_group_idx").on(t.groupId)],
);

/** Provider channels, cached so the UI can show real account names. */
export const providerChannels = pgTable("pb_provider_channels", {
  id: text("id").primaryKey().$defaultFn(createId),
  provider: text("provider").notNull().default("buffer"),
  providerChannelId: text("provider_channel_id").notNull(),
  platform: text("platform").$type<PlatformKey>().notNull(),
  handle: text("handle").notNull(),
  displayName: text("display_name").notNull(),
  active: text("active").notNull().default("true"),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PublicationGroupRow = typeof publicationGroups.$inferSelect;
export type ChildPostRow = typeof childPosts.$inferSelect;
export type ProviderChannelRow = typeof providerChannels.$inferSelect;
