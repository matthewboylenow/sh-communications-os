import Link from "next/link";
import {
  listContent,
  review,
  CONTENT_STATUSES,
  STATUS_LABELS,
  PLATFORM_LABELS,
  type ContentStatus,
} from "@/modules/editorial";
import { getAssets } from "@/modules/assets";
import { StatusChip, PriorityChip, Empty, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status && status !== "open" ? [status as ContentStatus] : undefined;

  const items = await listContent(filter ? { status: filter } : { openOnly: true });
  const assets = await getAssets(items.map((i) => i.assetId).filter(Boolean) as string[]);
  const assetById = new Map(assets.map((a) => [a.id, a]));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Social queue</h1>
          <p className="mt-1 text-sm text-navy-500">
            One card per item. One caption, one approval, one scheduled time.
          </p>
        </div>
        <Link href="/content/new" className="btn-primary">
          New item
        </Link>
      </header>

      <nav className="flex flex-wrap gap-1">
        <Tab href="/queue" label="Open" active={!status || status === "open"} />
        {CONTENT_STATUSES.map((s) => (
          <Tab
            key={s}
            href={`/queue?status=${s}`}
            label={STATUS_LABELS[s]}
            active={status === s}
          />
        ))}
      </nav>

      {items.length === 0 ? (
        <Empty
          title="Nothing here"
          hint="Either the filter is too narrow or the queue genuinely needs work."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const state = review(item);
            const asset = item.assetId ? assetById.get(item.assetId) : null;
            return (
              <li key={item.id} className="card p-4">
                <Link href={`/content/${item.id}`} className="flex gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-cream-100">
                    {asset?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-navy-500">
                        no media
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <StatusChip status={item.status} />
                      <PriorityChip priority={item.priority} />
                    </div>

                    <p className="mt-1 line-clamp-2 text-sm text-navy-700">
                      {item.masterCaption || <span className="text-navy-500">No caption yet.</span>}
                    </p>

                    <p className="mt-2 text-xs text-navy-500">
                      {item.platforms.map((p) => PLATFORM_LABELS[p]).join(" · ") ||
                        "no platform selected"}
                      {item.publishAt ? ` — ${fmtDate(item.publishAt, true)}` : ""}
                      {item.ministry ? ` — ${item.ministry}` : ""}
                    </p>

                    {state.blockers.length ? (
                      <p className="mt-2 text-xs text-rust-600">
                        {state.blockers.length} thing
                        {state.blockers.length === 1 ? "" : "s"} to fix: {state.blockers[0]}
                        {state.blockers.length > 1 ? ` (+${state.blockers.length - 1} more)` : ""}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-navy-500">Clean. Ready to approve.</p>
                    )}
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

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`chip ${active ? "bg-navy-900 text-white" : "bg-white text-navy-700 border border-cream-200"}`}
    >
      {label}
    </Link>
  );
}
