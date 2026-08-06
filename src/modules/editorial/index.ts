/**
 * Editorial module, public contract.
 *
 * Everything outside this folder imports from here. Nothing outside this
 * folder imports `./schema`, `./service` or any other internal file directly.
 * The eslint config enforces it.
 */

export {
  PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_LIMITS,
  CONTENT_STATUSES,
  STATUS_LABELS,
  PRIORITIES,
  CONTENT_TYPES,
  APPROVAL_FLAGS,
  APPROVAL_FLAG_LABELS,
  contentInputSchema,
  platformOverrideSchema,
  overridesSchema,
} from "./types";

export type {
  Platform,
  ContentStatus,
  Priority,
  ContentType,
  ApprovalFlag,
  PlatformOverride,
  Overrides,
  ContentInput,
} from "./types";

export { TRANSITIONS, OPEN_STATUSES, canTransition } from "./status";

export {
  BRIEF_FIELDS,
  BRIEF_LABELS,
  BRIEF_HINTS,
  BRIEF_REQUIRED,
  VISUAL_STATUS_LABELS,
  briefSchema,
  filledFields,
  missingRequired,
  visualStatus,
  briefGaps,
} from "./brief";
export type { BriefField, Brief, VisualStatus } from "./brief";

export {
  resolvePlatform,
  resolveAll,
  renderedText,
  describeDeltas,
  checkPlatforms,
} from "./platform";
export type { ResolvedPost, MasterDraft, DeltaLine, PlatformWarning } from "./platform";

export { checkVoice, summarize as summarizeVoice, placeholders, blockingFindings } from "./voice";
export type { VoiceFinding, VoiceChannel } from "./voice";

export {
  AGENT,
  review,
  listContent,
  getContent,
  getContentEvents,
  queueHealth,
  createContent,
  updateContent,
  changeStatus,
  clearFlag,
  deriveFlags,
  recordHistory,
  checkRepetition,
  listHistory,
  listOpenFlags,
  upsertOpenFlag,
  resolveOpenFlag,
  staleItems,
} from "./service";
export type { ActorRef, ReviewState, QueueFilter, QueueHealth } from "./service";

export type {
  ContentItemRow,
  ContentEventRow,
  HistoryEntryRow,
  OpenFlagRow,
} from "./schema";
