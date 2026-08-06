import Link from "next/link";
import type { ContentStatus, Priority } from "@/modules/editorial";
import { STATUS_LABELS } from "@/modules/editorial";

/* ------------------------------------------------------------- status --- */

/**
 * Tone, not colour. "act" is the only thing that gets the accent, so a queue of
 * ordinary rows reads as one colour and the two things that need a person jump
 * off the page. Gold says a fact is missing. Everything settled is ink.
 */
type Tone = "act" | "missing" | "settled" | "quiet" | "retired";

const STATUS_TONE: Record<ContentStatus, Tone> = {
  idea: "quiet",
  drafting: "quiet",
  needs_asset: "missing",
  needs_information: "missing",
  needs_approval: "act",
  ready_for_review: "act",
  approved: "settled",
  sent_to_buffer: "settled",
  scheduled: "settled",
  published: "settled",
  retired: "retired",
};

export function Status({ status }: { status: ContentStatus }) {
  return (
    <span className="status" data-tone={STATUS_TONE[status]}>
      <span className="status-glyph" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function StatusTone({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="status" data-tone={tone}>
      <span className="status-glyph" aria-hidden="true" />
      {children}
    </span>
  );
}

/** Priority is set in words, and only when it is not the ordinary case. */
export function PriorityNote({ priority }: { priority: Priority }) {
  if (priority === "normal") return null;
  const loud = priority === "urgent" || priority === "high";
  return (
    <span className={`mark ${loud ? "text-accent" : ""}`}>{priority}</span>
  );
}

/* ------------------------------------------------------------- framing --- */

/**
 * The nameplate. A dateline is short and sits on the rule beside the title. A
 * lede is a sentence and sits under it, set in the reading face at the measure.
 */
export function Masthead({
  title,
  dateline,
  lede,
  action,
  back,
}: {
  title: string;
  dateline?: React.ReactNode;
  lede?: React.ReactNode;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div>
      {back ? (
        <Link href={back.href} className="mark mb-3 inline-block hover:text-ink">
          &#8592; {back.label}
        </Link>
      ) : null}
      <div className="masthead">
        <h1 className="masthead-title min-w-0">{title}</h1>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 pb-0.5">
          {dateline ? <span className="mark">{dateline}</span> : null}
          {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
        </div>
      </div>
      {lede ? <p className="read mt-3 max-w-[40rem] text-ink-2">{lede}</p> : null}
    </div>
  );
}

export function SectionHead({
  title,
  count,
  aside,
  id,
}: {
  title: string;
  count?: number;
  aside?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="head-rule mb-3" id={id}>
      <h2 className="head shrink-0">{title}</h2>
      {typeof count === "number" ? <span className="mark shrink-0">{count}</span> : null}
      {aside ? <span className="mark head-aside shrink-0">{aside}</span> : null}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-8">
      <p className="read">{title}</p>
      {hint ? <p className="apparatus mt-1 max-w-md">{hint}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------- forms --- */

export function Field({
  label,
  children,
  hint,
  id,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  id?: string;
}) {
  return (
    <label className="block" id={id}>
      <span className="label mb-1.5">{label}</span>
      {children}
      {hint ? <span className="mark mt-1.5 block">{hint}</span> : null}
    </label>
  );
}

/* --------------------------------------------------------------- misc --- */

export function fmtDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return null;
  // A bare "2026-08-16" parses as UTC midnight, which is the evening before in
  // Eastern time. Anchor it at midday so the day it names is the day it shows.
  const date =
    typeof d === "string"
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00Z` : d)
      : d;
  return date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function joinMeta(parts: (string | null | undefined | false)[]) {
  return parts.filter(Boolean).join("  ·  ");
}
