import Link from "next/link";
import {
  listContent,
  listOpenFlags,
  queueHealth,
  staleItems,
  type QueueHealth,
} from "@/modules/editorial";
import {
  Status,
  PriorityNote,
  Masthead,
  SectionHead,
  fmtDate,
  joinMeta,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [health, flags, review, stale] = await Promise.all([
    queueHealth(),
    listOpenFlags(),
    listContent({ status: ["ready_for_review"], limit: 20 }),
    staleItems(),
  ]);

  const today = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-12">
      <Masthead
        title="Today"
        dateline={today}
        action={
          <Link href="/content/new" className="btn btn-ink">
            New item
          </Link>
        }
      />

      <QueueReading health={health} />

      <section>
        <SectionHead title="Next 14 days" aside="items per day" />
        <div className="scroll-x -mx-1 flex gap-px px-1 pb-1">
          {health.coverage.map((day, i) => (
            <DayColumn key={day.date} date={day.date} count={day.count} isToday={i === 0} />
          ))}
        </div>
        {health.gaps.length ? (
          <ul className="mt-4 max-w-[40rem] space-y-2">
            {health.gaps.map((g) => (
              <li key={g} className="note" data-level="warning">
                <span className="note-glyph" aria-hidden="true">
                  ◇
                </span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <SectionHead title="Waiting on you" count={review.length} />
        {review.length === 0 ? (
          <p className="read text-ink-2">Nothing is waiting for review.</p>
        ) : (
          <ul className="ruled border-t border-rule">
            {review.map((item) => (
              <li key={item.id}>
                <Link href={`/content/${item.id}`} className="ruled-row">
                  <div className="galley">
                    <div className="min-w-0">
                      <h3 className="head">{item.title}</h3>
                      <p className="mark mt-1.5">
                        {joinMeta([
                          item.platforms.join(", ") || "no platform",
                          item.ministry,
                        ])}
                      </p>
                    </div>
                    <div className="margin-note space-y-1.5">
                      <Status status={item.status} />
                      <p className="mark">
                        {item.publishAt ? fmtDate(item.publishAt, true) : "unscheduled"}
                      </p>
                      <PriorityNote priority={item.priority} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHead title="Open flags" count={flags.length} />
        {flags.length === 0 ? (
          <p className="read text-ink-2">Nothing outstanding.</p>
        ) : (
          <ul className="ruled border-t border-rule">
            {flags.map((f) => (
              <li key={f.id} className="galley py-3.5">
                <div className="min-w-0">
                  <p className="flex gap-2 text-[0.9375rem]">
                    <span
                      className="note-glyph shrink-0"
                      style={{
                        color:
                          f.severity === "blocking"
                            ? "var(--accent)"
                            : f.severity === "attention"
                              ? "var(--gold)"
                              : "var(--ink-3)",
                      }}
                      aria-hidden="true"
                    >
                      {f.severity === "blocking" ? "✕" : f.severity === "attention" ? "!" : "?"}
                    </span>
                    <span>{f.title}</span>
                  </p>
                  {f.detail ? (
                    <p className="apparatus mt-1 pl-[1.375rem]">{f.detail}</p>
                  ) : null}
                </div>
                <div className="margin-note">
                  <p className="mark">
                    {joinMeta([
                      f.owner,
                      f.ministry,
                      f.dueAt ? `due ${fmtDate(f.dueAt)}` : null,
                    ])}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {stale.length ? (
        <section>
          <SectionHead title="Past their useful date" count={stale.length} />
          <ul className="ruled border-t border-rule">
            {stale.map((item) => (
              <li key={item.id}>
                <Link href={`/content/${item.id}`} className="ruled-row">
                  <div className="galley">
                    <span className="min-w-0 text-[0.9375rem]">{item.title}</span>
                    <div className="margin-note flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <Status status={item.status} />
                      <span className="mark">
                        {fmtDate(item.latestUsefulAt ?? item.eventDate)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * The queue reading. One large figure against the 10 to 15 band, then three
 * secondary counts divided by rules rather than boxed into cards. The whole
 * point of the inventory model is that the number only means something next to
 * the number we want, so the scale is drawn rather than described.
 */
function QueueReading({ health }: { health: QueueHealth }) {
  const scale = Math.max(health.target.max + 4, health.usable + 2);
  const pos = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;

  return (
    <section>
      <div className="galley">
        <div>
          <div className="flex items-end gap-4">
            <span className="figure-large">{health.usable}</span>
            <span className="apparatus pb-2">usable items</span>
          </div>

          {/*
            The band is what a healthy queue holds. The bar is what it holds
            today. The count on its own says nothing, which is the whole reason
            the inventory model replaced the three a day quota.
          */}
          <div className="mt-6 max-w-[28rem]">
            <div className="relative h-7">
              <div
                className="absolute inset-y-0 border-x border-rule bg-sunk"
                style={{
                  left: pos(health.target.min),
                  right: `${100 - (health.target.max / scale) * 100}%`,
                }}
              />
              <div className="absolute inset-x-0 bottom-0 border-t border-rule" />
              <div
                className="absolute bottom-0 h-2 bg-ink"
                style={{ width: pos(health.usable) }}
              />
            </div>
            <div className="relative mt-1.5 h-4">
              <span className="mark absolute left-0">0</span>
              <span
                className="mark absolute -translate-x-1/2"
                style={{ left: pos(health.target.min) }}
              >
                {health.target.min}
              </span>
              <span
                className="mark absolute -translate-x-1/2"
                style={{ left: pos(health.target.max) }}
              >
                {health.target.max}
              </span>
              <span
                className="mark absolute -translate-x-1/2"
                style={{
                  left: `${((health.target.min + health.target.max) / 2 / scale) * 100}%`,
                  top: "1.15rem",
                }}
              >
                target
              </span>
            </div>
          </div>

          <p className="read mt-8">
            {verdictLine(health.verdict, health.usable, health.target)}
          </p>
        </div>

        <div className="margin-note">
          <dl className="ruled border-t border-rule">
            <Reading
              label="Ready for review"
              value={health.readyForReview}
              href="/queue?status=ready_for_review"
              act={health.readyForReview > 0}
            />
            <Reading
              label="Approved"
              value={health.approvedUnscheduled}
              href="/queue?status=approved"
            />
            <Reading label="Needing media" value={health.needsAsset} href="/queue?status=needs_asset" />
            <Reading label="Open flags" value={health.openFlagCount} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Reading({
  label,
  value,
  href,
  act,
}: {
  label: string;
  value: number;
  href?: string;
  act?: boolean;
}) {
  const body = (
    <>
      <dt className="apparatus">{label}</dt>
      <dd className={`mark tnum text-sm ${act ? "text-accent" : "text-ink"}`}>{value}</dd>
    </>
  );
  const cls = "flex items-baseline justify-between gap-3 py-2";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:text-ink`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * One day of the fortnight. Height carries the count, so an empty stretch is
 * visible as a shape rather than as a row of zeroes to read.
 */
function DayColumn({
  date,
  count,
  isToday,
}: {
  date: string;
  count: number;
  isToday: boolean;
}) {
  const d = new Date(`${date}T12:00:00Z`);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-US", { timeZone: "America/New_York", ...opts });

  const short = fmt({ weekday: "short" });
  const weekend = short === "Sat" || short === "Sun";
  const height = count === 0 ? 0 : Math.min(100, 30 + count * 24);

  return (
    <div className="min-w-[2rem] flex-1">
      <p className={`mark text-center ${isToday ? "text-accent" : ""}`}>{short.slice(0, 2)}</p>
      <div
        className={`mt-1.5 flex h-16 flex-col justify-end border ${
          isToday ? "border-accent" : "border-rule"
        } ${weekend ? "bg-sunk/50" : "bg-sunk"}`}
      >
        {count > 0 ? (
          <div
            className={`flex items-start justify-center pt-0.5 ${count > 2 ? "bg-gold" : "bg-ink"}`}
            style={{ height: `${height}%` }}
          >
            <span className="mark text-paper">{count}</span>
          </div>
        ) : null}
      </div>
      <p
        className={`mark border-t-2 pt-1 text-center ${
          isToday ? "border-accent font-medium text-accent" : "border-transparent"
        }`}
      >
        {fmt({ day: "numeric" })}
      </p>
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
      return `The queue wants ${target.min} to ${target.max}, so there is room to add.`;
    case "overfull":
      return "More than the queue needs. Retire what has gone stale before adding.";
    default:
      return "The queue is healthy, so create only what fills a real gap.";
  }
}
