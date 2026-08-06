import Link from "next/link";
import { redirect } from "next/navigation";
import { currentActor } from "@/core/auth/guards";
import { navItems } from "@/core/modules/registry";
import { dbConfigured } from "@/core/db";
import { listContent, queueHealth, STATUS_LABELS } from "@/modules/editorial";
import { Nav, type NavEntry } from "@/components/nav";
import { CommandPalette, type PaletteItem } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { Medallion, Wordmark } from "@/components/mark";
import { ExitIcon } from "@/components/icons";
import { signOutAction } from "./actions";

/**
 * The spine. A fixed column of navigation on the left with a hairline against
 * the page, holding the lockup, the search, the sections and the person signed
 * in. Under 820px it becomes a top bar and the sections scroll sideways, which
 * is the right shape for a phone held in one hand in a parish hallway.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  if (!dbConfigured()) return <SetupNotice />;

  const actor = await currentActor();
  if (!actor) redirect("/login");

  const [health, open] = await Promise.all([
    queueHealth(),
    listContent({ openOnly: true, limit: 200 }),
  ]);

  const links: NavEntry[] = [
    { href: "/", label: "Today", badge: health.readyForReview },
    ...navItems().map((n) => ({ href: n.href, label: n.label })),
    { href: "/settings", label: "Settings" },
  ];

  const palette: PaletteItem[] = [
    ...links.map((l) => ({ href: l.href, label: l.label, kind: "page" as const })),
    { href: "/content/new", label: "New content item", kind: "page" as const },
    ...open.map((r) => ({
      href: `/content/${r.id}`,
      label: r.title,
      hint: STATUS_LABELS[r.status],
      kind: "content" as const,
    })),
  ];

  return (
    <div className="min-[820px]:flex">
      <aside className="border-b border-rule min-[820px]:sticky min-[820px]:top-0 min-[820px]:flex min-[820px]:h-dvh min-[820px]:w-[14.5rem] min-[820px]:shrink-0 min-[820px]:flex-col min-[820px]:border-r min-[820px]:border-b-0">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Medallion size={20} className="shrink-0 text-accent" />
            <Wordmark />
          </Link>
          <div className="min-[820px]:hidden">
            <ThemeToggle />
          </div>
        </div>

        <div className="px-5 pb-3.5">
          <CommandPalette items={palette} />
        </div>

        <div className="scroll-x hide-scrollbar px-5 pb-4 min-[820px]:flex-1 min-[820px]:overflow-y-auto min-[820px]:pb-0">
          <Nav items={links} />
        </div>

        <div className="hidden border-t border-rule px-5 py-3.5 min-[820px]:block">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm">{actor.name}</p>
              <p className="mark">{actor.role}</p>
            </div>
            <div className="flex shrink-0 items-center">
              <ThemeToggle />
              <form action={signOutAction}>
                <button className="btn btn-quiet btn-sm px-1.5" aria-label="Sign out" title="Sign out">
                  <ExitIcon />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/*
        The container is exactly the width of the galley: 40rem of measure,
        2.5rem of gutter, 16.5rem of margin. Setting it to 59rem and centring
        it means the composition sits in the middle of the page with no slack
        inside it, while the two track asymmetry stays intact.
      */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[59rem] px-5 py-8 pb-24 sm:px-8 min-[820px]:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-[34rem]">
        <Medallion size={24} className="text-accent" />
        <h1 className="masthead-title mt-4">Almost there</h1>
        <p className="read mt-3">
          DATABASE_URL is not set, so there is nothing to show yet. Add a Neon Postgres
          database in the Vercel project, then run the migrations.
        </p>
        <pre className="mark mt-5 border border-rule bg-sheet p-4 leading-relaxed">
{`cp .env.example .env.local
npm run db:push
npm run seed`}
        </pre>
      </div>
    </div>
  );
}
