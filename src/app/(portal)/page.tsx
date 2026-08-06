import Link from "next/link";
import {
  listContent,
  listOpenFlags,
  queueHealth,
  staleItems,
} from "@/modules/editorial";
import { StatusChip, PriorityChip, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [health, flags, review, stale] = await Promise.all([
    queueHealth(),
    listOpenFlags(),
    listContent({ status: ["ready_for_review"], limit: 20 }),
    staleItems(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="mt-1 text-sm text-navy-500">
          {verdictLine(health.verdict, health.usable, health.target)}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Usable in queue" value={health.usable} sub={`target ${health.target.min}-${health.target.max}`} />
        <Stat label="Ready for review" value={health.readyForReview} />
        <Stat label="Approved" value={health.approvedUnscheduled} />
        <Stat label="Open flags" value={health.openFlagCount} />
      </section>

      <section>
        <h2 className="text-sm font-semibold">Next 14 days</h2>
        <div className="card mt-2 flex gap-1 overflow-x-auto p-3">
          {health.coverage.map((day) => (
            <div key={day.date} className="min-w-11 flex-1 text-center">
              <div
                className={`mx-auto flex h-11 w-11 items-center justify-center rounded-md text-sm font-semibold ${
                  day.count === 0
                    ? "bg-cream-100 text-navy-500"
                    : day.count > 2
                      ? "bg-gold-100 text-gold-600"
                      : "bg-navy-900 text-white"
                }`}
              >
                {day.count}
              </div>
              <p className="mt-1 text-[10px] text-navy-500">{fmtDate(day.date)}</p>
            </div>
          ))}
        </div>
        {health.gaps.length ? (
          <ul className="mt-2 space-y-1 text-sm text-navy-700">
            {health.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <Section title="Waiting on you" count={review.length}>
        {review.length === 0 ? (
          <p className="text-sm text-navy-500">Nothing is waiting for review.</p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {review.map((item) => (
              <li key={item.id} className="py-3">
                <Link href={`/content/${item.id}`} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-navy-500">
                      {item.platforms.join(", ") || "no platform"}
                      {item.publishAt ? ` · ${fmtDate(item.publishAt, true)}` : ""}
                    </p>
                  </div>
                  <PriorityChip priority={item.priority} />
                  <StatusChip status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Open flags" count={flags.length}>
        {flags.length === 0 ? (
          <p className="text-sm text-navy-500">Nothing outstanding.</p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {flags.map((f) => (
              <li key={f.id} className="flex items-start gap-3 py-3">
                <span
                  className={`chip mt-0.5 ${
                    f.severity === "blocking"
                      ? "bg-rust-500 text-white"
                      : f.severity === "attention"
                        ? "bg-gold-100 text-gold-600"
                        : "bg-cream-100 text-navy-500"
                  }`}
                >
                  {f.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{f.title}</p>
                  {f.detail ? <p className="text-xs text-navy-500">{f.detail}</p> : null}
                  <p className="mt-0.5 text-xs text-navy-500">
                    {[f.owner, f.ministry, f.dueAt ? `due ${fmtDate(f.dueAt)}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {stale.length ? (
        <Section title="Past their useful date" count={stale.length}>
          <ul className="divide-y divide-cream-200">
            {stale.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <Link href={`/content/${item.id}`} className="min-w-0 flex-1 text-sm">
                  {item.title}
                </Link>
                <span className="text-xs text-navy-500">
                  {fmtDate(item.latestUsefulAt ?? item.eventDate)}
                </span>
                <StatusChip status={item.status} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function verdictLine(
  verdict: string,
  usable: number,
  target: { min: number; max: number },
) {
  switch (verdict) {
    case "empty":
      return "The queue is empty. The next daily run has real work to do.";
    case "thin":
      return `${usable} usable items. The queue wants ${target.min} to ${target.max}, so there is room to add.`;
    case "overfull":
      return `${usable} usable items, more than the queue needs. Retire what has gone stale before adding.`;
    default:
      return `${usable} usable items. The queue is healthy, so create only what fills a real gap.`;
  }
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs font-medium text-navy-700">{label}</p>
      {sub ? <p className="text-[11px] text-navy-500">{sub}</p> : null}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold">
        {title} <span className="font-normal text-navy-500">({count})</span>
      </h2>
      <div className="card mt-2 px-4 py-1">{children}</div>
    </section>
  );
}
