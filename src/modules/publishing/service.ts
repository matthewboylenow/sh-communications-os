import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/core/db";
import { emit } from "@/core/events/bus";
import type { OutboundPost, PublishingProvider } from "@/core/ports/publishing";
import { childPosts, publicationGroups, providerChannels } from "./schema";
import { manualProvider } from "./providers/manual";
import { bufferProvider } from "./providers/buffer";

/**
 * Provider selection. One line to swap the whole publishing layer.
 * Falls back to the manual provider when nothing is configured, which is the
 * correct Phase 1 behaviour rather than an error.
 */
export function activeProvider(): PublishingProvider {
  if (bufferProvider.isConfigured()) return bufferProvider;
  return manualProvider;
}

export async function sendToProvider(args: {
  masterContentId: string;
  posts: OutboundPost[];
  asDraft: boolean;
  sentBy: string | null;
}) {
  const provider = activeProvider();
  const result = await provider.createPosts(args.posts, { asDraft: args.asDraft });

  const [group] = await db()
    .insert(publicationGroups)
    .values({
      masterContentId: args.masterContentId,
      provider: provider.name,
      providerGroupId: result.groupId,
      sentBy: args.sentBy,
      asDraft: String(args.asDraft),
    })
    .returning();

  await db().insert(childPosts).values(
    result.posts.map((p, i) => ({
      groupId: group.id,
      platform: p.platform,
      providerPostId: p.providerPostId || null,
      channelId: args.posts[i]?.channelId ?? null,
      status: p.status,
      error: p.error ?? null,
      payload: { text: args.posts[i]?.text, mediaUrls: args.posts[i]?.mediaUrls },
    })),
  );

  return { group, posts: result.posts };
}

export async function groupsFor(masterContentId: string) {
  const groups = await db()
    .select()
    .from(publicationGroups)
    .where(eq(publicationGroups.masterContentId, masterContentId))
    .orderBy(desc(publicationGroups.sentAt));
  if (!groups.length) return [];
  const children = await db()
    .select()
    .from(childPosts)
    .where(inArray(childPosts.groupId, groups.map((g) => g.id)));
  return groups.map((g) => ({ ...g, children: children.filter((c) => c.groupId === g.id) }));
}

/** Polls the provider and writes back what actually happened. */
export async function refreshGroupStatus(groupId: string) {
  const provider = activeProvider();
  const children = await db().select().from(childPosts).where(eq(childPosts.groupId, groupId));
  const ids = children.map((c) => c.providerPostId).filter(Boolean) as string[];
  if (!ids.length) return children;

  const refs = await provider.getPostStatus(ids);
  const [group] = await db()
    .select()
    .from(publicationGroups)
    .where(eq(publicationGroups.id, groupId))
    .limit(1);

  for (const ref of refs) {
    await db()
      .update(childPosts)
      .set({
        status: ref.status,
        publishedUrl: ref.publishedUrl ?? null,
        error: ref.error ?? null,
        lastCheckedAt: new Date(),
      })
      .where(eq(childPosts.providerPostId, ref.providerPostId));

    if (ref.status === "sent" && group) {
      await emit({
        type: "content.published",
        contentId: group.masterContentId,
        platform: ref.platform,
        url: ref.publishedUrl ?? null,
      });
    }
  }
  return db().select().from(childPosts).where(eq(childPosts.groupId, groupId));
}

export async function syncChannels() {
  const provider = activeProvider();
  const channels = await provider.listChannels();
  for (const c of channels) {
    const existing = await db()
      .select()
      .from(providerChannels)
      .where(eq(providerChannels.providerChannelId, c.id))
      .limit(1);
    if (existing.length) {
      await db()
        .update(providerChannels)
        .set({ handle: c.handle, displayName: c.displayName, refreshedAt: new Date() })
        .where(eq(providerChannels.providerChannelId, c.id));
    } else {
      await db().insert(providerChannels).values({
        provider: provider.name,
        providerChannelId: c.id,
        platform: c.platform,
        handle: c.handle,
        displayName: c.displayName,
      });
    }
  }
  return channels;
}

export async function listChannels() {
  return db().select().from(providerChannels);
}
