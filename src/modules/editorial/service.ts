import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/core/db";
import { emit } from "@/core/events/bus";
import { record } from "@/core/lib/audit";
import {
  contentEvents,
  contentItems,
  historyEntries,
  openFlags,
  type ContentItemRow,
} from "./schema";
import {
  contentInputSchema,
  type ApprovalFlag,
  type ContentInput,
  type ContentStatus,
  type Platform,
  type Priority,
} from "./types";
import { canTransition, OPEN_STATUSES } from "./status";
import {
  checkPlatforms,
  describeDeltas,
  resolveAll,
  type MasterDraft,
} from "./platform";
import { blockingFindings, checkVoice, type VoiceFinding } from "./voice";

export type ActorRef = {
  id: string | null;
  label: string;
  canApprove: boolean;
  kind: "human" | "agent";
};

export const AGENT: ActorRef = {
  id: null,
  label: "Daily run",
  canApprove: false,
  kind: "agent",
};

function toMaster(row: ContentItemRow): MasterDraft {
  return {
    masterCaption: row.masterCaption,
    link: row.link,
    assetId: row.assetId,
    platforms: row.platforms,
    overrides: row.overrides,
  };
}

/** Everything the review screen needs, computed in one place. */
export type ReviewState = {
  item: ContentItemRow;
  resolved: ReturnType<typeof resolveAll>;
  deltas: ReturnType<typeof describeDeltas>;
  platformIssues: ReturnType<typeof checkPlatforms>;
  voice: VoiceFinding[];
  uncleared: ApprovalFlag[];
  blockers: string[];
  canApprove: boolean;
};

export function review(row: ContentItemRow): ReviewState {
  const master = toMaster(row);
  const resolved = resolveAll(master);
  const platformIssues = checkPlatforms(master);
  const voice = checkVoice(row.masterCaption, { channel: row.platforms[0] });
  const uncleared = row.approvalFlags.filter((f) => !row.clearedFlags.includes(f));

  const blockers: string[] = [];
  if (!row.platforms.length) blockers.push("No platform selected.");
  if (!row.masterCaption.trim()) blockers.push("No master caption.");
  for (const issue of platformIssues.filter((i) => i.level === "blocker")) {
    blockers.push(`${issue.platform}: ${issue.message}`);
  }
  for (const f of blockingFindings(voice)) blockers.push(f.message);
  for (const m of row.missingInformation) blockers.push(`Missing: ${m}`);
  if (uncleared.length) {
    blockers.push(
      `${uncleared.length} approval flag${uncleared.length === 1 ? "" : "s"} not cleared.`,
    );
  }

  return {
    item: row,
    resolved,
    deltas: describeDeltas(master),
    platformIssues,
    voice,
    uncleared,
    blockers,
    canApprove: blockers.length === 0,
  };
}

// ---------------------------------------------------------------- queries

export type QueueFilter = {
  status?: ContentStatus[];
  priority?: Priority[];
  platform?: Platform;
  ministry?: string;
  from?: Date;
  to?: Date;
  openOnly?: boolean;
  limit?: number;
};

export async function listContent(filter: QueueFilter = {}) {
  const where = [];
  if (filter.status?.length) where.push(inArray(contentItems.status, filter.status));
  else if (filter.openOnly) where.push(inArray(contentItems.status, OPEN_STATUSES));
  if (filter.priority?.length) where.push(inArray(contentItems.priority, filter.priority));
  if (filter.ministry) where.push(eq(contentItems.ministry, filter.ministry));
  if (filter.from) where.push(gte(contentItems.publishAt, filter.from));
  if (filter.to) where.push(lte(contentItems.publishAt, filter.to));

  const rows = await db()
    .select()
    .from(contentItems)
    .where(where.length ? and(...where) : undefined)
    .orderBy(sql`
      case ${contentItems.priority}
        when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end
    `, contentItems.publishAt, desc(contentItems.updatedAt))
    .limit(filter.limit ?? 200);

  return filter.platform
    ? rows.filter((r) => r.platforms.includes(filter.platform!))
    : rows;
}

export async function getContent(id: string): Promise<ContentItemRow | null> {
  const [row] = await db().select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  return row ?? null;
}

