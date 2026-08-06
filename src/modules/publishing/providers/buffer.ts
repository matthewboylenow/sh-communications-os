import { config } from "@/core/config";
import type {
  OutboundPost,
  ProviderChannel,
  ProviderPostRef,
  PublishResult,
  PublishingProvider,
} from "@/core/ports/publishing";

/**
 * Buffer provider (GraphQL).
 *
 * Buffer reopened its public API in 2026 as a GraphQL endpoint, self-serve on
 * every plan including Free, with the key generated from account settings. The
 * two constraints that shape this file:
 *
 *  1. There is no binary media upload. You pass a public HTTPS URL and Buffer
 *     fetches it AT PUBLISH TIME. Expiring URLs are a time bomb, which is why
 *     the storage port insists on stable public URLs.
 *  2. `saveToDraft: true` is how we honour "never publish without approval".
 *     Even after Matthew approves in the portal, the safe default is to land
 *     it in Buffer as a draft and let him schedule.
 *
 * Left disabled until BUFFER_ACCESS_TOKEN is set. Nothing in editorial changes
 * when this is swapped for Publer or anything else.
 */

const CREATE_POST = /* GraphQL */ `
  mutation CreatePost($input: PostCreateInput!) {
    createPost(input: $input) {
      ... on Post {
        id
        status
        dueAt
        channelId
      }
      ... on MutationError {
        message
      }
    }
  }
`;

const GET_POSTS = /* GraphQL */ `
  query GetPosts($ids: [String!]!) {
    posts(ids: $ids) {
      id
      status
      externalLink
      sentAt
      channelService
    }
  }
`;

const GET_CHANNELS = /* GraphQL */ `
  query GetChannels {
    account {
      channels {
        id
        service
        name
        serviceUsername
      }
    }
  }
`;

const SERVICE_TO_PLATFORM: Record<string, OutboundPost["platform"]> = {
  facebook: "facebook",
  instagram: "instagram",
  twitter: "x",
  x: "x",
  tiktok: "tiktok",
  youtube: "youtubeShorts",
};

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(config.buffer.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.buffer.accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Buffer returned ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error("Buffer returned no data");
  return json.data;
}

export const bufferProvider: PublishingProvider = {
  name: "buffer",

  isConfigured() {
    return Boolean(config.buffer.accessToken);
  },

  async listChannels(): Promise<ProviderChannel[]> {
    const data = await gql<{
      account: { channels: { id: string; service: string; name: string; serviceUsername: string }[] };
    }>(GET_CHANNELS, {});
    return data.account.channels
      .filter((c) => SERVICE_TO_PLATFORM[c.service])
      .map((c) => ({
        id: c.id,
        platform: SERVICE_TO_PLATFORM[c.service],
        handle: c.serviceUsername,
        displayName: c.name,
      }));
  },

  async createPosts(posts, opts): Promise<PublishResult> {
    const groupId = `bfg_${Date.now().toString(36)}`;
    const refs: ProviderPostRef[] = [];

    for (const post of posts) {
      for (const url of post.mediaUrls) {
        if (!/^https:\/\//.test(url)) {
          throw new Error(
            `Media URL for ${post.platform} is not HTTPS. Buffer fetches media at publish time and will fail.`,
          );
        }
      }
      try {
        const data = await gql<{ createPost: { id?: string; status?: string; message?: string } }>(
          CREATE_POST,
          {
            input: {
              channelId: post.channelId,
              text: post.text,
              media: post.mediaUrls.map((u) => ({ url: u })),
              link: post.link,
              title: post.title,
              schedulingType: post.scheduledAt ? "custom" : "queue",
              dueAt: post.scheduledAt?.toISOString(),
              saveToDraft: opts.asDraft,
            },
          },
        );
        if (data.createPost.message || !data.createPost.id) {
          refs.push({
            platform: post.platform,
            providerPostId: "",
            status: "failed",
            error: data.createPost.message ?? "Buffer did not return a post id",
          });
        } else {
          refs.push({
            platform: post.platform,
            providerPostId: data.createPost.id,
            status: opts.asDraft ? "draft" : "scheduled",
          });
        }
      } catch (err) {
        refs.push({
          platform: post.platform,
          providerPostId: "",
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { groupId, posts: refs };
  },

  async getPostStatus(ids): Promise<ProviderPostRef[]> {
    if (!ids.length) return [];
    const data = await gql<{
      posts: { id: string; status: string; externalLink?: string; channelService?: string }[];
    }>(GET_POSTS, { ids });
    return data.posts.map((p) => ({
      platform: SERVICE_TO_PLATFORM[p.channelService ?? ""] ?? "facebook",
      providerPostId: p.id,
      status: normalizeStatus(p.status),
      publishedUrl: p.externalLink,
    }));
  },

  async deletePost(id) {
    await gql(`mutation Del($id: String!) { deletePost(id: $id) { __typename } }`, { id });
  },
};

function normalizeStatus(s: string): ProviderPostRef["status"] {
  const v = s.toLowerCase();
  if (v.includes("draft")) return "draft";
  if (v.includes("sent") || v.includes("published")) return "sent";
  if (v.includes("schedul") || v.includes("pending") || v.includes("buffer")) return "scheduled";
  if (v.includes("error") || v.includes("fail")) return "failed";
  return "unknown";
}
