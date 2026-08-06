/**
 * Publishing port.
 *
 * The portal is the editorial source of truth. A publishing provider is a
 * delivery mechanism and nothing more. Buffer is the first implementation.
 * Publer, Postiz or direct platform APIs would be additional implementations
 * of this same interface, and swapping one for another must not require a
 * change anywhere in the editorial module.
 *
 * Nothing in this interface knows what a "master caption" is. The publishing
 * module resolves a master item into per-platform payloads before it gets here.
 */

export type PlatformKey =
  | "facebook"
  | "instagram"
  | "x"
  | "tiktok"
  | "youtubeShorts";

export type OutboundPost = {
  /** Our master content id. Providers echo it back where they can. */
  masterContentId: string;
  platform: PlatformKey;
  /** Provider-side channel/profile id for this platform. */
  channelId: string;
  text: string;
  /**
   * Public, direct, non-expiring HTTPS URL. Buffer fetches media at publish
   * time, so signed URLs that expire will fail silently hours later.
   */
  mediaUrls: string[];
  link?: string;
  scheduledAt?: Date;
  /** YouTube and TikTok need a title separate from the body. */
  title?: string;
  /** Instagram first comment, used for hashtag overflow. */
  firstComment?: string;
};

export type ProviderPostRef = {
  platform: PlatformKey;
  providerPostId: string;
  status: "draft" | "scheduled" | "sent" | "failed" | "unknown";
  publishedUrl?: string;
  error?: string;
};

export type PublishResult = {
  /** Groups the child posts back to one master item. */
  groupId: string;
  posts: ProviderPostRef[];
};

export type ProviderChannel = {
  id: string;
  platform: PlatformKey;
  handle: string;
  displayName: string;
};

export interface PublishingProvider {
  readonly name: string;
  /** Does this provider have working credentials right now? */
  isConfigured(): boolean;
  listChannels(): Promise<ProviderChannel[]>;
  /**
   * Create posts. `asDraft` true means the provider must not schedule them,
   * which is the safety net behind "never publish without approval".
   */
  createPosts(posts: OutboundPost[], opts: { asDraft: boolean }): Promise<PublishResult>;
  /** Read current state back so the portal can record what actually happened. */
  getPostStatus(providerPostIds: string[]): Promise<ProviderPostRef[]>;
  deletePost(providerPostId: string): Promise<void>;
}