export async function getContentEvents(id: string) {
  return db()
    .select()
    .from(contentEvents)
    .where(eq(contentEvents.contentId, id))
    .orderBy(desc(contentEvents.createdAt));
}

/**
 * Queue health. The daily run reads this to decide whether to create anything
 * at all, which is the whole point of moving off a three-posts-a-day quota.
 */
export type QueueHealth = {
  target: { min: number; max: number };
  usable: number;
  byStatus: Record<string, number>;
  readyForReview: number;
  approvedUnscheduled: number;
  blockedOnInformation: number;
  needsAsset: number;
  coverage: { date: string; count: number }[];
  gaps: string[];
  openFlagCount: number;
  verdict: "healthy" | "thin" | "empty" | "overfull";
};

export async function queueHealth(days = 14): Promise<QueueHealth> {
  const rows = await listContent({ openOnly: true, limit: 500 });

  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  const usable = rows.filter((r) =>
    ["drafting", "needs_asset", "ready_for_review", "approved"].includes(r.status),
  ).length;

  const today = startOfDay(new Date());
  const coverage: { date: string; count: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = isoDate(d);
    coverage.push({
      date: key,
      count: rows.filter((r) => r.publishAt && isoDate(r.publishAt) === key).length,
    });
  }

  const gaps: string[] = [];
  const nextSeven = coverage.slice(0, 7);
  const emptyDays = nextSeven.filter((c) => c.count === 0);
  if (emptyDays.length >= 3) {
    gaps.push(
      `${emptyDays.length} of the next 7 days have nothing scheduled (${emptyDays
        .map((d) => shortDate(d.date))
        .join(", ")}).`,
    );
  }
  const ministries = new Set(rows.map((r) => r.ministry).filter(Boolean));
  if (ministries.size < 3 && rows.length > 3) {
    gaps.push(
      `Only ${ministries.size} ministr${ministries.size === 1 ? "y" : "ies"} represented in the open queue. Spread it wider.`,
    );
  }
  const noAsset = rows.filter((r) => !r.assetId && r.status !== "idea").length;
  if (noAsset > 0) gaps.push(`${noAsset} item${noAsset === 1 ? "" : "s"} still have no media.`);

  const [flagCount] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(openFlags)
    .where(isNull(openFlags.resolvedAt));

  const target = { min: 10, max: 15 };
  const verdict: QueueHealth["verdict"] =
    usable === 0 ? "empty" : usable < target.min ? "thin" : usable > target.max + 5 ? "overfull" : "healthy";

  return {
    target,
    usable,
    byStatus,
    readyForReview: byStatus["ready_for_review"] ?? 0,
    approvedUnscheduled: byStatus["approved"] ?? 0,
    blockedOnInformation: byStatus["needs_information"] ?? 0,
    needsAsset: byStatus["needs_asset"] ?? 0,
    coverage,
    gaps,
    openFlagCount: flagCount?.n ?? 0,
    verdict,
  };
}

// ---------------------------------------------------------------- mutations

export async function createContent(input: unknown, actor: ActorRef) {
  const parsed = contentInputSchema.parse(input);
  const derivedFlags = deriveFlags(parsed);

  const [row] = await db()
    .insert(contentItems)
    .values({
      title: parsed.title,
      contentType: parsed.contentType,
      masterCaption: parsed.masterCaption,
      link: parsed.link ?? null,
      assetId: parsed.assetId ?? null,
      platforms: parsed.platforms,
      overrides: parsed.overrides,
      status: parsed.status,
      priority: parsed.priority,
      publishAt: parsed.publishAt ?? null,
      earliestPublishAt: parsed.earliestPublishAt ?? null,
      latestUsefulAt: parsed.latestUsefulAt ?? null,
      eventDate: parsed.eventDate ?? null,
      ministry: parsed.ministry ?? null,
      sourceMaterial: parsed.sourceMaterial ?? null,
      creativeBrief: parsed.creativeBrief ?? null,
      notes: parsed.notes ?? null,
      approvalFlags: Array.from(new Set([...parsed.approvalFlags, ...derivedFlags])),
      missingInformation: parsed.missingInformation,
      repetitionRisk: parsed.repetitionRisk ?? null,
      relatedContentIds: parsed.relatedContentIds,
      createdBy: actor.id,
      createdByKind: actor.kind,
    })
    .returning();

  await logEvent(row.id, { kind: "created", actor, toStatus: row.status });
  await record({ module: "editorial", action: "content.created", subjectId: row.id, actorId: actor.id, actorLabel: actor.label });
  await emit({ type: "content.created", contentId: row.id, actorId: actor.id });
  return row;
}

