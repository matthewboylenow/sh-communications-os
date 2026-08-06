import { fail, ok, requireAgent } from "@/core/lib/api";
import { listOpenFlags, resolveOpenFlag, upsertOpenFlag } from "@/modules/editorial";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAgent(req);
  if (denied) return denied;
  const includeResolved = new URL(req.url).searchParams.get("all") === "1";
  return ok(await listOpenFlags(includeResolved));
}

export async function POST(req: Request) {
  const denied = requireAgent(req);
  if (denied) return denied;
  try {
    const body = (await req.json()) as {
      resolve?: { id: string; note?: string };
      flag?: {
        id?: string;
        title: string;
        detail?: string;
        owner?: string;
        ministry?: string;
        contentId?: string;
        severity?: "blocking" | "attention" | "fyi";
        dueAt?: string;
      };
    };
    if (body.resolve) {
      return ok(await resolveOpenFlag(body.resolve.id, body.resolve.note));
    }
    if (body.flag) {
      return ok(
        await upsertOpenFlag({
          ...body.flag,
          dueAt: body.flag.dueAt ? new Date(body.flag.dueAt) : null,
        }),
      );
    }
    return fail("Send { flag } or { resolve }.");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Flag call failed", 500);
  }
}
