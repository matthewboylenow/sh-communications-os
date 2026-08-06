import {
  REJECTION_REASON_DIRECTIONS,
  REJECTION_REASON_LABELS,
  type RejectionReason,
} from "./types";
import type { ComparisonOutcome, Rating } from "./schema";

/*
 * The export.
 *
 * Two files come out of the trainer: visual-preferences.json, which is the
 * decisions as data, and visual-style-guide.md, which is those decisions
 * turned into instructions a person or a skill can actually follow.
 *
 * The markdown is the one that matters. A tally saying "too generic, 9" is a
 * fact about the past. "Name a specific subject, setting and moment" is a
 * direction for the next brief. The whole file is written to be read before
 * work starts, not after.
 *
 * Everything here is a pure function of its inputs, including the timestamp,
 * so the generator can be tested without a database or a clock.
 */

export type GuideAsset = {
  id: string;
  title: string;
  source: string;
  type: string;
  tags: string[];
  sourceUrl: string | null;
  thumbnailUrl: string | null;
};

export type GuidePreference = {
  assetId: string;
  rating: Rating;
  rejectionReasons: string[];
  tags: string[];
  assetSource: string | null;
  assetTitle: string | null;
  topic: string | null;
  notes: string | null;
  decidedAt: Date;
};

export type GuideComparison = {
  leftAssetId: string;
  rightAssetId: string;
  outcome: ComparisonOutcome;
};

export type GuideInput = {
  preferences: GuidePreference[];
  comparisons: GuideComparison[];
  assets: GuideAsset[];
};

/* ----------------------------------------------------------------- data --- */

/** The shape the project brief specified, one entry per decided asset. */
export function preferencesJson(input: GuideInput) {
  const wins = headToHead(input.comparisons);

  return {
    generatedFrom: "Saint Helen Communications OS, visual trainer",
    decisions: input.preferences.length,
    comparisons: input.comparisons.length,
    preferences: input.preferences.map((p) => {
      const asset = input.assets.find((a) => a.id === p.assetId);
      const record = wins.get(p.assetId);
      return {
        assetId: p.assetId,
        title: p.assetTitle ?? asset?.title ?? null,
        rating: p.rating,
        tags: p.tags,
        rejectionReasons: p.rejectionReasons,
        source: p.assetSource ?? asset?.source ?? null,
        sourceUrl: asset?.sourceUrl ?? null,
        thumbnailUrl: asset?.thumbnailUrl ?? null,
        topic: p.topic,
        notes: p.notes,
        headToHead: record ? { won: record.won, lost: record.lost } : null,
        decidedAt: p.decidedAt.toISOString(),
      };
    }),
  };
}

/* ------------------------------------------------------------ summaries --- */

export function tally(values: string[]): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function reasonTally(preferences: GuidePreference[]) {
  return tally(preferences.flatMap((p) => p.rejectionReasons));
}

export function approvedTagTally(preferences: GuidePreference[]) {
  return tally(preferences.filter((p) => p.rating === "approved").flatMap((p) => p.tags));
}

/**
 * How each source is doing. A source with one decision against it says
 * nothing, so anything under `minimum` is reported separately as too early to
 * call rather than silently dropped.
 */
export function sourceScores(preferences: GuidePreference[], minimum = 3) {
  const bySource = new Map<string, { approved: number; maybe: number; rejected: number }>();
  for (const p of preferences) {
    const key = p.assetSource ?? "unknown";
    const row = bySource.get(key) ?? { approved: 0, maybe: 0, rejected: 0 };
    row[p.rating] += 1;
    bySource.set(key, row);
  }

  const rows = [...bySource.entries()].map(([source, counts]) => {
    const total = counts.approved + counts.maybe + counts.rejected;
    return { source, ...counts, total, rate: total ? counts.approved / total : 0 };
  });

  return {
    ranked: rows.filter((r) => r.total >= minimum).sort((a, b) => b.rate - a.rate),
    tooEarly: rows.filter((r) => r.total < minimum).sort((a, b) => b.total - a.total),
  };
}

