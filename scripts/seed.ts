import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/core/db";
import { users } from "../src/core/db/core-schema";
import {
  AGENT,
  createContent,
  recordHistory,
  upsertOpenFlag,
} from "../src/modules/editorial";
import { createAsset } from "../src/modules/assets";

/**
 * Seeds the portal with the real state of the queue as of early August 2026,
 * taken from the social post history log. The point is that the first screen
 * Matthew sees is his actual work, not lorem ipsum.
 *
 * Safe to run more than once for the admin user. Content is not deduped, so
 * run the content part on an empty database.
 */

const HUMAN = {
  id: null as string | null,
  label: "Seed",
  canApprove: true,
  kind: "human" as const,
};

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "mboyle@sainthelen.org").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-immediately";

  const existing = await db().select().from(users).where(eq(users.email, email)).limit(1);
  let adminId: string;
  if (existing.length) {
    adminId = existing[0].id;
    console.log(`Admin already exists: ${email}`);
  } else {
    const [row] = await db()
      .insert(users)
      .values({
        email,
        name: "Matthew Boyle",
        role: "admin",
        passwordHash: await bcrypt.hash(password, 10),
      })
      .returning();
    adminId = row.id;
    console.log(`Created admin ${email}. Change the password after first sign in.`);
  }
  HUMAN.id = adminId;

  if (process.argv.includes("--user-only")) return;

  // --- assets ------------------------------------------------------------
  const movieAsset = await createAsset(
    {
      title: "Save Me a Seat movie night card",
      type: "graphic",
      source: "igniter",
      sourceUrl: "https://www.ignitermedia.com/",
      tags: ["movie night", "summer", "outdoor", "navy", "gold"],
      ministries: ["Parish Life"],
      rightsStatus: "approved",
      rightsNotes: "Igniter Media subscription, cleared for parish social use.",
      minorReleaseStatus: "not_applicable",
      notes: "Navy dusk, glowing screen, gold marquee bulbs, tilted rust date pill. Bungee + Manrope.",
    },
    adminId,
  );

  const whisperAsset = await createAsset(
    {
      title: "The Whisper 1 Kings 19 quote card",
      type: "graphic",
      source: "unsplash",
      sourceUrl: "https://unsplash.com/s/photos/still-lake-dawn-mist",
      tags: ["scripture", "quiet", "navy", "negative space"],
      rightsStatus: "approved",
      rightsNotes: "Unsplash licence.",
      notes: "Quietest card of the month. Thin gold horizon line, huge negative space. Marcellus + Figtree.",
    },
    adminId,
  );

  // --- content -----------------------------------------------------------
  await createContent(
    {
      title: "Movie Night 8/16 Save Me a Seat",
      contentType: "event_promo",
      masterCaption:
        "Movie night is Sunday, August 16. Mass at 6:00pm, then Hoppers on the back lawn at 7:15pm. Bring a blanket or a lawn chair. Kona Ice will be there if you want something cold.",
      link: "https://sainthelen.org/events",
      assetId: movieAsset.id,
      platforms: ["facebook", "instagram"],
      overrides: {
        instagram: { hashtags: ["MovieNight", "SaintHelenCommunity"] },
      },
      status: "ready_for_review",
      priority: "high",
      publishAt: new Date("2026-08-11T10:00:00-04:00"),
      eventDate: new Date("2026-08-16T19:15:00-04:00"),
      latestUsefulAt: new Date("2026-08-16T18:00:00-04:00"),
      ministry: "Parish Life",
      sourceMaterial: "8/5 daily run, drafted as Post 1.",
      creativeBrief:
        "Purpose: make a summer evening on the lawn feel easy to say yes to. Navy dusk, the glow of a screen, gold marquee bulbs. Negative space upper left for the headline. Avoid stock families on picnic blankets and anything that looks like a cinema advertisement.",
      missingInformation: [],
      relatedContentIds: [],
      approvalFlags: [],
    },
    HUMAN,
  );

  await createContent(
    {
      title: "The Whisper 1 Kings 19:9-13 evergreen",
      contentType: "scripture_quote",
      masterCaption:
        "Elijah waited through the wind, the earthquake and the fire. God was in none of them. He was in the tiny whispering sound. Sunday's first reading, August 9.",
      assetId: whisperAsset.id,
      platforms: ["facebook", "instagram"],
      status: "needs_information",
      priority: "normal",
      publishAt: new Date("2026-08-09T09:00:00-04:00"),
      ministry: "Worship",
      sourceMaterial: "1 Kings 19:9-13, 19th Sunday OT Year A.",
      missingInformation: [
        "Confirm the translation against the missalette. NAB says 'tiny whispering sound', NABRE says 'a light silent sound'.",
      ],
      creativeBrief:
        "The quietest card of the month. Still water at dawn, thin gold horizon line, most of the frame empty. One gold accent word. Avoid sunbeams through clouds and praying hands.",
      approvalFlags: [],
    },
    HUMAN,
  );

  await createContent(
    {
      title: "OCIA Meet & Greet 8/19 The Open Door",
      contentType: "event_promo",
      masterCaption:
        "Curious about becoming Catholic, or about finishing the sacraments you started? Come to the OCIA meet and greet on Wednesday, August 19 at 6:30pm in the Gathering Space. No commitment, just questions and coffee. Share this with someone who has been wondering.",
      platforms: ["facebook", "instagram"],
      status: "needs_asset",
      priority: "normal",
      publishAt: new Date("2026-08-12T10:00:00-04:00"),
      eventDate: new Date("2026-08-19T18:30:00-04:00"),
      latestUsefulAt: new Date("2026-08-19T16:00:00-04:00"),
      ministry: "OCIA",
      sourceMaterial: "8/5 daily run, drafted as Post 3.",
      creativeBrief:
        "A warm doorway photo, light coming from inside. Oversized 'CURIOUS?' set large enough to read from a scroll. Gold arrow. One cream torn-edge strip and nothing else. Young Serif + Inter Tight. Avoid church exteriors, crosses and stock congregations.",
      approvalFlags: [],
    },
    HUMAN,
  );

  await createContent(
    {
      title: "Blood Drive 8/23",
      contentType: "event_promo",
      masterCaption:
        "The New York Blood Center is here on Sunday, August 23. Walk-ins welcome. [TIME NEEDED] in [ROOM NEEDED].",
      platforms: ["facebook"],
      status: "needs_information",
      priority: "high",
      eventDate: new Date("2026-08-23T09:00:00-04:00"),
      ministry: "Social Concerns",
      sourceMaterial: "Marielle's 7/31 email, flyer attached.",
      missingInformation: [
        "Time from the flyer docx.",
        "Room from the flyer docx.",
        "Paul Mecca still needs a reply about promotion guidelines.",
      ],
      approvalFlags: [],
    },
    HUMAN,
  );

  await createContent(
    {
      title: "Abide Mass & Dinner 8/22",
      contentType: "ministry_spotlight",
      masterCaption:
        "Abide, our young adult ministry, has Mass and dinner on Saturday, August 22 right after the 5:00pm Mass. [LOCATION NEEDED]. Come by yourself or bring someone.",
      platforms: ["instagram", "facebook"],
      status: "needs_information",
      priority: "high",
      publishAt: new Date("2026-08-11T17:00:00-04:00"),
      eventDate: new Date("2026-08-22T18:00:00-04:00"),
      ministry: "Abide Young Adult Ministry",
      sourceMaterial: "Patricia Gomez, comms queue, 47 days waiting as of 8/5.",
      missingInformation: ["Location, still truncated as 'in M…' in the digest."],
      notes:
        "Promo window opened Aug 10. This would also be the first ministry spotlight, since the rotation has never started.",
      approvalFlags: [],
    },
    AGENT,
  );

  // --- open flags --------------------------------------------------------
  const flags = [
    {
      title: "Walking with Purpose wording still open",
      detail:
        "Publication weekend is 8/8-8/9. Matthew's note to Maria on 8/5: 'can add but unsure what you meant by on the first page?'",
      owner: "Maria",
      ministry: "Walking with Purpose",
      severity: "blocking" as const,
      dueAt: new Date("2026-08-08T09:00:00-04:00"),
    },
    {
      title: "Buffer daily recap email is broken",
      detail:
        "Nothing from hello@buffermail.com since 7/29. The Monday weekly report is the only verification source. Check the Sent tab and the notification settings.",
      severity: "attention" as const,
    },
    {
      title: "Abide location still truncated",
      detail: "Digest shows 'right after 5pm mass in M…'. Get the room from Patricia Gomez.",
      owner: "Patricia Gomez",
      ministry: "Abide Young Adult Ministry",
      severity: "blocking" as const,
    },
    {
      title: "Blood drive time and room",
      detail: "Both are on the flyer docx in Marielle's 7/31 email.",
      ministry: "Social Concerns",
      severity: "blocking" as const,
    },
    {
      title: "Ireland posts must carry the Unitours line",
      detail:
        "Per David at Unitours, 7/29: every Ireland announcement needs 'Click/scan here for the flyer with the itinerary and the Terms & Conditions.'",
      severity: "attention" as const,
    },
    {
      title: "LifeLines September launch needs a green light",
      detail:
        "Soft launch September, kickoff Wine & Cheese Sept 12-13 after all Masses. Joe Vaszily is in Atlanta that weekend. Team meeting Wed 8/26 5:30pm.",
      severity: "attention" as const,
    },
    {
      title: "Mental Health Ministry, Pope's August intention",
      detail: "Wording still needed, the attachment was unreadable. Wanted for the 8/8 weekend.",
      owner: "Liz Migneco",
      ministry: "Mental Health Ministry",
      severity: "attention" as const,
    },
    {
      title: "Rosary Makers Ministry needs approval before any announcement",
      detail: "New ministry.",
      severity: "fyi" as const,
    },
  ];
  for (const f of flags) await upsertOpenFlag(f);

  // --- repetition history ------------------------------------------------
  await recordHistory([
    { kind: "scripture", value: "Matthew 14:22-33", note: "Fully spent. Two cards, 8/2 and 8/4.", published: true },
    { kind: "scripture", value: "Matthew 14:13-21", published: true },
    { kind: "scripture", value: "Romans 8:35, 37-39" },
    { kind: "scripture", value: "1 Kings 19:9-13", note: "Drafted 8/5. 8/9 Sunday now fully covered." },
    { kind: "creative_angle", value: "Pop-it fidget photo", published: true },
    { kind: "creative_angle", value: "Ireland cliffs photo", published: true },
    { kind: "creative_angle", value: "Torn paper collage", note: "Rested 8/4." },
    { kind: "creative_angle", value: "Save Me a Seat marquee" },
    { kind: "creative_angle", value: "The Whisper" },
    { kind: "creative_angle", value: "The Open Door" },
    { kind: "unsplash_search", value: "outdoor movie screen backyard night", published: true },
    { kind: "unsplash_search", value: "string lights backyard night lawn" },
    { kind: "unsplash_search", value: "still lake dawn mist" },
    { kind: "unsplash_search", value: "church door open warm light" },
    { kind: "unsplash_search", value: "stormy sea waves dark horizon", published: true },
    { kind: "unsplash_search", value: "hand reaching out above water", published: true },
    { kind: "font_pairing", value: "Bungee + Manrope" },
    { kind: "font_pairing", value: "Marcellus + Figtree" },
    { kind: "font_pairing", value: "Young Serif + Inter Tight" },
    { kind: "font_pairing", value: "Anton + Shrikhand", published: true },
    { kind: "story_sticker", value: "poll", published: true },
    { kind: "story_sticker", value: "link", published: true },
    { kind: "topic", value: "Religious Education registration", note: "Ran heavily 7/27-7/28. Next angle is the 9/1 increase to $225.", published: true },
  ]);

  console.log("Seed complete. Sign in and change the admin password.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
