# Wedding Planning Automation System

An internal web app that replaces a wedding planner's patchwork of Canva, Google
Sheets, Google Calendar, and Google Forms with a single system: client/wedding
records, auto-generated planning timelines, task tracking, vendor management,
Google Calendar sync, and templated email automation.

This repo is currently at **Phase 3 (Google Calendar integration + client
intake form)**. Client/Wedding/Vendor CRUD, a configurable milestone-based
task timeline, one-way Google Calendar sync, and a public client intake form
all exist and work end to end; email automation is the remaining later
phase.

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

- `src/app/(app)/` — the authenticated-feeling app shell (nav bar, from its
  own `layout.tsx`): `/` (dashboard placeholder), `/clients`, `/weddings`,
  `/weddings/[id]` (budget, tasks, meetings, linked vendors), `/vendors`,
  `/settings` (Google Calendar connection)
- `src/app/forms/intake/[weddingId]/` — the public client intake form. Lives
  outside the `(app)` route group deliberately, so it renders through the
  bare root `layout.tsx` with no nav bar
- `src/components/NavBar.tsx` — top navigation
- `src/lib/api.ts` — typed fetch client for the API
- `src/lib/format.ts` — display formatting helpers (dates, money, enum labels)

### `/api`

Express + TypeScript API.

- `src/index.ts` — app entry point, mounts routers, exposes `GET /health`
- `src/db.ts` — Prisma client singleton (uses the `pg` driver adapter)
- `src/timeline.ts` — the timeline engine: `generateTimelineForWedding` and
  `recalculateAutoTaskDueDates` (see "Timeline engine" below); also creates/
  updates `CalendarEvent`s for milestone rules flagged `createsCalendarEvent`
- `src/googleCalendar.ts` — all Google API interaction: OAuth URL/token
  exchange, connection status, and `pushCalendarEventCreate/Update/Delete`
  (see "Google Calendar integration" below)
- `src/routes/` — `clients.ts`, `weddings.ts` (wedding-scoped task + meeting
  routes, regenerate-timeline), `vendors.ts`, `tasks.ts` (cross-wedding task
  list), `auth.ts` (Google OAuth), `meetings.ts` (`DELETE /meetings/:id`),
  `forms.ts` (public client intake form)
- `src/errors.ts` — `AppError`, `asyncHandler`, `validateBody` (zod), and the
  global JSON error-response middleware
- `src/utils.ts` — `param`, `startOfTodayUTC`, `withOverdueFlag`
- `prisma/schema.prisma` — data model: `Client`, `Wedding`, `Vendor`,
  `WeddingVendor` (join table), `Task`, `TimelineRule`, `CalendarEvent`,
  `GoogleAuthToken`
- `prisma/seed.ts` — seeds 11 timeline rules (4 of them calendar-worthy), 3
  clients, 3 weddings (each with auto-generated tasks + calendar events), 5
  vendors, and a couple of vendor links

## Data model

- **Client** — `fullName`, `partnerName?`, `email`, `phone?`, `status`
  (`lead`/`active`/`completed`/`archived`), `notes?`
- **Wedding** — belongs to a `Client`; `weddingDate`, `venue?`, `budgetTotal?`,
  `budgetSpent`, `planningStatus`
  (`inquiry`/`booked`/`in_progress`/`final_month`/`completed`), `styleNotes?`,
  `guestCountEstimate?`, `intakeNotes?` (the latter two captured via the
  public client intake form)
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
  ones), `taskTitle`, `taskDescription?`, `defaultPriority`, `isActive`,
  `createsCalendarEvent`, `calendarEventType?`. Add, edit, or disable rows
  here (e.g. via Prisma Studio or a script) to change the standard timeline
  without touching application code.
- **CalendarEvent** — belongs to a `Wedding`, optionally to the `Task` that
  spawned it; `type` (`milestone`/`client_meeting`/`vendor_meeting`/
  `reminder`), `title`, `scheduledAt`, `googleEventId?` (set once pushed to
  Google; null means it only exists locally, e.g. because Calendar wasn't
  connected yet when it was created).
- **GoogleAuthToken** — single-row table holding the one internal user's
  OAuth refresh token and the ID of the dedicated "Weddings" calendar created
  on first connect.

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

Of the 11 seeded rules, 4 are flagged `createsCalendarEvent`: **Book venue**
and **Finalize guest list and headcount** (`milestone` — hard deadlines worth
a calendar reminder), **Final walkthrough with venue** (`vendor_meeting` — an
actual meeting), and **Confirm final details with all vendors**
(`reminder`). The rest (booking vendors, sending save-the-dates/invitations,
attire, hair & makeup trial, confirming vendor bookings) stay task-only —
routine prep work that would just clutter a calendar.

## Google Calendar integration

One-way sync (app → Calendar), single internal user, OAuth via
`src/googleCalendar.ts`:

- **`GET /auth/google`** redirects to Google's consent screen
  (`calendar.events` scope, `access_type: offline` + `prompt: consent` so a
  refresh token is always issued).
- **`GET /auth/google/callback`** exchanges the code for tokens, upserts the
  single `GoogleAuthToken` row, then redirects the browser to
  `${FRONTEND_URL}/settings?connected=1` (or `...=0` on failure).
