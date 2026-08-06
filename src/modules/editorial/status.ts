import type { ContentStatus } from "./types";

/**
 * The status machine.
 *
 * Two rules are load-bearing and everything else is convenience:
 *
 *   1. Nothing reaches "approved" except from "ready_for_review", and only a
 *      person with content.approve can make that move.
 *   2. "sent_to_buffer", "scheduled" and "published" are written by the
 *      publishing module reacting to a provider, never chosen by hand. A human
 *      typing "published" into a dropdown is how a history log starts lying.
 */

export const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  idea: ["drafting", "retired"],
  drafting: [
    "needs_asset",
    "needs_information",
    "needs_approval",
    "ready_for_review",
    "retired",
  ],
  needs_asset: ["drafting", "ready_for_review", "needs_information", "retired"],
  needs_information: ["drafting", "needs_asset", "ready_for_review", "retired"],
  needs_approval: ["drafting", "ready_for_review", "retired"],
  ready_for_review: [
    "approved",
    "drafting",
    "needs_asset",
    "needs_information",
    "needs_approval",
    "retired",
  ],
  approved: ["sent_to_buffer", "ready_for_review", "retired"],
  sent_to_buffer: ["scheduled", "published", "approved", "retired"],
  scheduled: ["published", "approved", "retired"],
  published: ["retired"],
  retired: ["idea", "drafting"],
};

/** Only the publishing module may set these. */
export const PROVIDER_OWNED: ContentStatus[] = [
  "sent_to_buffer",
  "scheduled",
  "published",
];

export const OPEN_STATUSES: ContentStatus[] = [
  "idea",
  "drafting",
  "needs_asset",
  "needs_information",
  "needs_approval",
  "ready_for_review",
  "approved",
];

export type TransitionCheck =
  | { allowed: true }
  | { allowed: false; reason: string };

export function canTransition(
  from: ContentStatus,
  to: ContentStatus,
  opts: { actorCanApprove: boolean; isProviderCallback?: boolean } = {
    actorCanApprove: false,
  },
): TransitionCheck {
  if (from === to) return { allowed: true };

  if (!TRANSITIONS[from].includes(to)) {
    return { allowed: false, reason: `Cannot go from ${from} to ${to}.` };
  }
  if (to === "approved" && !opts.actorCanApprove) {
    return { allowed: false, reason: "Only an admin can approve content." };
  }
  if (PROVIDER_OWNED.includes(to) && !opts.isProviderCallback) {
    return {
      allowed: false,
      reason: `"${to}" is set by the publishing module, not by hand.`,
    };
  }
  return { allowed: true };
}
