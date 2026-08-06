import Link from "next/link";
import {
  listContent,
  queueHealth,
  review,
  CONTENT_STATUSES,
  STATUS_LABELS,
  PLATFORM_LABELS,
  type ContentStatus,
} from "@/modules/editorial";
import { getAssets } from "@/modules/assets";
import {
  Status,
  StatusTone,
  PriorityNote,
  Masthead,
  Empty,
  fmtDate,
  joinMeta,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/** Statuses where "ready to approve" adds something the status does not say. */
const SILENT_WHEN_CLEAN: string[] = ["idea", "drafting", "needs_asset", "needs_information"];

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status && status !== "open" ? [status as ContentStatus] : undefined;

  const [items, health] = await Promise.all([
    listContent(filter ? { status: filter } : { openOnly: true }),
    queueHealth(),
  ]);
  const assets = await getAssets(items.map((i) => i.assetId).filter(Boolean) as string[]);
  const assetById = new Map(assets.map((a) => [a.id, a]));

  return (
    <div className="space-y-8">
      <Masthead
        title="Social queue"
        lede="One item, one caption, one approval, one scheduled time."
        action={
          <Link href="/content/new" className="btn btn-ink">
            New item
          </Link>
        }
      />

      <nav className="filters">
        <Filter
          href="/queue"
          label="Open"
          count={items.length && !status ? items.length : undefined}
          active={!status || status === "open"}
        />
        {CONTENT_STATUSES.map((s) => (
          <Filter
            key={s}
            href={`/queue?status=${s}`}
            label={STATUS_LABELS[s]}
            count={health.byStatus[s]}
            active={status === s}
          />
        ))}
      </nav>

      {items.length === 0 ? (
        <Empty
          title="Nothing here."
          hint="Either the filter is too narrow or the queue genuinely needs work."
        />
      ) : (
        <ul className="ruled">
          {items.map((item) => {
            const state = review(item);
            const asset = item.assetId ? assetById.get(item.assetId) : null;
            const clean = state.blockers.length === 0;

            return (
              <li key={item.id}>
                <Link href={`/content/${item.id}`} className="ruled-row">
                  <div className="galley">
                    <div className="flex gap-4">
                      <div className="plate h-16 w-16 shrink-0">
                        {asset?.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={asset.thumbnailUrl} alt="" />
                        ) : (
                          <span className="mark text-[0.625rem]">no media</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h2 className="head min-w-0">{item.title}</h2>
                          <PriorityNote priority={item.priority} />
                        </div>

                        <p className="read mt-1 line-clamp-2 text-ink-2">
                          {item.masterCaption || (
                            <span className="text-ink-3 italic">No caption yet.</span>
                          )}
                        </p>

                        <p className="mark mt-2">
                          {joinMeta([
                            item.platforms.map((p) => PLATFORM_LABELS[p]).join(", ") ||
                              "no platform selected",
                            item.ministry,
                          ])}
                        </p>
                      </div>
                    </div>

                    <div className="margin-note space-y-2">
                      <Status status={item.status} />
                      <p className="mark">
                        {item.publishAt ? fmtDate(item.publishAt, true) : "unscheduled"}
                      </p>
                      {/* Only worth saying when the status does not already say it. */}
                      {clean && SILENT_WHEN_CLEAN.includes(item.status) ? (
                        <StatusTone tone="settled">Ready to approve</StatusTone>
                      ) : null}
                      {clean ? null : (
                        <p className="note" data-level="error">
                          <span className="note-glyph" aria-hidden="true">
                            ✕
                          </span>
                          <span>
                            {state.blockers[0]}
                            {state.blockers.length > 1
                              ? ` And ${state.blockers.length - 1} more.`
                              : ""}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Filter({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link href={href} className="filter" data-active={active}>
      {label}
      {count ? <span className="filter-count">{count}</span> : null}
    </Link>
  );
}