- **`GET /auth/google/status`** — `{ connected, calendarId, connectedAt }`,
  used by the Settings page.
- The first time anything is actually pushed, `ensureCalendarId` creates a
  calendar named **"Weddings"** on the connected account and stores its ID,
  so every event lands on that one dedicated calendar rather than the user's
  primary one.

**Graceful degradation is the important design point here**: every call site
that pushes to Google (`generateTimelineForWedding`,
`recalculateAutoTaskDueDates`, `POST /weddings/:id/meetings`,
`DELETE /meetings/:id`) wraps the Google API call in try/catch and treats
failure as non-fatal — the `CalendarEvent` row is always created/updated/
deleted locally regardless of whether Google is connected or reachable, and
`googleEventId` simply stays `null` if the push didn't happen. Nothing in the
core app (tasks, weddings, meetings) ever breaks because of Google Calendar
being disconnected, misconfigured, or erroring. I could not test the actual
OAuth consent screen or live Calendar writes myself (no Google credentials)
— everything else (CalendarEvent rows, the idempotent create/update flow,
meetings CRUD) is verified working with Google in the "not connected" state;
see "What to verify yourself" below for the one piece that needs you.

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
| GET | `/weddings/:id/meetings` | all calendar events for a wedding (auto + manual), sorted by `scheduledAt` asc |
| POST | `/weddings/:id/meetings` | schedule a meeting (`title`, `scheduledAt`, `type?`); pushes to Google if connected |
| DELETE | `/meetings/:id` | cancels on Google Calendar too, if it was synced |
| GET | `/auth/google` | redirects to Google's OAuth consent screen |
| GET | `/auth/google/callback` | OAuth callback; redirects back to the frontend |
| GET | `/auth/google/status` | `{ connected, calendarId, connectedAt }` |
| GET | `/forms/intake/:weddingId` | **public** — minimal wedding info to prefill the intake form |
| POST | `/forms/intake/:weddingId` | **public** — submits the intake form |
| GET | `/vendors` | optional `?category=` filter |
| GET | `/vendors/:id` | |
| POST | `/vendors` | |
| PATCH | `/vendors/:id` | |

`/forms/intake/*` is intentionally unauthenticated (it's a link sent to the
couple) but scoped tight: its own zod schema only accepts `partnerName`,
`phone`, `guestCountEstimate`, `styleNotes`, `intakeNotes` — never budget,
status, or the client's email (kept planner-managed since it's the channel
automated emails go to). The rest of the API has no auth layer yet either;
that's expected at this point in the build (see spec: single-user internal
tool, auth was never a phase deliverable) — everything here is exactly as
protected as everything else so far.

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

### Google Calendar setup (do this yourself)

The app runs fine with these unset — Google Calendar sync just silently
no-ops (see "Graceful degradation" above). To actually connect it:

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or
   pick) a project, then **APIs & Services → Library** → enable the
   **Google Calendar API**.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   application type **Web application**.
3. Under **Authorized redirect URIs**, add exactly:
   `http://localhost:4000/auth/google/callback`
4. Copy the generated **Client ID** and **Client secret** into `api/.env`:
   ```
   GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="..."
   GOOGLE_REDIRECT_URI="http://localhost:4000/auth/google/callback"
   FRONTEND_URL="http://localhost:3000"
   ```
5. If the OAuth consent screen is in "Testing" mode (default for a new
   project), add the Google account you'll connect with as a **test user**
   under **APIs & Services → OAuth consent screen**, or Google will refuse
   to show it the consent screen.
6. Restart `npm run dev` in `/api` so it picks up the new env vars, then go
   to `/settings` in the app and click **Connect Google Calendar**.

## Status

- [x] Next.js 14 app scaffolded in `/web`
- [x] Express + TypeScript API with Prisma/PostgreSQL
- [x] Client, Wedding, Vendor, WeddingVendor, Task, TimelineRule,
      CalendarEvent, GoogleAuthToken data model + migrations
- [x] REST endpoints with zod validation and consistent JSON error responses
- [x] Seed script (11 timeline rules, 3 clients, 3 weddings with generated
      tasks + calendar events, 5 vendors)
- [x] Basic UI shell: nav, Clients/Weddings/Vendors list + create, Wedding
      detail with editable budget, tasks, meetings, and vendor linking
- [x] Automated timeline engine: auto-generates tasks on wedding creation,
      recalculates pending task due dates when the wedding date changes,
      manual regenerate-timeline trigger, idempotent
- [x] Task management: wedding-scoped and cross-wedding endpoints, inline
      status updates, manual task creation, derived overdue flag
- [x] Google Calendar integration: OAuth connect flow, dedicated "Weddings"
      calendar, auto-push for calendar-worthy milestones, manual meeting
      scheduling/cancellation, graceful no-op when not connected — **the
      live OAuth flow and actual Calendar writes need your own Google
      credentials to verify**, see "Google Calendar setup" above
- [x] Public client intake form (`/forms/intake/[weddingId]`) writing
      straight into the Client/Wedding record, plus a "Copy intake form
      link" button on the wedding detail page
- [ ] Email automation — later phase
- [ ] Real dashboard (currently a placeholder) — Phase 4