export async function updateContent(
  id: string,
  patch: Partial<ContentInput> & { clearedFlags?: ApprovalFlag[] },
  actor: ActorRef,
) {
  const existing = await getContent(id);
  if (!existing) throw new Error("Content item not found");

  const values: Partial<typeof contentItems.$inferInsert> = { updatedAt: new Date() };
  const assign = <K extends keyof typeof values>(k: K, v: (typeof values)[K] | undefined) => {
    if (v !== undefined) values[k] = v;
  };

  assign("title", patch.title);
  assign("contentType", patch.contentType);
  assign("masterCaption", patch.masterCaption);
  assign("link", patch.link ?? undefined);
  assign("assetId", patch.assetId ?? undefined);
  assign("platforms", patch.platforms);
  assign("overrides", patch.overrides);
  assign("priority", patch.priority);
  assign("publishAt", patch.publishAt ?? undefined);
  assign("earliestPublishAt", patch.earliestPublishAt ?? undefined);
  assign("latestUsefulAt", patch.latestUsefulAt ?? undefined);
  assign("eventDate", patch.eventDate ?? undefined);
  assign("ministry", patch.ministry ?? undefined);
  assign("sourceMaterial", patch.sourceMaterial ?? undefined);
  assign("creativeBrief", patch.creativeBrief ?? undefined);
  assign("notes", patch.notes ?? undefined);
  assign("approvalFlags", patch.approvalFlags);
  assign("clearedFlags", patch.clearedFlags);
  assign("missingInformation", patch.missingInformation);
  assign("repetitionRisk", patch.repetitionRisk ?? undefined);
  assign("relatedContentIds", patch.relatedContentIds);

  /**
   * Editing an approved item takes approval away. This is deliberate. The
   * alternative is a system where "approved" can silently mean "approved, then
   * changed", which is exactly the failure the whole portal exists to prevent.
   */
  const contentChanged =
    patch.masterCaption !== undefined ||
    patch.overrides !== undefined ||
    patch.assetId !== undefined ||
    patch.link !== undefined ||
    patch.platforms !== undefined;

  if (existing.status === "approved" && contentChanged) {
    values.status = "ready_for_review";
    values.approvedBy = null;
    values.approvedAt = null;
  }

  const [row] = await db()
    .update(contentItems)
    .set(values)
    .where(eq(contentItems.id, id))
    .returning();

  await logEvent(id, {
    kind: "updated",
    actor,
    fromStatus: existing.status,
    toStatus: row.status,
    note: values.status === "ready_for_review" && existing.status === "approved"
      ? "Approval cleared because the content changed."
      : undefined,
  });
  await emit({ type: "content.updated", contentId: id, actorId: actor.id });
  return row;
}

