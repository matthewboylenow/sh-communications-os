# The daily run, rewritten for the portal

This replaces "produce three posts every day" with "keep the queue healthy".

The scheduled Cowork session keeps doing what it does now: read the inbox, read
the digest, read the website and the bulletin, watch for staff requests. What
changes is where the output goes and what decides how much output there should
be.

## Order of operations

### 1. Read the queue before anything else

```http
GET /api/v1/queue?days=14
Authorization: Bearer $AGENT_API_TOKEN
```

Comes back with:

- `health.verdict` — `empty`, `thin`, `healthy` or `overfull`
- `health.usable` — how many items are actually usable right now
- `health.coverage` — a count per day for the next 14 days
- `health.gaps` — plain sentences about what is missing
- `items[]` — every open item, each with its own `blockers` list
- `openFlags[]` — what is waiting on a person
- `staleItemIds[]` — items past their latest useful date

**This determines the size of the run.** `healthy` means create nothing unless
something genuinely new happened. `thin` means fill the gaps named in
`health.gaps`. `overfull` means retire before adding.

### 2. Do the existing research

Outlook, the comms digest, the HubSpot blast, the bulletin, sainthelen.org, the
Buffer weekly report. All unchanged.

### 3. Update before you create

An item already in the queue with new information is worth more than a new
draft. If the Blood Drive time finally arrives in an email:

```http
PATCH /api/v1/content/{id}
{ "masterCaption": "...", "missingInformation": [] }
```

Retire what has gone past:

```http
PATCH /api/v1/content/{id}
{ "status": "retired", "note": "Event has passed." }
```

### 4. Check repetition before drafting

```http
POST /api/v1/history
{ "candidates": [
  { "kind": "scripture", "value": "Matthew 15:21-28" },
  { "kind": "unsplash_search", "value": "church door open warm light" },
  { "kind": "font_pairing", "value": "Bungee + Manrope" }
]}
```

Each candidate comes back with `conflict: null` or the date it was last used and
how long the cooldown is. Scripture is 120 days. Creative angles and Unsplash
searches are 90. Font pairings are 45. Story stickers are 7.

### 5. Create only what fills a real gap

```http
POST /api/v1/content
{
  "items": [{
    "title": "Canaanite woman, 8/16 Gospel",
    "contentType": "scripture_quote",
    "masterCaption": "...",
    "platforms": ["facebook", "instagram"],
    "overrides": { "instagram": { "hashtags": ["SaintHelenCommunity"] } },
    "priority": "normal",
    "publishAt": "2026-08-16T09:00:00-04:00",
    "ministry": "Worship",
    "sourceMaterial": "Matthew 15:21-28, 20th Sunday OT Year A",
    "missingInformation": ["Confirm the translation against the missalette."],
    "creativeBrief": "..."
  }],
  "history": [
    { "kind": "scripture", "value": "Matthew 15:21-28", "contentIndex": 0 },
    { "kind": "creative_angle", "value": "Great is your faith", "contentIndex": 0 }
  ]
}
```

Items land in `drafting`. The agent cannot set `ready_for_review` or `approved`;
a person decides what is worth looking at.

Write the `history` array in the same call. If it goes in a separate call and
that call fails, the repetition record silently drifts from what was drafted.

### 6. Raise what needs a person

```http
POST /api/v1/flags
{ "flag": {
  "title": "Abide location still truncated",
  "detail": "Digest shows 'right after 5pm mass in M…'",
  "owner": "Abide lead",
  "severity": "blocking"
}}
```

### 7. Then the summary email

Same email as today, but shorter, because the drafts are already in the portal.
Lead with what needs a decision, not with what was written.

## Rules the portal enforces so the agent does not have to

- Unfilled `[PLACEHOLDER]` markers block approval, so writing one is safe.
- Anything mentioning money, minors, mental health, crisis resources or Msgr.
  Tom is auto-flagged for human clearance.
- Instagram and TikTok without media, and YouTube Shorts without a title, cannot
  be approved.
- Anything over the X character limit is a blocker, not a warning.
- Editing an approved item sends it back to review.

## Creative briefs

The brief field is not decoration and generic direction is worse than none.
"Church community" and "cross at sunset" are the failure mode. A brief should
name the emotional purpose, the subject, the setting, the composition and the
negative space, the crop, the colour treatment, the typography character, what
to avoid, and the exact search term or licensed collection.

The Phase 2 visual trainer will make this checkable. Until then it is a
discipline.

## What stays outside the portal for now

The daily summary email, the Buffer weekly report reconciliation, and the actual
scheduling in Buffer. Phase 5 moves the last of those.
