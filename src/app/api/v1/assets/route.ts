import { fail, ok, requireAgent } from "@/core/lib/api";
import { createAsset, listAssets } from "@/modules/assets";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAgent(req);
  if (denied) return denied;
  const url = new URL(req.url);
  return ok(
    await listAssets({
      type: url.searchParams.get("type") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      search: url.searchParams.get("q") ?? undefined,
    }),
  );
}

export async function POST(req: Request) {
  const denied = requireAgent(req);
  if (denied) return denied;
  try {
    const body = (await req.json()) as { assets?: unknown[] };
    if (!Array.isArray(body.assets) || !body.assets.length) {
      return fail("Send { assets: [...] }.");
    }
    const created = [];
    for (const a of body.assets) created.push(await createAsset(a, null));
    return ok({ created: created.map((c) => ({ id: c.id, title: c.title })) }, { status: 201 });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Asset create failed", 400);
  }
}
