"use client";

import { useEffect, useState } from "react";

/**
 * Copy exactly what goes in the box.
 *
 * Buffer is pasted into by hand, so the useful thing is not a preview you have
 * to select without catching the character count next to it. It is one button
 * that puts the resolved text on the clipboard, hashtags and first comment
 * included, in the order they need to be pasted.
 */
export function CopyButton({
  text,
  label = "Copy",
  className = "btn btn-outline btn-sm",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
    } catch {
      // Clipboard blocked, usually an insecure origin. Select it by hand.
      setDone(false);
    }
  }

  return (
    <button type="button" onClick={copy} className={className} disabled={!text.trim()}>
      {done ? "Copied" : label}
    </button>
  );
}
