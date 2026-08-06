"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavEntry = { href: string; label: string; badge?: number };

/**
 * The rail's own links. The active state has to be computed on the client
 * because the layout that renders it is cached above the page.
 */
export function Nav({ items }: { items: NavEntry[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 lg:flex-col">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className="nav-link" data-active={active}>
            <span className="truncate">{item.label}</span>
            {item.badge ? (
              <span className="mono ml-auto text-[0.6875rem] text-accent">{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
