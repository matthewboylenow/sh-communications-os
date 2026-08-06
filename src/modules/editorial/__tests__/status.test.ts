import { describe, expect, it } from "vitest";
import { canTransition, OPEN_STATUSES, TRANSITIONS } from "../status";
import { CONTENT_STATUSES } from "../types";
import { deriveFlags, normalize } from "../service";

const approver = { actorCanApprove: true };
const editor = { actorCanApprove: false };

describe("transitions", () => {
  it("covers every status", () => {
    for (const s of CONTENT_STATUSES) expect(TRANSITIONS[s]).toBeDefined();
  });

  it("never lists an unknown target", () => {
    for (const targets of Object.values(TRANSITIONS)) {
      for (const t of targets) expect(CONTENT_STATUSES).toContain(t);
    }
  });

  it("allows drafting to ready for review", () => {
    expect(canTransition("drafting", "ready_for_review", editor).allowed).toBe(true);
  });

  it("refuses to skip review", () => {
    expect(canTransition("drafting", "approved", approver).allowed).toBe(false);
  });

  it("refuses approval by a non-approver", () => {
    const check = canTransition("ready_for_review", "approved", editor);
    expect(check.allowed).toBe(false);
    expect(check.allowed === false && check.reason).toMatch(/admin/);
  });

  it("allows approval by an approver", () => {
    expect(canTransition("ready_for_review", "approved", approver).allowed).toBe(true);
  });

  it("will not let a human hand-set published", () => {
    expect(canTransition("approved", "published", approver).allowed).toBe(false);
  });

  it("lets the provider callback set sent_to_buffer", () => {
    expect(
      canTransition("approved", "sent_to_buffer", {
        actorCanApprove: false,
        isProviderCallback: true,
      }).allowed,
    ).toBe(true);
  });

  it("allows retiring from anywhere that is still open", () => {
    for (const s of OPEN_STATUSES) {
      expect(canTransition(s, "retired", approver).allowed).toBe(true);
    }
  });

  it("allows a retired item to come back as a draft", () => {
    expect(canTransition("retired", "drafting", editor).allowed).toBe(true);
  });

  it("treats a no-op as allowed", () => {
    expect(canTransition("drafting", "drafting", editor).allowed).toBe(true);
  });
});

describe("auto flagging", () => {
  const f = (title: string, masterCaption = "") => deriveFlags({ title, masterCaption });

  it("flags money", () => {
    expect(f("Pasta Night", "Tickets are $20 for adults.")).toContain("registration_pricing");
  });

  it("flags minors", () => {
    expect(f("Teen Bible Study", "Wednesdays at 7:30pm in the Youth Room.")).toContain(
      "involves_minors",
    );
  });

  it("flags the pastor", () => {
    expect(f("Homily clip", "Msgr. Tom on the Canaanite woman.")).toContain(
      "pastor_quotation",
    );
  });

  it("flags mental health", () => {
    expect(f("Self Care Sunday", "Our Mental Health Ministry is hosting.")).toContain(
      "mental_health",
    );
  });

  it("leaves an ordinary post alone", () => {
    expect(f("Mass times", "Daily Mass is at 9:00am Monday through Saturday.")).toHaveLength(0);
  });
});

describe("normalize", () => {
  it("makes repetition checks case and punctuation insensitive", () => {
    expect(normalize("Out of the Boat!")).toBe(normalize("out of  the boat"));
  });
});
