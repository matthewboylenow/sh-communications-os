/**
 * The Saint Helen voice spec, as code.
 *
 * The spec document is the source of truth for humans. This file is the same
 * rules in a form the portal can run on every draft, so a bad habit gets
 * caught at the moment of writing rather than the morning after.
 *
 * Findings are advisory by default. Only "error" findings block approval, and
 * those are limited to the things that are actually wrong rather than merely
 * unlike us: the parish name, invented facts, and em dashes.
 */

export type FindingLevel = "error" | "warning" | "note";

export type VoiceFinding = {
  level: FindingLevel;
  rule: string;
  message: string;
  /** Character offset in the checked text, when we can point at one. */
  index?: number;
  match?: string;
};

type Rule = {
  id: string;
  level: FindingLevel;
  pattern: RegExp;
  message: string;
};

const NAME_RULES: Rule[] = [
  {
    id: "name.parish",
    level: "error",
    // "Saint Helen Church" is allowed. "Saint Helen Parish" is not.
    pattern: /\bSaint Helen(?:'s| Parish| Catholic Church)\b/gi,
    message:
      'The parish is "Saint Helen". "Saint Helen Church" is fine for the building, nothing else.',
  },
  {
    id: "name.abbreviated",
    level: "error",
    pattern: /\bSt\.?\s?Helen('s)?\b/g,
    message: 'Write "Saint Helen", not "St. Helen". (Msgr. Tom\'s own columns are the exception.)',
  },
  {
    id: "name.lifelines",
    level: "warning",
    pattern: /\bLife[\s-]Lines\b|\bLifelines\b/g,
    message: 'The ministry is "LifeLines", one word, capital L twice.',
  },
  {
    id: "name.kidscorner",
    level: "warning",
    pattern: /\bKid'?s'? Corner\b|\bKids Korner\b/g,
    message: 'It is "Kids Corner". No apostrophe, no K.',
  },
  {
    id: "name.msgr",
    level: "warning",
    pattern: /\b(Monsignor Tom|Father Tom|Msgr Tom)\b/g,
    message: 'Write "Msgr. Tom".',
  },
  {
    id: "name.religious-ed",
    level: "warning",
    pattern: /\b(CCD|Sunday School|Faith Formation)\b/g,
    message: 'The program is "Religious Education".',
  },
  {
    id: "name.wwp",
    level: "note",
    pattern: /\bWalking With Purpose\b/g,
    message: 'Lowercase the "with": Walking with Purpose.',
  },
];

const MECHANICS_RULES: Rule[] = [
  {
    id: "mech.emdash",
    level: "error",
    pattern: /[—–]|(?<=\w)\s--\s(?=\w)/g,
    message: "No em dashes or en dashes. Use a period, a comma, or parentheses.",
  },
  {
    id: "mech.semicolon",
    level: "warning",
    pattern: /;/g,
    message: "Semicolons are almost never right here. Two sentences instead.",
  },
];

const PATTERN_RULES: Rule[] = [
  {
    id: "pat.not-x-its-y",
    level: "warning",
    // Covers the contracted forms too, which is how it usually shows up:
    // "LifeLines isn't just another program, it's a community."
    pattern:
      /\b(?:is\s?n'?t|are\s?n'?t|was\s?n'?t|were\s?n'?t|it'?s not|that'?s not|they'?re not|we'?re not|is not|are not)\b\s*(?:just|only|merely|simply)?\s*[^.!?;]{1,50}?[,.;]\s*(?:it'?s|it is|this is|that'?s|they'?re|we'?re)\b/gi,
    message: 'The "it\'s not X, it\'s Y" construction. Banned outright.',
  },
  {
    id: "pat.more-than",
    level: "warning",
    pattern: /\bmore than (?:just )?an? [^.!?]{1,30}?,\s*(?:it'?s|this is)\b/gi,
    message: '"More than a program, it\'s a family." Same construction, same answer.',
  },
  {
    id: "pat.whether-or",
    level: "warning",
    pattern: /\bwhether you(?:'re| are)\b[^.!?]{0,80}?\bthere(?:'s| is) a place for you\b/gi,
    message: '"Whether you\'re A or B, there\'s a place for you here."',
  },
  {
    id: "pat.join-us-as-we",
    level: "warning",
    pattern: /\bjoin us as we\b/gi,
    message: '"Join us as we" is on the banned list.',
  },
  {
    id: "pat.excited-to-announce",
    level: "warning",
    pattern: /\b(?:we(?:'re| are) (?:excited|thrilled|delighted) to (?:announce|share)|we can'?t wait to (?:see|welcome))\b/gi,
    message: "Announcement filler. Start with the thing itself.",
  },
  {
    id: "pat.busy-world",
    level: "warning",
    pattern: /\bin today'?s (?:busy|fast[- ]paced|modern|hectic) world\b/gi,
    message: "Delete the whole clause.",
  },
  {
    id: "pat.opening-question",
    level: "warning",
    pattern: /^\s*(?:are|do|have|is|looking|want|ready|ever|did|would|could)\b[^.!?]*\?/i,
    message: "Opening with a rhetorical question. Lead with the information.",
  },
  {
    id: "pat.we-invite-you",
    level: "warning",
    pattern: /\bwe (?:warmly )?invite you to\b|\bparishioners are invited to\b/gi,
    message: 'Second person and active. "Come to" or just say what it is.',
  },
];

const BANNED_WORDS = [
  "journey",
  "dive in",
  "delve",
  "unpack",
  "elevate",
  "unlock",
  "foster",
  "leverage",
  "empower",
  "vibrant tapestry",
  "vibrant",
  "nestled",
  "beacon",
  "at its core",
  "game-changer",
  "transformative",
  "meaningful connection",
  "deeply meaningful",
  "truly special",
  "heartfelt",
  "look no further",
  "nurture",
  "cultivate",
  "embark",
  "seamless",
  "robust",
  "holistic",
  "curated",
];

const WORD_RULES: Rule[] = BANNED_WORDS.map((w) => ({
  id: `word.${w.replace(/\W+/g, "-")}`,
  level: "warning" as const,
  pattern: new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"),
  message: `"${w}" is on the banned list.`,
}));

const ALL_RULES = [
  ...NAME_RULES,
  ...MECHANICS_RULES,
  ...PATTERN_RULES,
  ...WORD_RULES,
];

export type VoiceChannel =
  | "facebook"
  | "instagram"
  | "x"
  | "tiktok"
  | "youtubeShorts"
  | "bulletin"
  | "email"
  | "flyer"
  | "screen"
  | "website";

/** Word ceilings straight out of section 4 of the spec. */
const CHANNEL_WORDS: Partial<Record<VoiceChannel, number>> = {
  facebook: 80,
  instagram: 60,
  bulletin: 90,
  email: 150,
  flyer: 40,
};

export function checkVoice(
  text: string,
  opts: { channel?: VoiceChannel } = {},
): VoiceFinding[] {
  const findings: VoiceFinding[] = [];
  if (!text) return findings;

  for (const rule of ALL_RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(text)) !== null && guard++ < 50) {
      // "Saint Helen Church" is legitimate. Do not fire the parish-name rule
      // on it, and do not let the St. Helen rule fire on "Saint Helen".
      if (rule.id === "name.abbreviated" && /Saint\s+Helen/.test(text.slice(Math.max(0, m.index - 6), m.index + 12))) {
        if (!re.global) break;
        continue;
      }
      findings.push({
        level: rule.level,
        rule: rule.id,
        message: rule.message,
        index: m.index,
        match: m[0],
      });
      if (!re.global) break;
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  findings.push(...checkStructure(text, opts.channel));
  findings.push(...checkPlaceholders(text));

  return dedupe(findings);
}

function checkStructure(text: string, channel?: VoiceChannel): VoiceFinding[] {
  const out: VoiceFinding[] = [];

  const exclamations = (text.match(/!/g) ?? []).length;
  if (exclamations > 1) {
    out.push({
      level: "warning",
      rule: "struct.exclamations",
      message: `${exclamations} exclamation points. One is the ceiling and zero is usually right.`,
    });
  }

  const emoji = countEmoji(text);
  if (channel && ["bulletin", "email", "flyer", "screen", "website"].includes(channel) && emoji > 0) {
    out.push({
      level: "warning",
      rule: "struct.emoji-channel",
      message: "No emoji in bulletins, flyers, screens or email body copy.",
    });
  } else if (emoji > 3) {
    out.push({
      level: "warning",
      rule: "struct.emoji-count",
      message: `${emoji} emoji. Three is the maximum, used as punctuation rather than decoration.`,
    });
  }

  // Rule of three: three parallel items sharing a part of speech.
  const ruleOfThree = /\b(\w+),\s+(\w+),?\s+and\s+(\w+)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = ruleOfThree.exec(text)) !== null) {
    const [a, b, c] = [m[1], m[2], m[3]].map((w) => w.toLowerCase());
    const endings = [a, b, c].map((w) => w.slice(-3));
    if (new Set(endings).size === 1 || [a, b, c].every((w) => w.length <= 12 && !/\d/.test(w))) {
      out.push({
        level: "note",
        rule: "struct.rule-of-three",
        message: `"${m[0]}" reads as a rule-of-three list. Rewrite if the three items are parallel.`,
        index: m.index,
        match: m[0],
      });
    }
  }

  // Three sentences in a row opening with the same word.
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  for (let i = 0; i + 2 < sentences.length; i++) {
    const firsts = sentences.slice(i, i + 3).map((s) => s.trim().split(/\s+/)[0]?.toLowerCase());
    if (firsts[0] && firsts.every((w) => w === firsts[0])) {
      out.push({
        level: "note",
        rule: "struct.anaphora",
        message: `Three sentences in a row start with "${firsts[0]}".`,
      });
      break;
    }
  }

  const long = sentences.filter((s) => s.trim().split(/\s+/).length > 28);
  if (long.length) {
    out.push({
      level: "note",
      rule: "struct.sentence-length",
      message: `${long.length} sentence${long.length === 1 ? "" : "s"} over 28 words. Most should be under 20.`,
    });
  }

  const cap = channel ? CHANNEL_WORDS[channel] : undefined;
  if (cap) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words > cap) {
      out.push({
        level: "warning",
        rule: "struct.length",
        message: `${words} words. The ceiling for this channel is ${cap}.`,
      });
    }
  }

  return out;
}

