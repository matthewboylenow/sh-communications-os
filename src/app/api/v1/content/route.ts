import { fail, ok, requireAgent } from "@/core/lib/api";
import { AGENT, createContent, listContent, recordHistory } from "@/modules/editorial";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAgent(req);
  if (denied) return denied;
  const items = await listContent({ openOnly: true, limit: 200 });
  return ok(items);
}

/**
 * The daily run posts drafts here.
 *
 * Two things are deliberate. Agent-created items land in "drafting", never
 * "ready_for_review", so a person still decides what is worth looking at. And
 * `history` is written in the same call, so the repetition record cannot drift
 * from what was actually drafted.
 */
export async function POST(req: Request) {
  const denied = requireAgent(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      items?: unknown[];
      history?: {
        kind: string;
        value: string;
        contentIndex?: number;
        cooldownDays?: number;
        note?: string;
      }[];
    };

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return fail("Send { items: [...] } with at least one item.");
    }
    if (body.items.length > 25) {
      return fail("25 items is the ceiling for one call.");
    }

    const created: { id: string; title: string }[] = [];
    const errors: { index: number; message: string }[] = [];

    for (const [i, raw] of body.items.entries()) {
      try {
        const input = raw as Record<string, unknown>;
        const status = input.status === "idea" ? "idea" : "drafting";
        created.push(await createContent({ ...input, status }, AGENT));
      } catch (err) {
        errors.push({ index: i, message: err instanceof Error ? err.message : String(err) });
      }
    }

    if (body.history?.length) {
      await recordHistory(
        body.history.map((h) => ({
          kind: h.kind as never,
          value: h.value,
          contentId:
            h.contentIndex !== undefined ? created[h.contentIndex]?.id : undefined,
          cooldownDays: h.cooldownDays,
          note: h.note,
          published: false,
        })),
      );
    }

    return ok({ created: created.map((c) => ({ id: c.id, title: c.title })), errors }, {
      status: errors.length ? 207 : 201,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Create failed", 500);
  }
}
