"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";

export type PaletteItem = {
  href: string;
  label: string;
  hint?: string;
  kind: "page" | "content";
};

/**
 * Jump anywhere with cmd K.
 *
 * The queue is one person's working set, so it is small enough to ship the
 * whole title list to the client and filter it there. No search endpoint, no
 * debounce, no spinner.
 */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 9);
    return items
      .filter((i) => `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(q))
      .slice(0, 9);
  }, [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[cursor];
      if (hit) go(hit.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 border border-rule bg-sheet px-2.5 py-1.5 text-left text-sm text-ink-3 transition-colors hover:border-ink-3 hover:text-ink-2"
      >
        <SearchIcon size={14} />
        <span className="flex-1">Search</span>
        <kbd className="mark text-[0.6875rem]">&#8984;K</kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={close}
            className="absolute inset-0 bg-ink/25"
          />

          {/* The one thing in the app that genuinely floats, so the one thing
              that gets a shadow. */}
          <div className="relative w-full max-w-lg border border-rule bg-sheet shadow-[0_2px_8px_-2px_rgba(0,0,0,0.10),0_18px_44px_-18px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-2.5 border-b border-rule px-3.5 py-3">
              <SearchIcon size={15} className="text-ink-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Find an item or a page"
                className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
              />
            </div>

            {results.length === 0 ? (
              <p className="apparatus px-3.5 py-6">Nothing matches that.</p>
            ) : (
              <ul className="max-h-[52vh] overflow-y-auto py-1">
                {results.map((r, i) => (
                  <li key={r.href}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(r.href)}
                      data-active={i === cursor}
                      className="flex w-full items-center gap-3 px-3.5 py-2 text-left data-[active=true]:bg-paper"
                    >
                      <span className="mark w-10 shrink-0">
                        {r.kind === "page" ? "page" : "item"}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{r.label}</span>
                      {r.hint ? <span className="mark shrink-0">{r.hint}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
