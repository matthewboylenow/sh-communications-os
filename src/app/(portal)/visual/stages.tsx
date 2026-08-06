"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { ComparisonOutcome, Rating, RejectionReason } from "@/modules/visual";

/*
 * The three training stages.
 *
 * Judging taste is fast work and the interface should not slow it down, so
 * every stage is driven by the keyboard first and the mouse second. The arrow
 * keys in the pairwise stage come straight from the project brief.
 */

export type ReasonOption = { key: RejectionReason; label: string };

export type StageAsset = {
  id: string;
  title: string;
  source: string;
  sourceLabel: string;
  imageUrl: string;
};

function Plate({ asset, dimmed }: { asset: StageAsset; dimmed?: boolean }) {
  return (
    <figure className={dimmed ? "opacity-40 transition-opacity" : "transition-opacity"}>
      <div className="plate aspect-4/3 w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.imageUrl} alt={asset.title} />
      </div>
      <figcaption className="mt-2">
        <p className="truncate text-sm">{asset.title}</p>
        <p className="mark truncate">{asset.sourceLabel}</p>
      </figcaption>
    </figure>
  );
}

/* --------------------------------------------------------- two at a time --- */

const PAIR_KEYS: Record<string, ComparisonOutcome> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "both",
  ArrowDown: "neither",
};

export function PairStage({
  left,
  right,
  decide,
}: {
  left: StageAsset;
  right: StageAsset;
  decide: (l: string, r: string, o: ComparisonOutcome) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<ComparisonOutcome | null>(null);

  const choose = useCallback(
    (outcome: ComparisonOutcome) => {
      if (pending) return;
      setChosen(outcome);
      start(async () => {
        await decide(left.id, right.id, outcome);
        setChosen(null);
      });
    },
    [decide, left.id, right.id, pending],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const outcome = PAIR_KEYS[e.key];
      if (!outcome) return;
      e.preventDefault();
      choose(outcome);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose]);

  return (
    <>
      <div className="galley-full grid grid-cols-2 gap-5 sm:gap-8">
        <Plate asset={left} dimmed={chosen === "right" || chosen === "neither"} />
        <Plate asset={right} dimmed={chosen === "left" || chosen === "neither"} />
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        <Choice label="Prefer left" hint="←" onClick={() => choose("left")} busy={pending} />
        <Choice label="Prefer right" hint="→" onClick={() => choose("right")} busy={pending} />
        <Choice label="Like both" hint="↑" onClick={() => choose("both")} busy={pending} />
        <Choice label="Reject both" hint="↓" onClick={() => choose("neither")} busy={pending} />
      </div>

      <div className="margin-note mt-7">
        <p className="mark">
          Arrow keys work. A win promotes the winner and leaves the other alone, because losing
          to a strong image is not the same as being weak. Only reject both marks anything down.
        </p>
      </div>
    </>
  );
}

function Choice({
  label,
  hint,
  onClick,
  busy,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="btn btn-outline">
      {label}
      <span className="mark" aria-hidden="true">
        {hint}
      </span>
    </button>
  );
}

/* --------------------------------------------------------- one at a time --- */

export function RateStage({
  asset,
  existingRating,
  existingReasons,
  reasonOptions,
  save,
}: {
  asset: StageAsset;
  existingRating: Rating | null;
  existingReasons: string[];
  reasonOptions: ReasonOption[];
  save: (id: string, rating: Rating, reasons: RejectionReason[], notes?: string) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const valid = new Set(reasonOptions.map((r) => r.key as string));
  const [reasons, setReasons] = useState<RejectionReason[]>(
    existingReasons.filter((r): r is RejectionReason => valid.has(r)),
  );
  const [notes, setNotes] = useState("");

  const commit = useCallback(
    (rating: Rating, why: RejectionReason[] = []) => {
      if (pending) return;
      start(async () => {
        await save(asset.id, rating, why, notes.trim() || undefined);
        setRejecting(false);
        setReasons([]);
        setNotes("");
      });
    },
    [asset.id, notes, pending, save],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (rejecting) return; // typing a note should not fire shortcuts
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "1" || e.key.toLowerCase() === "u") commit("approved");
      else if (e.key === "2" || e.key.toLowerCase() === "m") commit("maybe");
      else if (e.key === "3" || e.key.toLowerCase() === "n") setRejecting(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, rejecting]);

  function toggle(reason: RejectionReason) {
    setReasons((rs) => (rs.includes(reason) ? rs.filter((r) => r !== reason) : [...rs, reason]));
  }

  return (
    <>
      <div className="max-w-[32rem]">
        <Plate asset={asset} />
      </div>

      <div className="margin-note">
        {existingRating ? (
          <p className="mark mb-4">Already recorded as {existingRating}. Deciding again replaces it.</p>
        ) : null}

        {rejecting ? (
          <div>
            <p className="label mb-2.5">Why not?</p>
            <ul className="mb-4 space-y-1.5">
              {reasonOptions.map((r) => (
                <li key={r.key}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={reasons.includes(r.key)}
                      onChange={() => toggle(r.key)}
                    />
                    <span>{r.label}</span>
                  </label>
                </li>
              ))}
            </ul>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything the list does not cover"
              className="input mb-3"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ink btn-sm"
                disabled={pending}
                onClick={() => commit("rejected", reasons)}
              >
                Record
              </button>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => setRejecting(false)}
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline"
                disabled={pending}
                onClick={() => commit("approved")}
              >
                Use
                <span className="mark" aria-hidden="true">
                  1
                </span>
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={pending}
                onClick={() => commit("maybe")}
              >
                Maybe
                <span className="mark" aria-hidden="true">
                  2
                </span>
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={pending}
                onClick={() => setRejecting(true)}
              >
                Never
                <span className="mark" aria-hidden="true">
                  3
                </span>
              </button>
            </div>
            <p className="mark mt-4">
              Never asks for a reason. The reasons are what the style guide is built from, so a
              rejection without one teaches nothing.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------- pick the good ones --- */

export function GridStage({
  assets,
  save,
}: {
  assets: StageAsset[];
  save: (ids: string[], rating: Rating) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const rest = assets.filter((a) => !picked.has(a.id)).map((a) => a.id);

  // One transition per press. Firing two would race on the reset and record
  // the same batch twice.
  function commit(alsoRejectRest: boolean) {
    if (!picked.size || pending) return;
    start(async () => {
      await save([...picked], "approved");
      if (alsoRejectRest && rest.length) await save(rest, "rejected");
      setPicked(new Set());
    });
  }

  return (
    <>
      <div className="galley-full grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => {
          const on = picked.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              aria-pressed={on}
              className="text-left"
            >
              <div
                className={`plate aspect-4/3 w-full ${on ? "outline-2 outline-offset-2 outline-accent" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.imageUrl} alt={a.title} />
              </div>
              <p className="mt-2 truncate text-sm">{a.title}</p>
              <p className="mark truncate">{a.sourceLabel}</p>
            </button>
          );
        })}
      </div>

      <div className="galley-full mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          className="btn btn-ink"
          disabled={!picked.size || pending}
          onClick={() => commit(false)}
        >
          Mark {picked.size} to use
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          disabled={!picked.size || pending}
          onClick={() => commit(true)}
        >
          Use these, never the other {rest.length}
        </button>
        <p className="mark">
          Clicking selects. Nothing is recorded against the ones you leave alone unless you say
          so.
        </p>
      </div>
    </>
  );
}
