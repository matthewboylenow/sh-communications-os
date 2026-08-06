import { requireAgentOrActor } from "@/core/lib/api";
import { exportPreferences } from "@/modules/visual";

export const dynamic = "force-dynamic";

/**
 * visual-preferences.json
 *
 * Every decision as data, in the shape the project brief specified, plus the
 * head to head record that a flat rating throws away. Built on request.
 */
export async function GET(req: Request) {
  const denied = await requireAgentOrActor(req);
  if (denied) return denied;

  const data = await exportPreferences();
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
