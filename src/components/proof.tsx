import Link from "next/link";
import type { VoiceFinding } from "@/modules/editorial";

/*
 * The margin mark, which is the whole idea of this interface.
 *
 * The caption is set as prose at a reading measure. Everything the system knows
 * about it, the voice findings, the unfilled placeholders, the facts nobody has
 * supplied and the flags nobody has cleared, is set in the margin beside the
 * paragraph it concerns, with the offending words underlined in the prose
 * itself.
 *
 * A person reads the draft once and sees the objections in place, rather than
 * reading the draft, then reading a list of complaints underneath it, then
 * scrolling back up to work out which sentence each one meant.
 */

export type ExtraNote = {
  level: "error" | "warning" | "note" | "missing" | "flag";
  message: string;
  /** Where to go to fix it. Usually the edit form, anchored at the field. */
  href?: string;
};

const GLYPH: Record<string, string> = {
  error: "✕",
  warning: "!",
  note: "?",
  missing: "◇",
  flag: "§",
};

/** Marks that are not faults get the quieter colour. */
const LEVEL_ATTR: Record<string, string> = {
  error: "error",
  warning: "warning",
  note: "note",
  missing: "warning",
  flag: "error",
};

type Para = { start: number; text: string };

/** Split on blank lines, keeping each paragraph's offset in the original. */
function paragraphs(text: string): Para[] {
  const out: Para[] = [];
  const re = /\n{2,}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: last, text: text.slice(last, m.index) });
    last = m.index + m[0].length;
  }
  out.push({ start: last, text: text.slice(last) });
  return out.filter((p, i) => p.text.trim().length > 0 || i === 0);
}

type Segment = { text: string; level?: string };

/**
 * Wrap each flagged run in place. Findings can overlap, because a phrase can
 * break two rules at once; the first one wins and the second still gets its
 * margin note, so nothing is lost, it is just not underlined twice.
 */
function segments(para: Para, findings: VoiceFinding[]): Segment[] {
  const hits = findings
    .filter(
      (f) =>
        f.match &&
        typeof f.index === "number" &&
        f.index >= para.start &&
        f.index + f.match.length <= para.start + para.text.length,
    )
    .map((f) => ({
      from: f.index! - para.start,
      to: f.index! - para.start + f.match!.length,
      level: f.level,
    }))
    .sort((a, b) => a.from - b.from || b.to - a.to);

  const out: Segment[] = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.from < cursor) continue;
    if (h.from > cursor) out.push({ text: para.text.slice(cursor, h.from) });
    out.push({ text: para.text.slice(h.from, h.to), level: h.level });
    cursor = h.to;
  }
  if (cursor < para.text.length) out.push({ text: para.text.slice(cursor) });
  return out;
}

export function Proof({
  text,
  findings = [],
  extras = [],
  empty = "No caption yet.",
}: {
  text: string;
  findings?: VoiceFinding[];
  extras?: ExtraNote[];
  empty?: string;
}) {
  const body = text.trim();

  if (!body) {
    return (
      <div className="galley">
        <p className="read text-ink-3 italic">{empty}</p>
        <div className="margin-note">
          <Notes extras={extras} />
        </div>
      </div>
    );
  }

  const paras = paragraphs(body);
  const placed = new Set<VoiceFinding>();

  return (
    <div className="galley">
      {paras.map((para, i) => {
        const mine = findings.filter(
          (f) =>
            typeof f.index === "number" &&
            f.index >= para.start &&
            f.index < para.start + para.text.length,
        );
        mine.forEach((f) => placed.add(f));

        const last = i === paras.length - 1;
        const unplaced = last ? findings.filter((f) => !placed.has(f)) : [];

        return (
          <Row
            key={para.start}
            para={para}
            findings={mine}
            trailing={unplaced}
            extras={last ? extras : []}
          />
        );
      })}
    </div>
  );
}

function Row({
  para,
  findings,
  trailing,
  extras,
}: {
  para: Para;
  findings: VoiceFinding[];
  trailing: VoiceFinding[];
  extras: ExtraNote[];
}) {
  return (
    <>
      <p className="read mb-4 whitespace-pre-line">
        {segments(para, findings).map((s, i) =>
          s.level ? (
            <mark key={i} className="flagged" data-level={s.level}>
              {s.text}
            </mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      <div className="margin-note">
        <Notes
          findings={[...findings, ...trailing]}
          extras={extras}
        />
      </div>
    </>
  );
}

function Notes({
  findings = [],
  extras = [],
}: {
  findings?: VoiceFinding[];
  extras?: ExtraNote[];
}) {
  if (!findings.length && !extras.length) return null;

  return (
    <div>
      {extras.map((e, i) => (
        <Note key={`x${i}`} level={e.level} message={e.message} href={e.href} />
      ))}
      {findings.map((f, i) => (
        <Note
          key={`${f.rule}-${f.index ?? i}`}
          level={f.level}
          message={shorten(f)}
        />
      ))}
    </div>
  );
}

/**
 * A margin note does not need to quote the words it is pointing at. The wavy
 * underline in the prose already does that, so repeating "[TIME NEEDED]" in the
 * margin just makes the reader check twice.
 */
function shorten(f: VoiceFinding): string {
  if (f.rule === "fact.placeholder") return "Unfilled. Get the real detail first.";
  if (f.match && f.message.includes(`"${f.match}"`)) {
    return f.message.replace(`"${f.match}"`, "This");
  }
  return f.message;
}

function Note({
  level,
  message,
  href,
}: {
  level: string;
  message: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="note-glyph" aria-hidden="true">
        {GLYPH[level] ?? "?"}
      </span>
      <span>{message}</span>
    </>
  );

  return href ? (
    <Link href={href} className="note hover:opacity-70" data-level={LEVEL_ATTR[level]}>
      {inner}
    </Link>
  ) : (
    <p className="note" data-level={LEVEL_ATTR[level]}>
      {inner}
    </p>
  );
}
