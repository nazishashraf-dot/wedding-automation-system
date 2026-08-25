# Wedding Planning Automation System

An internal web app that replaces a wedding planner's patchwork of Canva, Google
Sheets, Google Calendar, and Google Forms with a single system: client/wedding
records, auto-generated planning timelines, task tracking, vendor management,
Google Calendar sync, and templated email automation.

This repo is currently at **Phase 2 (automated timeline engine + task
generation and management)**. Client/Wedding/Vendor CRUD, a basic UI shell,
and a configurable milestone-based task timeline all exist and work end to
end; Google Calendar sync and email automation are later phases.

## Folder structure

```
.
├── web/    Next.js 14 (App Router, TypeScript, Tailwind CSS) — the frontend
├── api/    Node.js + Express + TypeScript — the REST API, with Prisma as the
│           ORM for PostgreSQL
└── README.md
```

### `/web`

Next.js 14 app (App Router, `src/` directory, TypeScript, Tailwind CSS).

- `src/app/` — pages: `/` (dashboard placeholder), `/clients`, `/weddings`,
  `/weddings/[id]` (budget, tasks, linked vendors), `/vendors`
- `src/components/NavBar.tsx` — top navigation
- `src/lib/api.ts` — typed fetch client for the API
- `src/lib/format.ts` — display formatting helpers (dates, money, enum labels)

### `/api`

Express + TypeScript API.

- `src/index.ts` — app entry point, mounts routers, exposes `GET /health`
- `src/db.ts` — Prisma client singleton (uses the `pg` driver adapter)
- `src/timeline.ts` — the timeline engine: `generateTimelineForWedding` and
  `recalculateAutoTaskDueDates` (see "Timeline engine" below)
- `src/routes/` — `clients.ts`, `weddings.ts` (includes wedding-scoped task
  routes and the regenerate-timeline endpoint), `vendors.ts`, `tasks.ts`
  (cross-wedding task list)
- `src/errors.ts` — `AppError`, `asyncHandler`, `validateBody` (zod), and the
  global JSON error-response middleware
- `src/utils.ts` — `param`, `startOfTodayUTC`, `withOverdueFlag`
- `prisma/schema.prisma` — data model: `Client`, `Wedding`, `Vendor`,
  `WeddingVendor` (join table), `Task`, `TimelineRule`
- `prisma/seed.ts` — seeds 11 timeline rules, 3 clients, 3 weddings (each with
  auto-generated tasks), 5 vendors, and a couple of vendor links

## Data model

- **Client** — `fullName`, `partnerName?`, `email`, `phone?`, `status`
  (`lead`/`active`/`completed`/`archived`), `notes?`
- **Wedding** — belongs to a `Client`; `weddingDate`, `venue?`, `budgetTotal?`,
  `budgetSpent`, `planningStatus`
  (`inquiry`/`booked`/`in_progress`/`final_month`/`completed`), `styleNotes?`
- **Vendor** — `name`, `category`
  (`florist`/`caterer`/`venue`/`photographer`/`dj_band`/`hair_makeup`/`other`),
  `contactEmail?`, `phone?`, `notes?`
- **WeddingVendor** — join table linking a `Wedding` to a `Vendor`, with
  `status` (`contacted`/`quoted`/`confirmed`), `priceQuoted?`, `notes?`
- **Task** — belongs to a `Wedding`, optionally to the `TimelineRule` that
  generated it; `title`, `description?`, `dueDate`, `status`
  (`todo`/`in_progress`/`done`), `priority` (`low`/`medium`/`high`),
  `assignee?`, `source` (`auto_generated`/`manual`). "Overdue" is never
  stored — it's derived at request time (`dueDate < today && status != done`)
  and returned as an `overdue` boolean on every task response.
- **TimelineRule** — the configurable milestone template read by the timeline
  engine; `label`, `monthsBeforeWedding?`, `weeksBeforeWedding?` (exactly one
  of these is set per rule — months for long lead times, weeks for short
  ones), `taskTitle`, `taskDescription?`, `defaultPriority`, `isActive`. Add,
  edit, or disable rows here (e.g. via Prisma Studio or a script) to change
  the standard timeline without touching application code.

> Note: the spec's hyphenated enum values (`in-progress`, `final-month`,
> `dj/band`, `hair & makeup`) aren't valid Prisma enum identifiers, so they're
> stored as `in_progress`, `final_month`, `dj_band`, `hair_makeup`. The UI
> displays them with their normal spacing/punctuation.

## Timeline engine

`src/timeline.ts` has two functions:

- **`generateTimelineForWedding(weddingId, weddingDate)`** — loads all active
  `TimelineRule`s, computes each one's due date from the wedding date, and
  creates a `Task` (`source: auto_generated`) for any rule that doesn't
  already have one for this wedding. Rules whose computed due date has
  already passed are skipped. **Idempotent**: re-running it (e.g. via
  regenerate-timeline) never creates duplicates, since it checks existing
  tasks by `timelineRuleId`, not by title. Runs automatically at the end of
  `POST /weddings`, and on demand via `POST /weddings/:id/regenerate-timeline`
  (useful after editing the rule template, or to pick up rules that were
  skipped as past-due if the wedding date moves out).
