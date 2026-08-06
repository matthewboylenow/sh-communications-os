import { describe, expect, it } from "vitest";
import {
  approvedTagTally,
  counts,
  headToHead,
  preferencesJson,
  reasonTally,
  sourceScores,
  styleGuideMarkdown,
  type GuideAsset,
  type GuideComparison,
  type GuideInput,
  type GuidePreference,
} from "../guide";

const AT = new Date("2026-08-06T12:00:00Z");

function asset(id: string, over: Partial<GuideAsset> = {}): GuideAsset {
  return {
    id,
    title: `Asset ${id}`,
    source: "igniter",
    type: "graphic",
    tags: [],
    sourceUrl: null,
    thumbnailUrl: `https://example.org/${id}.jpg`,
    ...over,
  };
}

function pref(id: string, over: Partial<GuidePreference> = {}): GuidePreference {
  return {
    assetId: id,
    rating: "approved",
    rejectionReasons: [],
    tags: [],
    assetSource: "igniter",
    assetTitle: `Asset ${id}`,
    topic: null,
    notes: null,
    decidedAt: AT,
    ...over,
  };
}

function input(over: Partial<GuideInput> = {}): GuideInput {
  return { preferences: [], comparisons: [], assets: [], ...over };
}

describe("counts", () => {
  it("separates the three verdicts", () => {
    const c = counts([
      pref("a"),
      pref("b", { rating: "maybe" }),
      pref("c", { rating: "rejected" }),
      pref("d", { rating: "rejected" }),
    ]);
    expect(c).toEqual({ approved: 1, maybe: 1, rejected: 2, total: 4 });
  });
});

describe("reasonTally", () => {
  it("ranks reasons by how often they come up", () => {
    const tally = reasonTally([
      pref("a", { rating: "rejected", rejectionReasons: ["too_generic", "weak_stock"] }),
      pref("b", { rating: "rejected", rejectionReasons: ["too_generic"] }),
      pref("c", { rating: "rejected", rejectionReasons: ["poor_typography"] }),
    ]);
    expect(tally[0]).toEqual({ key: "too_generic", count: 2 });
    expect(tally).toHaveLength(3);
  });

  it("is stable when counts tie", () => {
    const tally = reasonTally([
      pref("a", { rating: "rejected", rejectionReasons: ["weak_stock", "too_corporate"] }),
    ]);
    expect(tally.map((t) => t.key)).toEqual(["too_corporate", "weak_stock"]);
  });
});

describe("approvedTagTally", () => {
  it("only counts tags on approved assets", () => {
    const tally = approvedTagTally([
      pref("a", { tags: ["warm", "candid"] }),
      pref("b", { rating: "rejected", tags: ["warm"] }),
    ]);
    expect(tally).toEqual([
      { key: "candid", count: 1 },
      { key: "warm", count: 1 },
    ]);
  });
});

describe("sourceScores", () => {
  it("holds back sources with too little evidence to judge", () => {
    const prefs = [
      pref("a", { assetSource: "igniter" }),
      pref("b", { assetSource: "igniter" }),
      pref("c", { assetSource: "igniter", rating: "rejected" }),
      pref("d", { assetSource: "unsplash" }),
    ];
    const { ranked, tooEarly } = sourceScores(prefs, 3);
    expect(ranked.map((r) => r.source)).toEqual(["igniter"]);
    expect(ranked[0].rate).toBeCloseTo(2 / 3);
    expect(tooEarly.map((r) => r.source)).toEqual(["unsplash"]);
  });
});

describe("headToHead", () => {
  it("records a win and a loss for a decided pair", () => {
    const records = headToHead([{ leftAssetId: "a", rightAssetId: "b", outcome: "left" }]);
    expect(records.get("a")).toEqual({ won: 1, lost: 0 });
    expect(records.get("b")).toEqual({ won: 0, lost: 1 });
  });

  it("leaves both and neither out of the standings", () => {
    const comparisons: GuideComparison[] = [
      { leftAssetId: "a", rightAssetId: "b", outcome: "both" },
      { leftAssetId: "a", rightAssetId: "b", outcome: "neither" },
    ];
    // Liking or rejecting both says nothing about which is stronger, so it must
    // not move the standings in either direction.
    expect(headToHead(comparisons).size).toBe(0);
  });
});

describe("styleGuideMarkdown", () => {
  it("still carries the standing rules when nothing has been trained", () => {
    const md = styleGuideMarkdown(input(), AT);
    expect(md).toContain("Nothing has been trained yet");
    expect(md).toContain("Cross at sunset");
    expect(md).toContain("exact stock search term");
  });

  it("turns a rejection reason into a direction, not a tally", () => {
    const md = styleGuideMarkdown(
      input({
        preferences: [pref("a", { rating: "rejected", rejectionReasons: ["too_generic"] })],
        assets: [asset("a")],
      }),
      AT,
    );
    expect(md).toContain("Too generic");
    expect(md).toContain("Name a specific subject, setting and moment");
  });

  it("names approved and rejected references separately", () => {
    const md = styleGuideMarkdown(
      input({
        preferences: [
          pref("a", { assetTitle: "Movie night card", tags: ["warm"] }),
          pref("b", {
            assetTitle: "Generic congregation",
            rating: "rejected",
            rejectionReasons: ["weak_stock"],
          }),
        ],
        assets: [asset("a"), asset("b")],
      }),
      AT,
    );
    expect(md).toContain("## Approved references");
    expect(md).toContain("Movie night card");
    expect(md).toContain("## Rejected references");
    expect(md).toContain("Generic congregation");
    expect(md).toContain("Weak stock photography");
  });

  it("says explicitly that this outranks engagement", () => {
    const md = styleGuideMarkdown(
      input({ preferences: [pref("a")], assets: [asset("a")] }),
      AT,
    );
    expect(md).toMatch(/what Matthew said, which carries more weight/);
  });

  it("obeys the voice rule against em dashes", () => {
    const md = styleGuideMarkdown(
      input({
        preferences: [
          pref("a", { tags: ["warm"] }),
          pref("b", { rating: "rejected", rejectionReasons: ["too_somber", "looks_ai_generated"] }),
        ],
        comparisons: [{ leftAssetId: "a", rightAssetId: "b", outcome: "left" }],
        assets: [asset("a"), asset("b")],
      }),
      AT,
    );
    expect(md).not.toMatch(/[—–]/);
  });
});

describe("preferencesJson", () => {
  it("carries the head to head record a flat rating would lose", () => {
    const data = preferencesJson(
      input({
        preferences: [pref("a"), pref("b", { rating: "maybe" })],
        comparisons: [{ leftAssetId: "a", rightAssetId: "b", outcome: "left" }],
        assets: [asset("a"), asset("b")],
      }),
    );
    const a = data.preferences.find((p) => p.assetId === "a");
    expect(a?.headToHead).toEqual({ won: 1, lost: 0 });
    expect(data.comparisons).toBe(1);
  });

  it("falls back to the live asset when the decision recorded no title", () => {
    const data = preferencesJson(
      input({
        preferences: [pref("a", { assetTitle: null })],
        assets: [asset("a", { title: "Live title" })],
      }),
    );
    expect(data.preferences[0].title).toBe("Live title");
  });
});
