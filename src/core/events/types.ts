/**
 * Cross-module events.
 *
 * A module that wants something to happen elsewhere emits an event. It does
 * not call the other module. This is what lets publishing be swapped out, or
 * media intelligence be deleted, without editorial noticing.
 *
 * Payloads carry IDs and primitives only. Never a row object from another
 * module's tables, because that would leak a schema across a boundary.
 */

export type DomainEvent =
  | { type: "content.created"; contentId: string; actorId: string | null }
  | { type: "content.updated"; contentId: string; actorId: string | null }
  | {
      type: "content.status_changed";
      contentId: string;
      from: string;
      to: string;
      actorId: string | null;
    }
  | { type: "content.approved"; contentId: string; actorId: string }
  | { type: "content.retired"; contentId: string; reason: string | null }
  | { type: "content.published"; contentId: string; platform: string; url: string | null }
  | { type: "asset.created"; assetId: string; source: string }
  | { type: "asset.used"; assetId: string; contentId: string }
  | { type: "asset.rated"; assetId: string; rating: string }
  | { type: "media.transcript_ready"; recordingId: string }
  | { type: "media.clip_approved"; clipId: string; recordingId: string };

export type EventType = DomainEvent["type"];

export type EventOf<T extends EventType> = Extract<DomainEvent, { type: T }>;

export type Handler<T extends EventType> = (
  event: EventOf<T>,
) => void | Promise<void>;
