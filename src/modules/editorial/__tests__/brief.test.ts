import { describe, expect, it } from "vitest";
import {
  BRIEF_FIELDS,
  BRIEF_REQUIRED,
  briefGaps,
  filledFields,
  missingRequired,
  visualStatus,
  type Brief,
} from "../brief";
import { checkPlatforms } from "../platform";

/** A brief with every required line filled in. */
function goodBrief(over: Brief = {}): Brief {
  const b: Brief = {};
  for (const f of BRIEF_REQUIRED) b[f] = `something for ${f}`;
  return { ...b, ...over };
}

describe("filledFields", () => {
  it("ignores whitespace only lines", () => {
    expect(filledFields({ purpose: "  ", subject: "Four teenagers" })).toEqual(["subject"]);
  });

  it("copes with no brief at all", () => {
    expect(filledFields(null)).toEqual([]);
    expect(filledFields(undefined)).toEqual([]);
  });
});

describe("missingRequired", () => {
  it("names only the required lines that are empty", () => {
    const missing = missingRequired(goodBrief({ subject: "" }));
    expect(missing).toEqual(["subject"]);
  });

  it("does not care about the optional lines", () => {
    expect(missingRequired(goodBrief())).toEqual([]);
    // Lighting and camera angle are not required, and their absence must not
    // stop an item being workable.
    expect(BRIEF_REQUIRED).not.toContain("lighting");
    expect(BRIEF_REQUIRED).not.toContain("cameraAngle");
  });
});

describe("visualStatus", () => {
  it("is attached whenever a real asset is on the item", () => {
    expect(visualStatus({ assetId: "as_1" })).toBe("attached");
    // An attached file settles it even with nothing else filled in.
    expect(visualStatus({ assetId: "as_1", brief: {}, referenceUrl: null })).toBe("attached");
  });

  it("is briefed with the required lines and somewhere to start", () => {
    expect(
      visualStatus({ brief: goodBrief(), referenceUrl: "https://igniter.example/collection" }),
    ).toBe("briefed");
  });

  it("is not briefed on a reference link alone", () => {
    // The link says where to look. It does not say what to make.
    expect(visualStatus({ brief: {}, referenceUrl: "https://example.org" })).toBe("needed");
  });

  it("is not briefed on a brief with no reference link", () => {
    expect(visualStatus({ brief: goodBrief(), referenceUrl: null })).toBe("needed");
  });

  it("cannot be satisfied by a half filled brief", () => {
    // The gate has to be mechanical. Filling thirteen of fourteen lines but
    // leaving the subject blank is exactly the case that must still block.
    const nearly: Brief = {};
    for (const f of BRIEF_FIELDS) nearly[f] = "filled";
    nearly.subject = "";
    expect(visualStatus({ brief: nearly, referenceUrl: "https://example.org" })).toBe("needed");
  });
});

describe("briefGaps", () => {
  it("says what is missing, one line each", () => {
    const gaps = briefGaps({ brief: {}, referenceUrl: null });
    expect(gaps.length).toBe(BRIEF_REQUIRED.length + 1);
    expect(gaps.some((g) => g.includes("reference link"))).toBe(true);
  });

  it("is silent once a file is attached", () => {
    expect(briefGaps({ assetId: "as_1", brief: {}, referenceUrl: null })).toEqual([]);
  });
});

describe("the media gate", () => {
  const master = {
    masterCaption: "Movie night is Sunday, August 16.",
    link: null,
    assetId: null,
    platforms: ["instagram" as const],
    overrides: {},
  };

  it("blocks Instagram when there is no picture and no plan", () => {
    const issues = checkPlatforms(master);
    const media = issues.find((i) => i.message.includes("image or video"));
    expect(media?.level).toBe("blocker");
  });

  it("drops to a warning once the picture is briefed", () => {
    // This is the whole point of the change. The graphic is made in Canva after
    // the decision, so requiring an attached file at approval time would mean
    // nothing could ever be approved.
    const issues = checkPlatforms(master, { visualBriefed: true });
    const media = issues.find((i) => i.message.includes("Briefed but not made"));
    expect(media?.level).toBe("warning");
    expect(issues.some((i) => i.level === "blocker")).toBe(false);
  });

  it("still blocks on the things that are genuinely wrong", () => {
    // A briefed picture does not excuse an over length caption.
    const long = { ...master, masterCaption: "x".repeat(300), platforms: ["x" as const] };
    const issues = checkPlatforms(long, { visualBriefed: true });
    expect(issues.some((i) => i.level === "blocker")).toBe(true);
  });
});
