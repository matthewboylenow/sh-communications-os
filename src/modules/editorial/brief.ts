import { z } from "zod";

/**
 * The creative brief, as fields rather than as a paragraph.
 *
 * Section 4 of the project brief says a visual direction must name fourteen
 * things, and that "church community" or "cross at sunset" is not a direction.
 * A free text box does not enforce that. Fourteen named fields do, and they
 * turn out to be the difference between a graphic taking five minutes and
 * taking half an hour, because there is nothing left to decide at the point of
 * making it.
 *
 * This is the expensive part of the work. The caption is quick. Knowing what
 * the picture is, and being sure it is not the fourth sunset cross of the
 * month, is the part worth automating.
 */

export const BRIEF_FIELDS = [
  "purpose",
  "subject",
  "ageRange",
  "setting",
  "composition",
  "cameraAngle",
  "lighting",
  "negativeSpace",
  "crop",
  "colour",
  "typography",
  "overlay",
  "avoid",
  "searchTerm",
] as const;
export type BriefField = (typeof BRIEF_FIELDS)[number];

export const BRIEF_LABELS: Record<BriefField, string> = {
  purpose: "Emotional purpose",
  subject: "Subject",
  ageRange: "Age range",
  setting: "Setting",
  composition: "Composition",
  cameraAngle: "Camera angle",
  lighting: "Lighting",
  negativeSpace: "Negative space",
  crop: "Crop and orientation",
  colour: "Colour treatment",
  typography: "Typography character",
  overlay: "Overlay wording",
  avoid: "Avoid",
  searchTerm: "Exact search or collection",
};

export const BRIEF_HINTS: Record<BriefField, string> = {
  purpose: "What the viewer should feel. Not inspired.",
  subject: "Who or what is in frame. Be specific.",
  ageRange: "Only when people appear.",
  setting: "Where this is.",
  composition: "Where the subject sits, and where the headline goes.",
  cameraAngle: "Eye level, low, overhead.",
  lighting: "Evening, window light, overcast.",
  negativeSpace: "Which third stays clear, and for what.",
  crop: "Square, portrait, landscape, 9:16.",
  colour: "Navy overlay, rust headline, gold underline.",
  typography: "Two faces at most.",
  overlay: "The exact words, as they will be set.",
  avoid: "Specific things, not categories.",
  searchTerm: "The literal search string, or the named collection.",
};

/**
 * The six that make a brief executable.
 *
 * Not all fourteen. Requiring every line before anything can be approved would
 * put the friction on the person rather than on the machine, and the machine is
 * the one drafting these. These six are the ones you cannot open Canva without.
 */
export const BRIEF_REQUIRED: BriefField[] = [
  "purpose",
  "subject",
  "composition",
  "negativeSpace",
  "avoid",
  "searchTerm",
];

export const briefSchema = z.object(
  Object.fromEntries(BRIEF_FIELDS.map((f) => [f, z.string().nullish()])) as Record<
    BriefField,
    z.ZodOptional<z.ZodNullable<z.ZodString>>
  >,
);
export type Brief = Partial<Record<BriefField, string | null>>;

export function filledFields(brief: Brief | null | undefined): BriefField[] {
  if (!brief) return [];
  return BRIEF_FIELDS.filter((f) => (brief[f] ?? "").trim().length > 0);
}

export function missingRequired(brief: Brief | null | undefined): BriefField[] {
  const filled = new Set(filledFields(brief));
  return BRIEF_REQUIRED.filter((f) => !filled.has(f));
}

/**
 * Where an item stands on its picture.
 *
 *   attached  a real file is in the library, which is what a publishing
 *             provider will eventually need
 *   briefed   no file, but a brief good enough to make one from, plus somewhere
 *             to start. This is the normal state, because the graphic gets made
 *             after the decision, not before it
 *   needed    neither. Nobody knows what this looks like yet
 *
 * Derived, never stored. A dropdown somebody can set to "briefed" is a field
 * that will eventually say "briefed" about an empty brief.
 */
export type VisualStatus = "attached" | "briefed" | "needed";

export const VISUAL_STATUS_LABELS: Record<VisualStatus, string> = {
  attached: "Media attached",
  briefed: "Briefed, not made yet",
  needed: "No visual plan",
};

export function visualStatus(input: {
  assetId?: string | null;
  brief?: Brief | null;
  referenceUrl?: string | null;
}): VisualStatus {
  if (input.assetId) return "attached";
  const hasStart = Boolean((input.referenceUrl ?? "").trim());
  if (missingRequired(input.brief).length === 0 && hasStart) return "briefed";
  return "needed";
}

/** What is still missing before this counts as briefed. */
export function briefGaps(input: {
  assetId?: string | null;
  brief?: Brief | null;
  referenceUrl?: string | null;
}): string[] {
  if (input.assetId) return [];
  const out = missingRequired(input.brief).map((f) => `Brief is missing: ${BRIEF_LABELS[f]}.`);
  if (!(input.referenceUrl ?? "").trim()) {
    out.push("No reference link. Give somewhere to start, a template or a collection.");
  }
  return out;
}
