import { db } from "@/core/db";
import { auditLog } from "@/core/db/core-schema";
import type { ModuleId } from "@/core/modules/registry";

export async function record(entry: {
  module: ModuleId;
  action: string;
  subjectId?: string | null;
  actorId?: string | null;
  actorLabel?: string | null;
  detail?: Record<string, unknown>;
}) {
  try {
    await db().insert(auditLog).values({
      module: entry.module,
      action: entry.action,
      subjectId: entry.subjectId ?? null,
      actorId: entry.actorId ?? null,
      actorLabel: entry.actorLabel ?? null,
      detail: entry.detail ?? null,
    });
  } catch (err) {
    // An audit write failing must not take down the action it was recording.
    console.error("[audit] write failed", err);
  }
}
