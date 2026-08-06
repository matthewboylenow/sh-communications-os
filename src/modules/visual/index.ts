/**
 * Visual trainer module, public contract.
 *
 * Teaches the system Matthew's visual taste through explicit choices, and
 * exports that taste as a style guide the creative brief step reads before it
 * proposes anything.
 *
 * It reads the asset library through the assets module's public contract and
 * writes back through exactly one narrow call, `setPreference`. It owns the
 * `vt_` tables and nothing else.
 */

export { RATINGS, COMPARISON_OUTCOMES } from "./schema";
export type { Rating, ComparisonOutcome, PreferenceRow, ComparisonRow } from "./schema";

export {
  RATING_LABELS,
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  REJECTION_REASON_DIRECTIONS,
  TRAINING_MODES,
  TRAINING_MODE_LABELS,
  preferenceInputSchema,
  comparisonInputSchema,
} from "./types";
export type {
  RejectionReason,
  PreferenceInput,
  ComparisonInput,
  TrainingMode,
} from "./types";

export {
  ratePreference,
  recordComparison,
  nextPair,
  nextUnrated,
  gridBatch,
  trainableAssets,
  getPreference,
  getPreferences,
  listPreferences,
  listComparisons,
  stats,
  exportStyleGuide,
  exportPreferences,
  approvedAssets,
  rejectedAssetIds,
} from "./service";
export type { Actor, TrainerStats } from "./service";

export {
  styleGuideMarkdown,
  preferencesJson,
  reasonTally,
  approvedTagTally,
  sourceScores,
  headToHead,
  counts,
  tally,
} from "./guide";
export type { GuideAsset, GuidePreference, GuideComparison, GuideInput } from "./guide";