/** Wins and losses per asset, from the pairwise log. */
export function headToHead(comparisons: GuideComparison[]) {
  const records = new Map<string, { won: number; lost: number }>();
  const get = (id: string) => {
    const r = records.get(id) ?? { won: 0, lost: 0 };
    records.set(id, r);
    return r;
  };

  for (const c of comparisons) {
    if (c.outcome === "left") {
      get(c.leftAssetId).won += 1;
      get(c.rightAssetId).lost += 1;
    } else if (c.outcome === "right") {
      get(c.rightAssetId).won += 1;
      get(c.leftAssetId).lost += 1;
    }
    // "both" and "neither" say nothing about which is stronger, so they are
    // recorded in the log and deliberately left out of the standings.
  }
  return records;
}

export function counts(preferences: GuidePreference[]) {
  return {
    approved: preferences.filter((p) => p.rating === "approved").length,
    maybe: preferences.filter((p) => p.rating === "maybe").length,
    rejected: preferences.filter((p) => p.rating === "rejected").length,
    total: preferences.length,
  };
}

/* --------------------------------------------------------------- guide --- */

/**
 * Rules that do not come from the training data. These are the standing art
 * direction requirements from the project brief, restated here so the guide is
 * a complete instruction on its own and a skill reading it does not need a
 * second file to know what a brief must contain.
 */
const STANDING_RULES = `## Rules that do not depend on training

Never give a visual direction as a category. These are not directions:

- Church community
- People praying
- Open Bible
- Cross at sunset
- Smiling people

Every direction must name all of the following. If one is missing the brief is
not finished:

1. Emotional purpose, what the viewer should feel
2. Subject, who or what is in frame
3. Age range, when people appear
4. Setting
5. Composition, where the subject sits in frame
6. Camera angle
7. Lighting
8. Negative space, where the headline goes
9. Crop and orientation
10. Colour treatment
11. Typography character
12. Overlay wording
13. Elements to avoid
14. The exact stock search term, or the named licensed collection

## Where to look, in order

1. An approved Saint Helen image already in the library
2. An existing Canva Email Images asset
3. A previously approved Sunday Social or Igniter asset
4. A relevant Sunday Social or Igniter collection
5. A specific stock search
6. A custom design, for high priority campaigns only

Reach for a template before designing from nothing. Redesigning every post from
scratch is how a parish ends up with twelve visual identities.`;

