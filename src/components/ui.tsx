import type { ContentStatus, Priority } from "@/modules/editorial";
import { STATUS_LABELS } from "@/modules/editorial";

const STATUS_STYLES: Record<ContentStatus, string> = {
  idea: "bg-cream-100 text-navy-500",
  drafting: "bg-navy-50 text-navy-700",
  needs_asset: "bg-gold-100 text-gold-600",
  needs_information: "bg-gold-100 text-gold-600",
  needs_approval: "bg-rust-100 text-rust-600",
  ready_for_review: "bg-navy-100 text-navy-900",
  approved: "bg-rust-500 text-white",
  sent_to_buffer: "bg-navy-500 text-white",
  scheduled: "bg-navy-700 text-white",
  published: "bg-navy-900 text-white",
  retired: "bg-cream-200 text-navy-500 line-through",
};

export function StatusChip({ status }: { status: ContentStatus }) {
  return <span className={`chip ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}

const PRIORITY_STYLES: Record<Priority, string> = {
  urgent: "bg-rust-500 text-white",
  high: "bg-rust-100 text-rust-600",
  normal: "bg-cream-100 text-navy-500",
  evergreen: "bg-gold-100 text-gold-600",
};

export function PriorityChip({ priority }: { priority: Priority }) {
  if (priority === "normal") return null;
  return <span className={`chip ${PRIORITY_STYLES[priority]}`}>{priority}</span>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="text-sm font-medium text-navy-900">{title}</p>
      {hint ? <p className="mt-1 text-sm text-navy-500">{hint}</p> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-navy-500">{hint}</span> : null}
    </label>
  );
}

export function fmtDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}
