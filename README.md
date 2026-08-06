# Saint Helen Communications OS

The editorial source of truth for Saint Helen communications. Buffer publishes.
Claude drafts. Matthew approves. This holds the record.

Phase 1 is built: master content items, platform inheritance and deltas, the
status and approval workflow, the asset library, and the API the scheduled daily
run talks to.

## Getting it running

### 1. Repository

Unzip this into a new GitHub repository. Suggested name `sh-comms-os`.

```bash
git init
git add .
git commit -m "Saint Helen Communications OS, phase 1"
git branch -M main
git remote add origin git@github.com:matthewboylenow/sh-comms-os.git
git push -u origin main
```

### 2. Vercel

Import the repo. Framework preset detects Next.js on its own. Before the first
deploy, add a **Neon Postgres** database from the Storage tab. Vercel sets
`DATABASE_URL` for you.

Then add these environment variables:

| Name | Value |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AGENT_API_TOKEN` | `openssl rand -hex 32` |
| `BLOB_READ_WRITE_TOKEN` | Created for you if you add Vercel Blob. Optional. |

`BUFFER_ACCESS_TOKEN` stays empty until Phase 5. Without it the portal uses the
manual provider, which records what would have been sent and contacts nothing.

### 3. Schema and first user

Locally, with `DATABASE_URL` in `.env.local`:

```bash
npm install
npm run db:push     # creates the 11 tables
npm run seed        # admin user, plus the real queue state from early August
```

The seed reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Change the password
after the first sign in.

To create only the user and skip the sample content:

```bash
npm run seed -- --user-only
```

### 4. Check it

`/api/v1/health` is unauthenticated and reports what is switched on.

```json
{ "ok": true, "database": true, "storage": false, "agentApi": true,
  "modules": ["editorial", "assets"] }
```

## Day to day

| Screen | What it is for |
|---|---|
| **Today** | Queue health, what is waiting on you, open flags, items past their useful date |
| **Social queue** | One card per item with its blockers listed |
| **Content detail** | The master draft, expandable platform deltas, voice check, approval |
| **Assets** | Media library with rights and minor-release status |
| **Settings** | Which modules are live, which connections are configured |

The queue targets 10 to 15 usable items. The Today screen says whether it is
thin, healthy or overfull, which is what replaces "write three posts every day"
with "write what is actually missing".

## The agent API

Everything under `/api/v1` takes `Authorization: Bearer $AGENT_API_TOKEN`.

| Route | Method | Purpose |
|---|---|---|
| `/api/v1/queue` | GET | Queue health, gaps, every open item with its blockers |
| `/api/v1/content` | POST | Create drafts. Lands in `drafting`, never `ready_for_review` |
| `/api/v1/content/[id]` | GET, PATCH | Read one item, update it, retire it |
| `/api/v1/history` | GET, POST | Check candidates against the repetition log, or record entries |
| `/api/v1/flags` | GET, POST | Open questions waiting on a human |
| `/api/v1/assets` | GET, POST | Media library |
| `/api/v1/health` | GET | Unauthenticated status |

See `docs/daily-run.md` for the runbook the scheduled Cowork session follows.

The agent cannot approve anything. The status machine refuses that transition
regardless of what the request body asks for.

## Scripts

```
npm run dev         local development
npm run build       production build
npm run typecheck   tsc --noEmit
npm run lint        eslint, including the module boundary rule
npm test            vitest, 57 tests
npm run db:generate produce a migration from the schema
npm run db:push     apply the schema directly (fine before launch)
npm run seed        admin user and sample content
```

## Where things live

```
src/
  core/            db, auth, config, event bus, ports, module registry
  modules/
    editorial/     master content, platform deltas, status, voice, history
    assets/        media library, rights, storage adapter
    publishing/    provider adapters, publication groups (Phase 5)
    visual/        Phase 2
    media/         Phase 3-4
  app/             Next.js routes, portal screens and /api/v1
  components/      shared UI
scripts/seed.ts
docs/
```

`ARCHITECTURE.md` explains why the boundaries are where they are.
