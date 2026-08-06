import { requireAgentOrActor } from "@/core/lib/api";
import { exportStyleGuide } from "@/modules/visual";

export const dynamic = "force-dynamic";

/**
 * visual-style-guide.md
 *
 * Built from the current decisions on every request, so there is no stale copy
 * anyone has to remember to regenerate. The daily run and the
 * saint-helen-visual-director skill read this before proposing a visual.
 */
export async function GET(req: Request) {
  const denied = await requireAgentOrActor(req);
  if (denied) return denied;

  const markdown = await exportStyleGuide();
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
