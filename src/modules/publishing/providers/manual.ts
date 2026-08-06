import type { PublishingProvider, ProviderPostRef } from "@/core/ports/publishing";

/**
 * The Phase 1 provider: none at all.
 *
 * It records what would have been sent and marks everything "draft", so the
 * whole approval path can be exercised end to end before a single credential
 * exists. Matthew copies the resolved captions into Buffer by hand and the
 * portal still holds an honest record of what went where.
 */
export const manualProvider: PublishingProvider = {
  name: "manual",

  isConfigured() {
    return true;
  },

  async listChannels() {
    return [];
  },

  async createPosts(posts) {
    const groupId = `man_${Date.now().toString(36)}`;
    const refs: ProviderPostRef[] = posts.map((p) => ({
      platform: p.platform,
      providerPostId: `${groupId}_${p.platform}`,
      status: "draft" as const,
    }));
    return { groupId, posts: refs };
  },

  async getPostStatus(ids) {
    return ids.map((id) => ({
      platform: "facebook" as const,
      providerPostId: id,
      status: "unknown" as const,
    }));
  },

  async deletePost() {
    /* nothing to delete */
  },
};
