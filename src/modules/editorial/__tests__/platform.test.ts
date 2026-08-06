import { describe, expect, it } from "vitest";
import {
  checkPlatforms,
  describeDeltas,
  renderedText,
  resolveAll,
  resolvePlatform,
  type MasterDraft,
} from "../platform";

const master: MasterDraft = {
  masterCaption:
    "Movie night is Sunday, August 16. Mass at 6:00pm, then Hoppers on the back lawn at 7:15pm. Bring a blanket or a lawn chair. Kona Ice will be there.",
  link: "https://sainthelen.org/movie-night",
  assetId: "asset_1",
  platforms: ["facebook", "instagram", "x"],
  overrides: {
    instagram: { hashtags: ["MovieNight", "SaintHelenCommunity"] },
    x: { caption: "Movie night Sunday 8/16. Mass 6pm, Hoppers on the lawn 7:15pm. Bring a chair." },
  },
};

describe("inheritance", () => {
  it("gives an untouched platform the master caption and media", () => {
    const fb = resolvePlatform(master, "facebook");
    expect(fb.caption).toBe(master.masterCaption);
    expect(fb.assetId).toBe("asset_1");
    expect(fb.link).toBe(master.link);
    expect(fb.inherited).toBe(true);
  });

  it("applies a caption override", () => {
    const x = resolvePlatform(master, "x");
    expect(x.caption).not.toBe(master.masterCaption);
    expect(x.inherited).toBe(false);
  });

  it("keeps inherited media even when the caption is overridden", () => {
    expect(resolvePlatform(master, "x").assetId).toBe("asset_1");
  });

  it("treats hashtags as a difference", () => {
    expect(resolvePlatform(master, "instagram").inherited).toBe(false);
  });

  it("resolves exactly the selected platforms", () => {
    expect(resolveAll(master).map((r) => r.platform)).toEqual([
      "facebook",
      "instagram",
      "x",
    ]);
  });
});

describe("rendered text", () => {
  it("appends hashtags", () => {
    const ig = resolvePlatform(master, "instagram");
    expect(renderedText(ig)).toContain("#MovieNight #SaintHelenCommunity");
  });

  it("does not double the hash", () => {
    const post = resolvePlatform(
      { ...master, overrides: { instagram: { hashtags: ["#Already"] } } },
      "instagram",
    );
    expect(renderedText(post)).toContain("#Already");
    expect(renderedText(post)).not.toContain("##");
  });
});

describe("deltas", () => {
  it("only lists platforms that actually differ", () => {
    const deltas = describeDeltas(master);
    expect(deltas.map((d) => d.platform).sort()).toEqual(["instagram", "x"]);
  });

  it("says what changed", () => {
    const x = describeDeltas(master).find((d) => d.platform === "x");
    expect(x?.changes[0]).toMatch(/shorter caption/);
  });

  it("returns nothing when everything inherits", () => {
    expect(describeDeltas({ ...master, overrides: {} })).toHaveLength(0);
  });
});

describe("platform checks", () => {
  it("blocks a caption over the X limit", () => {
    const long = "a".repeat(300);
    const issues = checkPlatforms({
      ...master,
      platforms: ["x"],
      overrides: { x: { caption: long } },
    });
    expect(issues.some((i) => i.level === "blocker" && i.platform === "x")).toBe(true);
  });

  it("blocks Instagram with no media", () => {
    const issues = checkPlatforms({ ...master, assetId: null, platforms: ["instagram"] });
    expect(issues.some((i) => i.message.includes("image or video"))).toBe(true);
  });

  it("blocks YouTube Shorts with no title", () => {
    const issues = checkPlatforms({ ...master, platforms: ["youtubeShorts"] });
    expect(issues.some((i) => i.message.includes("title"))).toBe(true);
  });

  it("counts hashtags against the character limit", () => {
    const issues = checkPlatforms({
      ...master,
      platforms: ["x"],
      overrides: { x: { caption: "a".repeat(270), hashtags: ["SaintHelenCommunity"] } },
    });
    expect(issues.some((i) => i.level === "blocker")).toBe(true);
  });

  it("warns rather than blocks when only the voice ceiling is exceeded", () => {
    const wordy = Array.from({ length: 90 }, (_, i) => `w${i}`).join(" ");
    const issues = checkPlatforms({
      ...master,
      platforms: ["facebook"],
      overrides: { facebook: { caption: wordy } },
    });
    expect(issues.filter((i) => i.level === "blocker")).toHaveLength(0);
    expect(issues.some((i) => i.level === "warning")).toBe(true);
  });

  it("passes a clean draft", () => {
    expect(checkPlatforms(master).filter((i) => i.level === "blocker")).toHaveLength(0);
  });
});
