import Link from "next/link";
import { redirect } from "next/navigation";
import { currentActor } from "@/core/auth/guards";
import { navItems } from "@/core/modules/registry";
import { dbConfigured } from "@/core/db";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  if (!dbConfigured()) return <SetupNotice />;

  const actor = await currentActor();
  if (!actor) redirect("/login");

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-8 px-6 py-6">
      <aside className="w-52 shrink-0">
        <Link href="/" className="block">
          <p className="text-sm font-semibold leading-tight text-navy-900">Saint Helen</p>
          <p className="text-xs text-navy-500">Communications OS</p>
        </Link>

        <nav className="mt-6 space-y-1">
          <NavLink href="/" label="Today" />
          {navItems().map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} />
          ))}
          <NavLink href="/settings" label="Settings" />
        </nav>

        <div className="mt-8 border-t border-cream-200 pt-4 text-xs text-navy-500">
          <p className="font-medium text-navy-900">{actor.name}</p>
          <p>{actor.role}</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-16">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-sm text-navy-700 hover:bg-cream-100"
    >
      {label}
    </Link>
  );
}

function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-xl font-semibold">Almost there</h1>
      <p className="mt-3 text-sm text-navy-700">
        DATABASE_URL is not set, so there is nothing to show yet. Add a Neon Postgres
        database in the Vercel project, then run the migrations.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md bg-navy-900 p-4 text-xs text-cream-100">
{`cp .env.example .env.local
npm run db:push
npm run seed`}
      </pre>
    </div>
  );
}