export function styleGuideMarkdown(input: GuideInput, generatedAt: Date): string {
  const c = counts(input.preferences);
  const reasons = reasonTally(input.preferences);
  const tags = approvedTagTally(input.preferences);
  const sources = sourceScores(input.preferences);
  const standings = headToHead(input.comparisons);

  const date = generatedAt.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const out: string[] = [];

  out.push("# Saint Helen visual style guide");
  out.push("");
  out.push(
    `Generated ${date} from the visual trainer. ${c.total} asset${c.total === 1 ? "" : "s"} decided, ${input.comparisons.length} head to head comparison${input.comparisons.length === 1 ? "" : "s"} recorded.`,
  );
  out.push("");

  if (c.total === 0) {
    out.push(
      "Nothing has been trained yet, so this file carries only the standing rules below. Run the visual trainer before relying on it for taste.",
    );
    out.push("");
    out.push(STANDING_RULES);
    out.push("");
    return out.join("\n");
  }

  out.push(
    `Read this before proposing any visual. It is a record of explicit choices, not of engagement. A post that performed well may have performed well because of the subject, the timing or the event, so what is recorded here is what Matthew said, which carries more weight than what the numbers said.`,
  );
  out.push("");
  out.push(`Approved ${c.approved}. Maybe ${c.maybe}. Rejected ${c.rejected}.`);
  out.push("");

  /* --- what to avoid, ranked --- */
  if (reasons.length) {
    out.push("## What gets rejected, most common first");
    out.push("");
    for (const r of reasons) {
      const label = REJECTION_REASON_LABELS[r.key as RejectionReason] ?? r.key;
      const direction = REJECTION_REASON_DIRECTIONS[r.key as RejectionReason];
      out.push(`### ${label}  (${r.count})`);
      out.push("");
      if (direction) out.push(direction);
      out.push("");
    }
  }

  /* --- what earns approval --- */
  if (tags.length) {
    out.push("## What earns approval");
    out.push("");
    out.push("Qualities recorded against approved assets, most frequent first.");
    out.push("");
    for (const t of tags) out.push(`- ${t.key} (${t.count})`);
    out.push("");
  }

  /* --- sources --- */
  if (sources.ranked.length || sources.tooEarly.length) {
    out.push("## Sources");
    out.push("");
    if (sources.ranked.length) {
      out.push("| Source | Approved | Maybe | Rejected | Approval rate |");
      out.push("|---|---|---|---|---|");
      for (const s of sources.ranked) {
        out.push(
          `| ${s.source} | ${s.approved} | ${s.maybe} | ${s.rejected} | ${Math.round(s.rate * 100)}% |`,
        );
      }
      out.push("");
    }
    if (sources.tooEarly.length) {
      out.push(
        `Too early to call: ${sources.tooEarly.map((s) => `${s.source} (${s.total})`).join(", ")}. Do not draw a conclusion from these yet.`,
      );
      out.push("");
    }
  }

  /* --- standings --- */
  const ranked = [...standings.entries()]
    .filter(([, r]) => r.won + r.lost > 0)
    .sort((a, b) => b[1].won - b[1].lost - (a[1].won - a[1].lost))
    .slice(0, 10);

  if (ranked.length) {
    out.push("## Head to head");
    out.push("");
    out.push("Assets that won or lost when shown against another. Strongest first.");
    out.push("");
    for (const [id, record] of ranked) {
      const title = titleFor(id, input);
      out.push(`- ${title}: won ${record.won}, lost ${record.lost}`);
    }
    out.push("");
  }

  /* --- named references --- */
  const approved = input.preferences.filter((p) => p.rating === "approved");
  if (approved.length) {
    out.push("## Approved references");
    out.push("");
    out.push("Look at these before searching for anything new.");
    out.push("");
    for (const p of approved) out.push(`- ${referenceLine(p, input)}`);
    out.push("");
  }

  const rejected = input.preferences.filter((p) => p.rating === "rejected");
  if (rejected.length) {
    out.push("## Rejected references");
    out.push("");
    out.push("Check a proposed direction against these before offering it.");
    out.push("");
    for (const p of rejected) {
      const why = p.rejectionReasons
        .map((r) => REJECTION_REASON_LABELS[r as RejectionReason] ?? r)
        .join(", ");
      out.push(`- ${referenceLine(p, input)}${why ? `. ${why}` : ""}`);
    }
    out.push("");
  }

  out.push(STANDING_RULES);
  out.push("");
  return out.join("\n");
}

function titleFor(assetId: string, input: GuideInput) {
  const pref = input.preferences.find((p) => p.assetId === assetId);
  const asset = input.assets.find((a) => a.id === assetId);
  return pref?.assetTitle ?? asset?.title ?? assetId;
}

function referenceLine(p: GuidePreference, input: GuideInput) {
  const asset = input.assets.find((a) => a.id === p.assetId);
  const parts = [p.assetTitle ?? asset?.title ?? p.assetId];
  const source = p.assetSource ?? asset?.source;
  if (source) parts.push(`(${source})`);
  if (p.topic) parts.push(`topic: ${p.topic}`);
  const url = asset?.sourceUrl ?? asset?.thumbnailUrl;
  if (url) parts.push(url);
  let line = parts.join(" ");
  if (p.tags.length) line += `. Tagged ${p.tags.join(", ")}`;
  if (p.notes) line += `. ${p.notes}`;
  return line;
}
