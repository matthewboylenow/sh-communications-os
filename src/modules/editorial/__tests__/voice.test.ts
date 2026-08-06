import { describe, expect, it } from "vitest";
import { checkVoice, placeholders, summarize } from "../voice";

const rules = (t: string, opts?: Parameters<typeof checkVoice>[1]) =>
  checkVoice(t, opts).map((f) => f.rule);

describe("parish name", () => {
  it("rejects Saint Helen Parish", () => {
    expect(rules("Come to Saint Helen Parish on Sunday.")).toContain("name.parish");
  });

  it("rejects St. Helen", () => {
    expect(rules("Mass at St. Helen is at nine.")).toContain("name.abbreviated");
  });

  it("allows Saint Helen Church for the building", () => {
    const found = rules("Parking is behind Saint Helen Church.");
    expect(found).not.toContain("name.parish");
    expect(found).not.toContain("name.abbreviated");
  });

  it("allows the bare name", () => {
    expect(rules("Saint Helen is hosting a blood drive.")).toHaveLength(0);
  });
});

describe("mechanics", () => {
  it("catches em dashes", () => {
    expect(rules("Bring a chair — and a blanket.")).toContain("mech.emdash");
  });

  it("catches en dashes too", () => {
    expect(rules("Doors open 6–7pm.")).toContain("mech.emdash");
  });

  it("flags semicolons", () => {
    expect(rules("Bring a chair; bring a blanket.")).toContain("mech.semicolon");
  });
});

describe("banned constructions", () => {
  it("catches it's not X it's Y", () => {
    expect(rules("This isn't just a meeting, it's a movement.")).toContain(
      "pat.not-x-its-y",
    );
  });

  it("catches whether you're A or B", () => {
    expect(
      rules("Whether you're new or a longtime member, there's a place for you."),
    ).toContain("pat.whether-or");
  });

  it("catches join us as we", () => {
    expect(rules("Join us as we launch LifeLines.")).toContain("pat.join-us-as-we");
  });

  it("catches an opening rhetorical question", () => {
    expect(rules("Looking for a way to connect? Come to LifeLines.")).toContain(
      "pat.opening-question",
    );
  });

  it("does not fire on a question that is not the opener", () => {
    expect(rules("Groups start October 6. Questions? Email Carolyn.")).not.toContain(
      "pat.opening-question",
    );
  });

  it("catches banned words", () => {
    const found = rules("A transformative journey to elevate your faith.");
    expect(found).toContain("word.transformative");
    expect(found).toContain("word.journey");
    expect(found).toContain("word.elevate");
  });
});

describe("structure", () => {
  it("flags more than one exclamation point", () => {
    expect(rules("Come out! Bring a friend! It will be fun!")).toContain(
      "struct.exclamations",
    );
  });

  it("allows one", () => {
    expect(rules("Tickets are open now!")).not.toContain("struct.exclamations");
  });

  it("bans emoji in a bulletin", () => {
    expect(rules("Blood drive on August 23. 🩸", { channel: "bulletin" })).toContain(
      "struct.emoji-channel",
    );
  });

  it("allows up to three emoji on social", () => {
    expect(rules("Movie night 🎬 popcorn 🍿", { channel: "facebook" })).not.toContain(
      "struct.emoji-count",
    );
  });

  it("flags four emoji on social", () => {
    expect(
      rules("Movie night 🎬 popcorn 🍿 blankets 🌙 see you 💚", { channel: "instagram" }),
    ).toContain("struct.emoji-count");
  });

  it("flags going over the channel word ceiling", () => {
    const long = Array.from({ length: 70 }, (_, i) => `word${i}`).join(" ");
    expect(rules(long, { channel: "instagram" })).toContain("struct.length");
  });

  it("flags anaphora", () => {
    expect(
      rules("Come for the food. Come for the music. Come for the people."),
    ).toContain("struct.anaphora");
  });
});

describe("placeholders", () => {
  it("treats an unfilled placeholder as an error", () => {
    const findings = checkVoice("Blood drive on August 23 at [TIME NEEDED] in the gym.");
    const placeholder = findings.find((f) => f.rule === "fact.placeholder");
    expect(placeholder?.level).toBe("error");
  });

  it("lists them", () => {
    expect(placeholders("[TIME NEEDED] and [ROOM NEEDED]")).toEqual([
      "[TIME NEEDED]",
      "[ROOM NEEDED]",
    ]);
  });
});

describe("the spec's own before and after", () => {
  const bad =
    "Are you looking for a way to deepen your faith journey and forge meaningful connections? Join us as we launch LifeLines, our transformative new small group ministry! LifeLines isn't just another program, it's a vibrant community where you can grow, connect, and serve alongside fellow parishioners. Whether you're new to the parish or a longtime member, there's a place for you. We can't wait to welcome you!";

  const good =
    "LifeLines are our small groups, and new ones start October 6. Groups meet around a shared interest, anything from gardening to a book study to a support group, and most meet once or twice a month. Some are during the day, some in the evening. Browse the groups and sign up at sainthelen.org/lifelines. Questions? Contact Carolyn Colonna at ccolonna@sainthelen.org.";

  it("lights up the bad version", () => {
    const s = summarize(checkVoice(bad, { channel: "bulletin" }));
    expect(s.warnings).toBeGreaterThan(5);
  });

  it("leaves the good version essentially alone", () => {
    const findings = checkVoice(good, { channel: "bulletin" });
    expect(findings.filter((f) => f.level === "error")).toHaveLength(0);
    expect(findings.filter((f) => f.level === "warning")).toHaveLength(0);
  });
});