export async function changeStatus(
  id: string,
  to: ContentStatus,
  actor: ActorRef,
  opts: { note?: string; isProviderCallback?: boolean; force?: boolean } = {},
) {
  const existing = await getContent(id);
  if (!existing) throw new Error("Content item not found");
  if (existing.status === to) return existing;

  const check = canTransition(existing.status, to, {
    actorCanApprove: actor.canApprove,
    isProviderCallback: opts.isProviderCallback,
  });
  if (!check.allowed && !opts.force) throw new Error(check.reason);

  if (to === "approved") {
    const state = review(existing);
    if (!state.canApprove) {
      throw new Error(`Cannot approve yet. ${state.blockers.join(" ")}`);
    }
  }

  const [row] = await db()
    .update(contentItems)
    .set({
      status: to,
      updatedAt: new Date(),
      ...(to === "approved" ? { approvedBy: actor.id, approvedAt: new Date() } : {}),
      ...(to === "retired" ? { retiredReason: opts.note ?? null } : {}),
    })
    .where(eq(contentItems.id, id))
    .returning();

  await logEvent(id, {
    kind: "status_changed",
    actor,
    fromStatus: existing.status,
    toStatus: to,
    note: opts.note,
  });
  await record({
    module: "editorial",
    action: "content.status_changed",
    subjectId: id,
    actorId: actor.id,
    actorLabel: actor.label,
    detail: { from: existing.status, to },
  });
  await emit({
    type: "content.status_changed",
    contentId: id,
    from: existing.status,
    to,
    actorId: actor.id,
  });
  if (to === "approved" && actor.id) {
    await emit({ type: "content.approved", contentId: id, actorId: actor.id });
  }
  if (to === "retired") {
    await emit({ type: "content.retired", contentId: id, reason: opts.note ?? null });
  }
  return row;
}

export async function clearFlag(id: string, flag: ApprovalFlag, actor: ActorRef, note?: string) {
  const existing = await getContent(id);
  if (!existing) throw new Error("Content item not found");
  const cleared = Array.from(new Set([...existing.clearedFlags, flag]));
  const [row] = await db()
    .update(contentItems)
    .set({ clearedFlags: cleared, updatedAt: new Date() })
    .where(eq(contentItems.id, id))
    .returning();
  await logEvent(id, { kind: "flag_cleared", actor, note: note ?? flag, detail: { flag } });
  return row;
}

async function logEvent(
  contentId: string,
  e: {
    kind: string;
    actor: ActorRef;
    fromStatus?: ContentStatus;
    toStatus?: ContentStatus;
    note?: string;
    detail?: Record<string, unknown>;
  },
) {
  await db().insert(contentEvents).values({
    contentId,
    kind: e.kind,
    fromStatus: e.fromStatus ?? null,
    toStatus: e.toStatus ?? null,
    actorId: e.actor.id,
    actorLabel: e.actor.label,
    note: e.note ?? null,
    detail: e.detail ?? null,
  });
}

/**
 * Auto-flagging. A draft that mentions money, minors or a crisis resource gets
 * flagged whether or not whoever wrote it remembered to. Cheap, and it only
 * ever adds friction in the direction of more human review.
 */
export function deriveFlags(input: Pick<ContentInput, "masterCaption" | "title">): ApprovalFlag[] {
  const text = `${input.title}\n${input.masterCaption}`.toLowerCase();
  const flags: ApprovalFlag[] = [];
  const hit = (re: RegExp, flag: ApprovalFlag) => {
    if (re.test(text) && !flags.includes(flag)) flags.push(flag);
  };

  hit(/\bdonat|\bfundrais|\bpledge\b|\bcampaign goal\b/, "fundraising");
  hit(/\$\s?\d|\bcost\b|\bprice\b|\bfee\b|\btickets?\b/, "registration_pricing");
  hit(/\bsuicid|\bcrisis\b|\bhotline\b|\b988\b/, "crisis_resources");
  hit(/\bmental health\b|\banxiet|\bdepress/, "mental_health");
  hit(/\bmsgr\.? tom\b|\bmonsignor\b/, "pastor_quotation");
  hit(/\bteen|\byouth\b|\bchildren\b|\bkids\b|\bgrade \d|\bconfirmation class/, "involves_minors");
  hit(/\bgrief\b|\bfuneral\b|\bmiscarriage\b|\bdivorce\b|\baddiction\b/, "sensitive_pastoral");
  hit(/\bvote\b|\belection\b|\blegislat|\bimmigration policy\b/, "political_implications");

  return flags;
}

// ---------------------------------------------------------------- history

export function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function recordHistory(entries: {
  kind: (typeof historyEntries.$inferInsert)["kind"];
  value: string;
  contentId?: string;
  cooldownDays?: number;
  published?: boolean;
  note?: string;
}[]) {
  if (!entries.length) return;
  await db().insert(historyEntries).values(
    entries.map((e) => ({
      kind: e.kind,
      value: e.value,
      normalized: normalize(e.value),
      contentId: e.contentId ?? null,
      cooldownDays: e.cooldownDays ?? defaultCooldown(e.kind),
      published: e.published ?? false,
      note: e.note ?? null,
    })),
  );
}

