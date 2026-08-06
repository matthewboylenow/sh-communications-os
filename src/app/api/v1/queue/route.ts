import { fail, ok, requireAgent } from "@/core/lib/api";
import {
  listContent,
  listOpenFlags,
  queueHealth,
  review,
  staleItems,
  type ContentStatus,
} from "@/modules/editorial";

export const dynamic = "force-dynamic";

/**
 * The daily run's first call.
 *
 * Everything it needs to decide whether to create anything at all: how healthy
 * the queue is, where the gaps are, what is already drafted, what has gone
 * stale and what is waiting on a human. This is what replaces "produce three
 * posts" with "produce what is missing".
 */
export async function GET(req: Request) {
  const denied = requireAgent(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    const status = statusParam ? (statusParam.split(",") as ContentStatus[]) : undefined;

    const [health, items, flags, stale] = await Promise.all([
      queueHealth(Number(url.searchParams.get("days") ?? 14)),
      listContent(status ? { status } : { openOnly: true, limit: 200 }),
      listOpenFlags(),
      staleItems(),
    ]);

    return ok({
      health,
      openFlags: flags,
      staleItemIds: stale.map((s) => ({
        id: s.id,
        title: s.title,
        latestUsefulAt: s.latestUsefulAt,
        eventDate: s.eventDate,
        status: s.status,
      })),
      items: items.map((item) => {
        const state = review(item);
        return {
          id: item.id,
          title: item.title,
          status: item.status,
          priority: item.priority,
          contentType: item.contentType,
          ministry: item.ministry,
          platforms: item.platforms,
          publishAt: item.publishAt,
          eventDate: item.eventDate,
          latestUsefulAt: item.latestUsefulAt,
          assetId: item.assetId,
          masterCaption: item.masterCaption,
          missingInformation: item.missingInformation,
          unclearedFlags: state.uncleared,
          blockers: state.blockers,
          deltas: state.deltas,
        };
      }),
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Queue read failed", 500);
  }
}