/**
 * Placeholders are a feature, not an error. The spec says to leave a visible
 * blank rather than guess, so the portal surfaces them as work to do and
 * blocks approval while any remain.
 */
export function checkPlaceholders(text: string): VoiceFinding[] {
  const out: VoiceFinding[] = [];
  const re = /\[([A-Z][A-Z\s_/-]{2,40})\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({
      level: "error",
      rule: "fact.placeholder",
      message: `Unfilled placeholder: ${m[0]}. Get the real detail before this goes out.`,
      index: m.index,
      match: m[0],
    });
  }
  return out;
}

export function placeholders(text: string): string[] {
  return checkPlaceholders(text).map((f) => f.match!).filter(Boolean);
}

function countEmoji(text: string): number {
  // Deliberately narrow. Pictographs and dingbats, not every symbol.
  const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
  return (text.match(re) ?? []).filter((c) => c !== "️").length;
}

function dedupe(findings: VoiceFinding[]): VoiceFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.rule}:${f.index ?? "-"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function blockingFindings(findings: VoiceFinding[]): VoiceFinding[] {
  return findings.filter((f) => f.level === "error");
}

export function summarize(findings: VoiceFinding[]) {
  return {
    errors: findings.filter((f) => f.level === "error").length,
    warnings: findings.filter((f) => f.level === "warning").length,
    notes: findings.filter((f) => f.level === "note").length,
  };
}