function defaultCooldown(kind: string): number {
  switch (kind) {
    case "scripture":
      return 120;
    case "creative_angle":
    case "unsplash_search":
      return 90;
    case "font_pairing":
      return 45;
    case "story_sticker":
      return 7;
    case "ministry_spotlight":
      return 60;
    default:
      return 30;
  }
}

/**
 * "Have we used this recently?" Answers for a batch of candidates in one query
 * so the daily run can check a whole set of ideas at once.
 */
export async function checkRepetition(
  candidates: { kind: string; value: string }[],
): Promise<{ kind: string; value: string; conflict: null | { usedOn: Date; daysAgo: number; cooldownDays: number | null; published: boolean } }[]> {
  if (!candidates.length) return [];
  const normals = candidates.map((c) => normalize(c.value));
  const rows = await db()
    .select()
    .from(historyEntries)
    .where(inArray(historyEntries.normalized, normals))
    .orderBy(desc(historyEntries.usedOn));

  return candidates.map((c) => {
    const n = normalize(c.value);
    const match = rows.find((r) => r.normalized === n && r.kind === c.kind);
    if (!match) return { ...c, conflict: null };
    const daysAgo = Math.floor((Date.now() - match.usedOn.getTime()) / 86_400_000);
    const cooldown = match.cooldownDays;
    if (cooldown !== null && daysAgo >= cooldown) return { ...c, conflict: null };
    return {
      ...c,
      conflict: { usedOn: match.usedOn, daysAgo, cooldownDays: cooldown, published: match.published },
    };
  });
}

export async function listHistory(kind?: string, limit = 200) {
  return db()
    .select()
    .from(historyEntries)
    .where(kind ? eq(historyEntries.kind, kind as never) : undefined)
    .orderBy(desc(historyEntries.usedOn))
    .limit(limit);
}

// ---------------------------------------------------------------- open flags

export async function listOpenFlags(includeResolved = false) {
  return db()
    .select()
    .from(openFlags)
    .where(includeResolved ? undefined : isNull(openFlags.resolvedAt))
    .orderBy(
      sql`case ${openFlags.severity} when 'blocking' then 0 when 'attention' then 1 else 2 end`,
      openFlags.dueAt,
    );
}

export async function upsertOpenFlag(input: {
  id?: string;
  title: string;
  detail?: string;
  owner?: string;
  ministry?: string;
  contentId?: string;
  severity?: "blocking" | "attention" | "fyi";
  dueAt?: Date | null;
}) {
  if (input.id) {
    const [row] = await db()
      .update(openFlags)
      .set({
        title: input.title,
        detail: input.detail ?? null,
        owner: input.owner ?? null,
        ministry: input.ministry ?? null,
        severity: input.severity ?? "attention",
        dueAt: input.dueAt ?? null,
      })
      .where(eq(openFlags.id, input.id))
      .returning();
    return row;
  }
  const [row] = await db()
    .insert(openFlags)
    .values({
      title: input.title,
      detail: input.detail ?? null,
      owner: input.owner ?? null,
      ministry: input.ministry ?? null,
      contentId: input.contentId ?? null,
      severity: input.severity ?? "attention",
      dueAt: input.dueAt ?? null,
    })
    .returning();
  return row;
}

export async function resolveOpenFlag(id: string, note?: string) {
  const [row] = await db()
    .update(openFlags)
    .set({ resolvedAt: new Date(), resolvedNote: note ?? null })
    .where(eq(openFlags.id, id))
    .returning();
  return row;
}

/** Items past their latest useful date that nobody has retired. */
export async function staleItems() {
  return db()
    .select()
    .from(contentItems)
    .where(
      and(
        inArray(contentItems.status, OPEN_STATUSES),
        or(
          lte(contentItems.latestUsefulAt, new Date()),
          lte(contentItems.eventDate, new Date()),
        ),
      ),
    );
}

// ---------------------------------------------------------------- helpers

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isoDate(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}