- **`recalculateAutoTaskDueDates(weddingId, newWeddingDate)`** — runs
  automatically inside `PATCH /weddings/:id` whenever `weddingDate` actually
  changes. Shifts the `dueDate` of that wedding's still-pending
  (`status != done`) auto-generated tasks to match the new date. Manual tasks
  and already-done tasks are left untouched. It only moves existing tasks —
  it does not create new ones (that's what regenerate-timeline is for).

## API endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | health check |
| GET | `/clients` | includes each client's weddings (id, date, status) |
| GET | `/clients/:id` | includes full wedding records |
| POST | `/clients` | |
| PATCH | `/clients/:id` | |
| DELETE | `/clients/:id` | fails with 409 if the client still has weddings |
| GET | `/weddings` | includes client summary, sorted by `weddingDate` asc |
| GET | `/weddings/:id` | includes client + linked vendors |
| POST | `/weddings` | also auto-generates the task timeline |
| PATCH | `/weddings/:id` | budget, venue, planning status, style notes; changing `weddingDate` recalculates pending auto-task due dates |
| POST | `/weddings/:id/regenerate-timeline` | manually re-run the timeline engine (idempotent) |
| GET | `/weddings/:id/tasks` | all tasks for a wedding, sorted by `dueDate` asc |
| POST | `/weddings/:id/tasks` | create a manual task (`title`, `dueDate`, `description?`, `priority?`, `assignee?`) |
| POST | `/weddings/:id/vendors` | link a vendor (`vendorId`, `status?`, `priceQuoted?`, `notes?`) |
| PATCH | `/weddings/:weddingId/vendors/:vendorId` | update a vendor link's status/price/notes |
| GET | `/tasks` | cross-wedding task list; optional `?status=` and `?overdue=true\|false` filters |
| PATCH | `/tasks/:id` | update `status`, `priority`, `assignee`, or `dueDate` |
| GET | `/vendors` | optional `?category=` filter |
| GET | `/vendors/:id` | |
| POST | `/vendors` | |
| PATCH | `/vendors/:id` | |

All input is validated with zod; validation failures return `400` with
`{ error: { message, details } }`. Not-found returns `404`, unique/foreign-key
conflicts return `409`, all in the same `{ error: { message } }` shape.

## Running locally

You'll need Node.js 18+ and a Postgres-compatible database.

### 0. Database

This machine doesn't have a standalone PostgreSQL server installed, so the
project is set up to use Prisma's built-in local dev database — no install or
Docker required. From `/api`, in its own terminal:

```bash
npx prisma dev
```

Leave that running. It prints a `DATABASE_URL`; on this machine it's stable
across restarts at `postgresql://postgres:postgres@localhost:51214/...`,
which is already set in `.env.example`. Data persists between restarts until
you run `npx prisma dev rm default`.

If you'd rather use a real PostgreSQL install (local or hosted, e.g. Neon/
Supabase/Railway), just point `DATABASE_URL` at that instead — everything else
is standard Prisma/PostgreSQL.

### 1. API (`/api`)

```bash
cd api
npm install
cp .env.example .env      # uses the local prisma dev DB by default
npx prisma migrate dev    # applies the schema (first time only)
npm run seed               # optional: timeline rules, 3 clients/weddings (with tasks), 5 vendors
npm run dev
```

The API starts on **http://localhost:4000** by default (configurable via
`PORT` in `.env`). Confirm it's up with:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/clients
```

Other useful scripts in `/api`:

- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled build from `dist/`
- `npm run prisma:generate` — regenerate the Prisma client after editing
  `prisma/schema.prisma`
- `npm run seed` — re-run the seed script (does not clear existing data;
  running it twice will fail on the unique client emails)

### 2. Web (`/web`)

```bash
cd web
npm install
npm run dev
```

The frontend starts on **http://localhost:3000** and talks to the API at
`NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`, set in
`web/.env.local`).

## Environment variables

`/api/.env` (not committed — copy from `/api/.env.example`):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0"
SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:51215/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0"
PORT=4000
```

`SHADOW_DATABASE_URL` is required for `prisma migrate dev` to work — it's the
second connection string `npx prisma dev` prints on startup, wired into
`prisma.config.ts` as `datasource.shadowDatabaseUrl`. Without it, Prisma tries
to create a temporary shadow database on the same server as `DATABASE_URL`,
which `prisma dev`'s embedded engine doesn't support and fails with a
`type ... already exists` error.

`/web/.env.local` (not committed):

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Status

- [x] Next.js 14 app scaffolded in `/web`
- [x] Express + TypeScript API with Prisma/PostgreSQL
- [x] Client, Wedding, Vendor, WeddingVendor, Task, TimelineRule data model +
      migrations
- [x] REST endpoints with zod validation and consistent JSON error responses
- [x] Seed script (11 timeline rules, 3 clients, 3 weddings with generated
      tasks, 5 vendors)
- [x] Basic UI shell: nav, Clients/Weddings/Vendors list + create, Wedding
      detail with editable budget and vendor linking
- [x] Automated timeline engine: auto-generates tasks on wedding creation,
      recalculates pending task due dates when the wedding date changes,
      manual regenerate-timeline trigger, idempotent
- [x] Task management: wedding-scoped and cross-wedding endpoints, inline
      status updates, manual task creation, derived overdue flag
- [ ] Google Calendar integration — later phase
- [ ] Email automation — later phase
- [ ] Real dashboard (currently a placeholder) — Phase 4
