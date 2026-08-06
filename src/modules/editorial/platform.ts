import {
  PLATFORM_LIMITS,
  type Overrides,
  type Platform,
  type PlatformOverride,
} from "./types";

/**
 * Platform inheritance.
 *
 * One master draft. Every selected platform inherits the master caption, media
 * and link unless an override says otherwise. This file is the only place that
 * knows the resolution rule, so the UI, the API and the publishing module all
 * agree by construction.
 */

export type ResolvedPost = {
  platform: Platform;
  caption: string;
  link?: string;
  assetId?: string;
  hashtags: string[];
  firstComment?: string;
  title?: string;
  description?: string;
  /** True when nothing about this platform differs from the master. */
  inherited: boolean;
};

export type MasterDraft = {
  masterCaption: string;
  link?: string | null;
  assetId?: string | null;
  platforms: Platform[];
  overrides: Overrides;
};

export function resolvePlatform(
  master: MasterDraft,
  platform: Platform,
): ResolvedPost {
  const o: PlatformOverride | undefined = master.overrides?.[platform];
  const hashtags = o?.hashtags ?? [];
  const caption = o?.caption ?? master.masterCaption;

  const inherited =
    !o ||
    (o.caption === undefined &&
      o.link === undefined &&
      o.assetId === undefined &&
      o.title === undefined &&
      o.description === undefined &&
      o.firstComment === undefined &&
      (o.hashtags === undefined || o.hashtags.length === 0));

  return {
    platform,
    caption,
    link: o?.link ?? master.link ?? undefined,
    assetId: o?.assetId ?? master.assetId ?? undefined,
    hashtags,
    firstComment: o?.firstComment,
    title: o?.title,
    description: o?.description,
    inherited,
  };
}

export function resolveAll(master: MasterDraft): ResolvedPost[] {
  return master.platforms.map((p) => resolvePlatform(master, p));
}

/** The full text that would actually go out, hashtags included. */
export function renderedText(post: ResolvedPost): string {
  if (!post.hashtags.length) return post.caption;
  return `${post.caption}\n\n${post.hashtags.map(tag).join(" ")}`;
}

function tag(h: string) {
  return h.startsWith("#") ? h : `#${h}`;
}

export type DeltaLine = { platform: Platform; changes: string[] };

/**
 * The short human-readable summary. This is what Matthew reads instead of five
 * near-identical drafts. Platforms with nothing to say are left out entirely.
 */
export function describeDeltas(master: MasterDraft): DeltaLine[] {
  const out: DeltaLine[] = [];
  for (const platform of master.platforms) {
    const o = master.overrides?.[platform];
    if (!o) continue;
    const changes: string[] = [];

    if (o.caption !== undefined && o.caption !== master.masterCaption) {
      const delta = o.caption.length - master.masterCaption.length;
      changes.push(
        delta < 0
          ? `shorter caption (${Math.abs(delta)} fewer characters)`
          : `different caption (${delta} more characters)`,
      );
    }
    if (o.hashtags?.length) {
      changes.push(
        `${o.hashtags.length} hashtag${o.hashtags.length === 1 ? "" : "s"}: ${o.hashtags
          .map(tag)
          .join(" ")}`,
      );
    }
    if (o.link && o.link !== master.link) changes.push(`link ${o.link}`);
    if (o.firstComment) changes.push("first comment");
    if (o.title) changes.push(`title "${o.title}"`);
    if (o.description) changes.push("description");
    if (o.assetId && o.assetId !== master.assetId) changes.push("different media");
    if (o.note) changes.push(o.note);

    if (changes.length) out.push({ platform, changes });
  }
  return out;
}

export type PlatformWarning = {
  platform: Platform;
  level: "blocker" | "warning";
  message: string;
};

/**
 * Checks that run before an item can be approved. Blockers stop approval.
 * Warnings are the voice spec's soft ceilings and only nag.
 */
export function checkPlatforms(master: MasterDraft): PlatformWarning[] {
  const warnings: PlatformWarning[] = [];

  for (const post of resolveAll(master)) {
    const limits = PLATFORM_LIMITS[post.platform];
    const text = renderedText(post);

    if (!text.trim()) {
      warnings.push({
        platform: post.platform,
        level: "blocker",
        message: "No caption.",
      });
    }
    if (text.length > limits.hardChars) {
      warnings.push({
        platform: post.platform,
        level: "blocker",
        message: `${text.length} characters, over the ${limits.hardChars} limit. Needs a shorter override.`,
      });
    }
    if (limits.needsMedia && !post.assetId) {
      warnings.push({
        platform: post.platform,
        level: "blocker",
        message: "Needs an image or video.",
      });
    }
    if (limits.needsTitle && !post.title) {
      warnings.push({
        platform: post.platform,
        level: "blocker",
        message: "Needs a title.",
      });
    }
    if (limits.softWords) {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (words > limits.softWords) {
        warnings.push({
          platform: post.platform,
          level: "warning",
          message: `${words} words. The voice spec caps this platform at ${limits.softWords}.`,
        });
      }
    }
  }
  return warnings;
}
