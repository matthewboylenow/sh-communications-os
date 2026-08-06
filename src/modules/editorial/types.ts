import { z } from "zod";

export const PLATFORMS = [
  "facebook",
  "instagram",
  "x",
  "tiktok",
  "youtubeShorts",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
  youtubeShorts: "YouTube Shorts",
};

/**
 * Hard character ceilings from the platforms themselves, and the softer word
 * ceilings from the Saint Helen voice spec. The voice numbers are the ones
 * that matter day to day. X is the only one that regularly forces a real
 * rewrite rather than a trim.
 */
export const PLATFORM_LIMITS: Record<
  Platform,
  { hardChars: number; softWords?: number; needsMedia: boolean; needsTitle: boolean }
> = {
  facebook: { hardChars: 63206, softWords: 80, needsMedia: false, needsTitle: false },
  instagram: { hardChars: 2200, softWords: 60, needsMedia: true, needsTitle: false },
  x: { hardChars: 280, needsMedia: false, needsTitle: false },
  tiktok: { hardChars: 2200, needsMedia: true, needsTitle: false },
  youtubeShorts: { hardChars: 5000, needsMedia: true, needsTitle: true },
};

export const CONTENT_STATUSES = [
  "idea",
  "drafting",
  "needs_asset",
  "needs_information",
  "needs_approval",
  "ready_for_review",
  "approved",
  "sent_to_buffer",
  "scheduled",
  "published",
  "retired",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idea",
  drafting: "Drafting",
  needs_asset: "Needs asset",
  needs_information: "Needs information",
  needs_approval: "Needs approval",
  ready_for_review: "Ready for review",
  approved: "Approved",
  sent_to_buffer: "Sent to Buffer",
  scheduled: "Scheduled",
  published: "Published",
  retired: "Retired",
};

export const PRIORITIES = ["urgent", "high", "normal", "evergreen"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CONTENT_TYPES = [
  "event_promo",
  "deadline",
  "day_of",
  "ministry_spotlight",
  "scripture_quote",
  "homily_clip",
  "recap",
  "volunteer_need",
  "seasonal",
  "announcement",
  "podcast_clip",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/**
 * Approval flags. Every one of these came from a real thing that can go wrong
 * at a parish, so the list is not decoration. An item carrying any flag cannot
 * reach "approved" until the flag is cleared by a person.
 */
export const APPROVAL_FLAGS = [
  "fundraising",
  "financial_request",
  "registration_pricing",
  "sensitive_pastoral",
  "mental_health",
  "crisis_resources",
  "pastor_quotation",
  "new_ministry",
  "major_campaign",
  "involves_minors",
  "unverified_event_details",
  "uncertain_quote",
  "external_organization",
  "political_implications",
  "legal_or_safeguarding",
] as const;
export type ApprovalFlag = (typeof APPROVAL_FLAGS)[number];

export const APPROVAL_FLAG_LABELS: Record<ApprovalFlag, string> = {
  fundraising: "Fundraising",
  financial_request: "Financial request",
  registration_pricing: "Registration pricing",
  sensitive_pastoral: "Sensitive pastoral subject",
  mental_health: "Mental health messaging",
  crisis_resources: "Crisis resources",
  pastor_quotation: "Msgr. Tom quotation",
  new_ministry: "New ministry",
  major_campaign: "Major campaign",
  involves_minors: "Involves minors",
  unverified_event_details: "Unverified event details",
  uncertain_quote: "Uncertain quote",
  external_organization: "External organization",
  political_implications: "Political implications",
  legal_or_safeguarding: "Legal or safeguarding",
};

/** Platform overrides store only the difference from the master draft. */
export const platformOverrideSchema = z.object({
  caption: z.string().optional(),
  link: z.string().url().optional(),
  hashtags: z.array(z.string()).optional(),
  firstComment: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  /** Different media for this platform only, e.g. a 9:16 crop for Stories. */
  assetId: z.string().optional(),
  note: z.string().optional(),
});
export type PlatformOverride = z.infer<typeof platformOverrideSchema>;

/**
 * An explicit object rather than z.record, so the inferred type is genuinely
 * partial. z.record with an enum key infers every key as required, which then
 * lies to every caller.
 */
export const overridesSchema = z.object({
  facebook: platformOverrideSchema.optional(),
  instagram: platformOverrideSchema.optional(),
  x: platformOverrideSchema.optional(),
  tiktok: platformOverrideSchema.optional(),
  youtubeShorts: platformOverrideSchema.optional(),
});
export type Overrides = z.infer<typeof overridesSchema>;

export const contentInputSchema = z.object({
  title: z.string().min(3).max(200),
  contentType: z.enum(CONTENT_TYPES).default("announcement"),
  masterCaption: z.string().default(""),
  link: z.string().url().nullish(),
  assetId: z.string().nullish(),
  platforms: z.array(z.enum(PLATFORMS)).default([]),
  overrides: overridesSchema.default({}),
  status: z.enum(CONTENT_STATUSES).default("idea"),
  priority: z.enum(PRIORITIES).default("normal"),
  publishAt: z.coerce.date().nullish(),
  earliestPublishAt: z.coerce.date().nullish(),
  latestUsefulAt: z.coerce.date().nullish(),
  eventDate: z.coerce.date().nullish(),
  ministry: z.string().nullish(),
  sourceMaterial: z.string().nullish(),
  approvalFlags: z.array(z.enum(APPROVAL_FLAGS)).default([]),
  missingInformation: z.array(z.string()).default([]),
  repetitionRisk: z.string().nullish(),
  relatedContentIds: z.array(z.string()).default([]),
  creativeBrief: z.string().nullish(),
  notes: z.string().nullish(),
});
export type ContentInput = z.infer<typeof contentInputSchema>;
