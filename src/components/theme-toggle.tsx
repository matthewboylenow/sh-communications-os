"use client";

import { MoonIcon, SunIcon } from "./icons";

/**
 * The icons are swapped by CSS off the html attribute rather than by React
 * state, so the button renders identically on the server and the client and
 * there is nothing to hydrate wrong.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("sh-theme", next);
    } catch {
      // Private browsing. The toggle still works for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost btn-sm px-1.5"
      aria-label="Switch between light and dark"
      title="Light or dark"
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="block dark:hidden" />
    </button>
  );
}
