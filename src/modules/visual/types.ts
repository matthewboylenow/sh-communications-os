import { z } from "zod";
import { RATINGS, COMPARISON_OUTCOMES } from "./schema";

export { RATINGS, COMPARISON_OUTCOMES };
export type { Rating, ComparisonOutcome } from "./schema";

/**
 * The three verdicts, in Matthew's words rather than the database's.
 * "Never" is deliberately stronger than "no". A rejected asset is one that
 * should not come back in a suggestion, not one that lost a coin toss.
 */
export const RATING_LABELS: Record<(typeof RATINGS)[number], string> = {
  approved: "Use",
  maybe: "Maybe",
  rejected: "Never",
};

/**
 * The rejection taxonomy, straight from section 5 of the project brief.
 *
 * Fixed list on purpose. Free text would produce fourteen ways of saying "too
 * generic" and nothing that could be counted, and the whole value of this
 * screen is that the reasons add up into something the creative brief step can
 * read.
 */
export const REJECTION_REASONS = [
  "too_generic",
  "too_corporate",
  "too_minimal",
  "too_much_text",
  "too_somber",
  "too_childish",
  "too_evangelical",
  "weak_stock",
  "looks_ai_generated",
  "wrong_tone",
  "right_design_wrong_topic",
  "poor_typography",
  "poor_hierarchy",
  "feels_outdated",
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  too_generic: "Too generic",
  too_corporate: "Too corporate",
  too_minimal: "Too minimal",
  too_much_text: "Too much text",
  too_somber: "Too somber",
  too_childish: "Too childish",
  too_evangelical: "Too evangelical in style",
  weak_stock: "Weak stock photography",
  looks_ai_generated: "Looks AI generated",
  wrong_tone: "Wrong tone for Saint Helen",
  right_design_wrong_topic: "Good design, wrong topic",
  poor_typography: "Poor typography",
  poor_hierarchy: "Poor hierarchy",
  feels_outdated: "Feels outdated",
};

/**
 * What each reason means for the next brief. The style guide export turns
 * these into instructions, because "too generic" appearing nine times is a
 * tally, and "do not open with a stock congregation" is a direction.
 */
export const REJECTION_REASON_DIRECTIONS: Record<RejectionReason, string> = {
  too_generic:
    "Name a specific subject, setting and moment. Never a category like community or worship.",
  too_corporate:
    "Avoid conference lighting, business casual staging and stock-office colour. This is a parish.",
  too_minimal:
    "Empty space needs a reason. If the layout carries nothing but a line of type, give it a subject.",
  too_much_text:
    "One headline, one supporting line, one detail. Anything past that belongs in the caption.",
  too_somber: "Warmth over solemnity, unless the subject genuinely calls for solemnity.",
  too_childish: "No cartoon, no crayon, no bubble type, including on family and youth material.",
  too_evangelical:
    "Avoid the visual language of non-Catholic contemporary worship. No stage lighting, no raised hands in silhouette.",
  weak_stock:
    "If the only option is a weak stock photo, use type and colour instead, or commission the shot.",
  looks_ai_generated:
    "No smeared hands, invented architecture or plastic skin. Check faces and text in any generated image.",
  wrong_tone: "Match the register of the event. A blood drive and a youth night are not the same voice.",
  right_design_wrong_topic:
    "The layout can be reused. Do not reuse the subject matter it was built for.",
  poor_typography: "Two faces at most. Real hierarchy. No stretched, outlined or shadowed type.",
  poor_hierarchy: "One thing should be read first. Decide which and make the size say so.",
  feels_outdated:
    "Avoid gradients on type, drop shadows, bevels and clip art. Nothing that reads as 2011 parish bulletin.",
};

export const preferenceInputSchema = z.object({
  assetId: z.string().min(1),
  rating: z.enum(RATINGS),
  rejectionReasons: z.array(z.enum(REJECTION_REASONS)).default([]),
  tags: z.array(z.string()).default([]),
  topic: z.string().nullish(),
  notes: z.string().nullish(),
});
export type PreferenceInput = z.infer<typeof preferenceInputSchema>;

export const comparisonInputSchema = z.object({
  leftAssetId: z.string().min(1),
  rightAssetId: z.string().min(1),
  outcome: z.enum(COMPARISON_OUTCOMES),
});
export type ComparisonInput = z.infer<typeof comparisonInputSchema>;

export const TRAINING_MODES = ["pair", "rate", "grid"] as const;
export type TrainingMode = (typeof TRAINING_MODES)[number];

export const TRAINING_MODE_LABELS: Record<TrainingMode, string> = {
  pair: "Two at a time",
  rate: "One at a time",
  grid: "Pick the good ones",
};
