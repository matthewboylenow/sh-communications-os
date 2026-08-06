import { fail, ok, requireAgent } from "@/core/lib/api";
import {
  AGENT,
  changeStatus,
  getContent,
  getContentEvents,
  review,
  updateContent,
  type ContentStatus,
} from "@/modules/editorial";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireAgent(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const item = await getContent(id);
  if (!item) return fail("Not found", 404);
  const state = review(item);
  const events = await getContentEvents(id);

  return ok({
    item,
    resolved: state.resolved,
    deltas: state.deltas,
    blockers: state.blockers,
    voice: state.voice,
    events,
  });
}

/** Update an existing draft. Used when event details change. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireAgent(req);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown> & { status?: ContentStatus; note?: string };
    const { status, note, ...patch } = body;

    if (Object.keys(patch).length) {
      await updateContent(id, patch as never, AGENT);
    }
    if (status) {
      // The agent can retire and can move things back to drafting. It cannot
      // approve, and canTransition enforces that regardless of what it sends.
      await changeStatus(id, status, AGENT, { note: typeof note === "string" ? note : undefined });
    }

    const item = await getContent(id);
    return ok(item);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Update failed", 400);
  }
}
