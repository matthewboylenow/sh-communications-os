# Architecture

Saint Helen Communications OS. Written August 2026.

## The one idea

The portal is the editorial source of truth. Everything else is a replaceable
attachment to it.

Buffer publishes. Claude researches and drafts. A transcription service turns
audio into text. A render worker turns a clip into a vertical video. Every one
of those is a thing we might swap in two years, and none of them should be able
to take the editorial record with them when they go.

## Modules

A module owns its own tables, its own service layer and its own routes. Nothing
imports another module's internals.

| Module | Prefix | Phase | Does |
|---|---|---|---|
| `editorial` | `ed_` | 1 | Master content items, platform deltas, status, approval, history log |
| `assets` | `as_` | 1 | Media library, rights, usage history |
| `visual` | `vt_` | 2 | Visual trainer, preference data, style guide export |
| `media` | `md_` | 3-4 | Transcripts, clip candidates, rendering |
| `publishing` | `pb_` | 5 | Sends approved items to a provider, records what came back |

`src/core/modules/registry.ts` is the manifest. Adding a module means adding an
entry. Removing one means deleting the folder and the entry, and if that breaks
something else, the boundary was violated.

### The three ways modules talk

1. **A public contract.** `import { createContent } from "@/modules/editorial"`.
   The `index.ts` of a module is its API. Everything else is private.
2. **The event bus.** `src/core/events/bus.ts`. A module emits
   `content.approved` and does not know or care who is listening. This is how
   publishing reacts to editorial without editorial depending on publishing.
3. **A port.** `src/core/ports/*`. When the dependency is on an outside system,
   the module depends on an interface and the implementation is chosen at the
   edge.

Enforced by eslint. `@/modules/*/*` is a restricted import pattern outside the
module itself, so reaching into `@/modules/editorial/service` fails CI.

### No foreign keys across boundaries

`ed_content_items.asset_id` points at `as_assets.id` and is a plain text
column. Same for `pb_publication_groups.master_content_id`. This costs some
referential integrity and buys the ability to delete a module without a
migration in another one. Given how much of this system is provisional, that is
the right trade.

Verify it with `npm run db:generate`: the output should show `0 fks` on every
table.

## Ports

| Port | Phase 1 implementation | Later |
|---|---|---|
| `storage` | Vercel Blob | S3, R2 |
| `publishing` | `manualProvider` (records, sends nothing) | Buffer GraphQL, Publer, direct APIs |
| `transcription` | none | Deepgram, AssemblyAI, whisper.cpp |
| `rendering` | none | FFmpeg worker on Railway or a local Mac |

The publishing port's contract deserves one note. `createPosts(posts, { asDraft })`
exists because "never publish without approval" needs a mechanical backstop, not
just a policy. Even after Matthew approves in the portal, the default is to land
the item in the provider as a draft.

## The status machine

`src/modules/editorial/status.ts`. Two rules carry weight:

1. Nothing reaches `approved` except from `ready_for_review`, and only an admin
   can make that move.
2. `sent_to_buffer`, `scheduled` and `published` are written by the publishing
   module reacting to a provider. A human cannot set them by hand. A history log
   where somebody typed "published" into a dropdown is a history log that lies.

Editing the caption, media or platforms of an approved item drops it back to
`ready_for_review` and clears the approval. This is deliberate friction.

## Platform inheritance

One master draft. Every selected platform inherits the caption, media and link
unless an override exists. Overrides store only the difference.

`resolvePlatform()` in `platform.ts` is the only place that knows the rule, so
the UI, the API and the publishing module cannot disagree about what would
actually go out.

`describeDeltas()` produces the short summary Matthew reads instead of five
near-identical drafts. A platform with nothing to say does not appear.

## The voice spec as code

`src/modules/editorial/voice.ts` is the Saint Helen voice spec compiled into
about sixty rules. Three severities:

- **error** blocks approval. The parish name, em dashes, unfilled `[PLACEHOLDER]`
  markers. These are wrong, not merely unlike us.
- **warning** is the banned-construction and banned-word list.
- **note** is the softer stuff: sentence length, anaphora, rule-of-three.

The test suite runs the before-and-after pair from section 5 of the spec. The
bad version lights up. The good version comes back clean. If a future edit
breaks that, CI says so.

## Data flow, Phase 1

```
Scheduled Cowork run
  GET  /api/v1/queue        how healthy is the queue, where are the gaps
  POST /api/v1/history      have we used this angle / passage / search term
  POST /api/v1/content      here are N drafts, status "drafting"
        |
        v
  Portal: Matthew reviews one card per item
        |
   changeStatus -> ready_for_review -> approved   (admin only, blockers must be clear)
        |
        v
  Phase 5: publishing.sendToProvider(...) -> Buffer as drafts
        |
        v
  refreshGroupStatus() writes published URLs back, emits content.published
```

The agent can create, update and retire. It cannot approve. `canTransition`
enforces that regardless of what the request body says.

## Auth

NextAuth v5, credentials, JWT sessions. One capability matrix in
`src/core/auth/guards.ts` and every call site asks it. The v3 codebase learned
what happens otherwise: the same role check copy-pasted into two dozen files
drifted into three spellings and two of them were wrong.

The `/api/v1` surface is separate: bearer token, constant-time compare, no
cookies, so there is no CSRF surface on the agent path.

## What is deliberately not here

- No queue, no worker, no cron. Phase 1 has nothing that needs one.
- No caching layer. Every portal page is `force-dynamic`. At this size the
  database is faster than any cache invalidation bug.
- No `next build` in CI. The build needs `DATABASE_URL` and the auth secrets,
  and a CI job that needs production credentials is a job somebody eventually
  turns off. Vercel builds every push already.
