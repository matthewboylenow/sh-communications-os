import { fail, ok, requireAgent } from "@/core/lib/api";
import { checkRepetition, listHistory, recordHistory } from "@/modules/editorial";

export const dynamic = "force-dynamic";

/** GET the log. POST { candidates } to check, or { entries } to record. */
export async function GET(req: Request) {
  const denied = requireAgent(req);
  if (denied) return denied;
  const kind = new URL(req.url).searchParams.get("kind") ?? undefined;
  return ok(await listHistory(kind));
}

export async function POST(req: Request) {
  const denied = requireAgent(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      candidates?: { kind: string; value: string }[];
      entries?: { kind: string; value: string; contentId?: string; cooldownDays?: number; note?: string; published?: boolean }[];
    };

    if (body.candidates?.length) {
      return ok({ checked: await checkRepetition(body.candidates) });
    }
    if (body.entries?.length) {
      await recordHistory(body.entries.map((e) => ({ ...e, kind: e.kind as never })));
      return ok({ recorded: body.entries.length });
    }
    return fail("Send { candidates } to check, or { entries } to record.");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "History call failed", 500);
  }
}
