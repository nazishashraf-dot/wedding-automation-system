# Wedding Planning Automation System

An internal web app that replaces a wedding planner's patchwork of Canva, Google
Sheets, Google Calendar, and Google Forms with a single system: client/wedding
records, auto-generated planning timelines, task tracking, vendor management,
Google Calendar sync, and templated email automation.

**The MVP is complete as of Phase 4** (email automation + a real dashboard).
Client/Wedding/Vendor CRUD, a configurable milestone-based task timeline,
one-way Google Calendar sync, a public client intake form, templated email
reminders/nudges on a daily schedule, and a real "what needs attention today"
dashboard all exist and work end to end.

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
  own `layout.tsx`): `/` (the real dashboard), `/clients`, `/weddings`,
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
- `src/email.ts` — `sendTemplatedEmail`: renders an `EmailTemplate`, sends it
  via Resend, always writes an `EmailLog` row (see "Email automation" below)
- `src/emailJob.ts` — `runEmailJob`: the daily due-soon/overdue check
- `src/templateVars.ts` — `formatDateForEmail`, shared by the email job and
  the manual-send route
- `src/routes/` — `clients.ts`, `weddings.ts` (wedding-scoped task/meeting/
  email routes, regenerate-timeline), `vendors.ts`, `tasks.ts` (cross-wedding
  task list), `auth.ts` (Google OAuth), `meetings.ts` (`DELETE /meetings/:id`),
  `forms.ts` (public client intake form), `dashboard.ts` (`GET /dashboard`),
  `admin.ts` (`POST /admin/run-email-job`)
- `src/errors.ts` — `AppError`, `asyncHandler`, `validateBody` (zod), and the
  global JSON error-response middleware
- `src/utils.ts` — `param`, `startOfTodayUTC`, `withOverdueFlag`,
  `getFrontendUrl`
- `railway.json` — Railway build/start commands for deploying this folder as
  its own service in the monorepo (see "Deployment" below)
- `prisma/schema.prisma` — data model: `Client`, `Wedding`, `Vendor`,
  `WeddingVendor` (join table), `Task`, `TimelineRule`, `CalendarEvent`,
  `GoogleAuthToken`, `EmailTemplate`, `EmailLog`
- `prisma/seed.ts` — seeds 11 timeline rules (4 calendar-worthy), 5 email
  templates, 3 clients, 3 weddings (each with auto-generated tasks + calendar
  events), 5 vendors, and a couple of vendor links

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
- **EmailTemplate** — editable library keyed by a stable `key` slug (not
  `id`), so code can reference `"milestone_reminder"` without caring about
  row IDs; `subject`, `bodyTemplate` (plain text with `{{placeholders}}`),
  `isActive`.
- **EmailLog** — one row per send attempt, whether it succeeded or not;
  belongs to a `Wedding`, optionally to the `Task` that triggered it;
  `templateKey`, `recipientEmail`, `subject` (the rendered text actually
  sent), `sentAt`, `status` (`sent`/`failed`). This is both the audit trail
  (`GET /weddings/:id/email-log`) and the de-dup mechanism the daily job
  checks before sending.

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

- **`GET /auth/google`** redirects to Google's consent screen (the full
  `calendar` scope — `calendar.events` alone isn't enough, since creating the
  dedicated "Weddings" calendar via `calendars.insert` needs the broader
  scope; found this the hard way when the seed script's calendar-creation
  call came back `403 insufficient authentication scopes` — fixed here, but
  it means **anyone who connected under the old scope needs to reconnect**
  from `/settings` to pick up the new one), `access_type: offline` +
  `prompt: consent` so a refresh token is always issued.
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

## Email automation

`src/email.ts` + `src/emailJob.ts`, sending via [Resend](https://resend.com):

- **`sendTemplatedEmail({ weddingId, templateKey, recipientEmail, vars, relatedTaskId? })`**
  loads the named `EmailTemplate`, renders `{{placeholder}}` tokens in the
  subject/body against `vars` (unmatched placeholders render as empty
  string), sends via Resend, and **always** writes an `EmailLog` row —
  `status: "sent"` or `"failed"`, never throws for a send failure or missing
  `RESEND_API_KEY`/`FROM_EMAIL` (same graceful-degradation approach as Google
  Calendar: logs the failure and moves on). It does throw
  `TemplateNotFoundError` for an unknown/inactive `templateKey`, which the
  route layer turns into a `404`.
- **`runEmailJob()`** — the daily check, safe to run repeatedly:
  - **Due-soon reminders** (`milestone_reminder`): tasks due within the next
    3 days, not done, that have never had a reminder logged for them —
    sent once per task, ever.
  - **Overdue nudges** (`task_overdue`): tasks overdue by 1+ days, not done,
    that haven't had an overdue nudge logged in the **last 7 days** — so a
    task that stays overdue for a month gets re-nudged roughly weekly
    instead of either spamming daily or going silent after the first email.
  - Runs automatically via `node-cron` at 8am server time (see `index.ts`),
    and on demand via `POST /admin/run-email-job` (useful for testing without
    waiting for the schedule).

Of the 5 seeded templates, only `milestone_reminder` and `task_overdue` are
used by the automated job. The other three — `vendor_followup`,
`info_request`, `status_checkin` — are for ad-hoc use via
`POST /weddings/:id/send-email { templateKey, recipientEmail }`. Because that
endpoint's request body is deliberately minimal (per spec: just
`templateKey` + `recipientEmail`, no `taskId`/`vendorId`), the vars it can
populate are wedding/client-level only (`clientName`, `partnerNameSuffix`,
`weddingDate`, `venue`, `daysUntilWedding`, `intakeFormLink`) — `taskTitle`/
`dueDate`/`daysOverdue` are only available when the email job itself sends
(where a specific task is in scope). `vendor_followup`'s wording was written
generic ("Hi there,") for exactly this reason, since there's no vendor name
to fill in without a `vendorId` param.

## Dashboard

`GET /dashboard` (`src/routes/dashboard.ts`) answers "what needs attention
today" in one call:

- **`upcomingWeddings`** — weddings in the next 90 days, ascending by date,
  each with a computed `daysUntil`.
- **`overdueTasks`** — every overdue task across all weddings, with the
  owning wedding + client attached, ascending by due date (most overdue
  first) with a computed `daysOverdue`.
- **`todayMeetings`** / **`weekMeetings`** — calendar events scheduled today,
  and in the next 7 days (a superset that includes today).
- **`needsAttention`** — weddings within the next 60 days flagged if either:
  zero vendors have `status: confirmed`, or 3+ tasks are overdue. Both are
  judgement calls (the spec asked for "a sensible flag") aimed at catching
  two different failure modes: a wedding that's coming up with nothing
  booked, and a wedding that's quietly falling behind on prep.

The `/` page in `/web` renders all of this — Needs Attention first (most
actionable), then today's/this week's meetings, overdue tasks, and upcoming
wedding cards with a countdown badge — and is the nav's first item, so it's
already what you land on.

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
| GET | `/dashboard` | upcoming weddings, overdue tasks, today's/week's meetings, needs-attention |
| POST | `/weddings/:id/send-email` | ad-hoc send (`templateKey`, `recipientEmail`); logs to `EmailLog` |
| GET | `/weddings/:id/email-log` | sent/failed email history for a wedding, newest first |
| POST | `/admin/run-email-job` | manually trigger the daily due-soon/overdue email check |
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
npm run seed               # optional: timeline rules, email templates, 3 clients/weddings, 5 vendors
npm run dev
```

The API starts on **http://localhost:4000** by default (configurable via
`PORT` in `.env`). Confirm it's up with:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/clients
```

Other useful scripts in `/api`:

- `npm run build` — regenerates the Prisma client, then compiles TypeScript
  to `dist/` (the generated client isn't committed, so this always runs
  before `tsc`)
- `npm start` — runs `prisma migrate deploy` (applies any pending migrations)
  then starts the compiled server from `dist/`. This is what production runs
  — safe to run locally too, since `migrate deploy` is a no-op when there's
  nothing pending.
- `npm run prisma:generate` — regenerate the Prisma client after editing
  `prisma/schema.prisma`, without a full build
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

### Email setup (do this yourself)

Also runs fine with these unset — see "Email automation" above for what
happens instead (an `EmailLog` row with `status: "failed"`, nothing thrown).

1. Sign up at [resend.com](https://resend.com) and grab an API key from the
   **API Keys** page (free tier is plenty for this).
2. Simplest path for testing: leave `FROM_EMAIL` as
   `onboarding@resend.dev` (Resend's own shared sender) — mail from it only
   delivers to the email address you signed up to Resend with, which is
   perfect for sending yourself a test. To send to arbitrary recipients
   later, verify your own domain in Resend and use an address on it instead.
3. In `api/.env`:
   ```
   RESEND_API_KEY="re_..."
   FROM_EMAIL="onboarding@resend.dev"
   ```
4. Restart `npm run dev` in `/api`.

## Deployment

Target setup: **`/web` on Vercel**, **`/api` + PostgreSQL on Railway**. Both
platforms support deploying a subfolder of a monorepo — you point each one
at this same repo and tell it which folder is its root.

Because the API needs to know the web app's URL (for CORS and the OAuth
redirect) and the web app needs to know the API's URL, there's a
chicken-and-egg step: deploy the API first, then the web app, then go back
and update the API's URLs once you know where the web app actually landed.

### 1. Deploy the API to Railway

1. Create a new Railway project, add a service from this GitHub repo, and
   set its **Root Directory** to `api`. Railway will find `api/railway.json`
   (Nixpacks builder, `npm install && npm run build` to build,
   `npm run start` to run) automatically once the root directory points
   there.
2. Add a **PostgreSQL** database to the project. Railway provisions it and
   exposes a `DATABASE_URL` — reference/link that into the API service's
   variables (Railway's UI does this for you when you add the plugin from
   within the same project). You do **not** need `SHADOW_DATABASE_URL` in
   production (see the comment in `.env.example` — it's dev-only).
3. Set the rest of the API service's environment variables (Railway
   dashboard → your service → Variables). See the full list below.
4. Deploy. On first boot, `npm run start` runs `prisma migrate deploy`
   (applying all committed migrations to the fresh database) before starting
   the server — no manual migration step needed.
5. Under the service's **Settings → Networking**, generate a public domain
   (something like `your-api.up.railway.app`). You'll need this in the next
   step and to finish configuring Google OAuth.
6. Optional: seed the production database with the demo timeline
   rules/email templates/sample data (or just the rules/templates — see
   "Before going live with a real client" below). The seed script
   (`npm run seed`) is idempotent — safe to run repeatedly against the same
   database, it upserts rather than duplicating.

   **`railway run npm run seed` does not work for this** — it injects the
   Postgres service's *internal* `DATABASE_URL`
   (`postgres.railway.internal`), which only resolves inside Railway's
   private network and isn't reachable from your machine. To seed from
   your local machine, expose the database temporarily:
   ```bash
   # From /api, with the Railway CLI linked to this project:
   railway tcp-proxy create --port 5432 --service Postgres --json
   # Prints an endpoint like tokaido.proxy.rlwy.net:41703 — build a
   # connection string from that host:port plus the Postgres service's
   # user/password/db (railway variables --service Postgres --kv).

   DATABASE_URL="postgresql://postgres:<password>@<proxy-host>:<proxy-port>/railway" npm run seed
   ```
   Use it as a one-off shell env var, never write the public URL into
   `.env` or any tracked file. When you're done, tear the proxy back down
   — it otherwise leaves production Postgres reachable from the public
   internet indefinitely (password-protected, but still exposed):
   ```bash
   railway tcp-proxy list --service Postgres --json   # get the proxy id
   railway tcp-proxy delete <proxy-id> --service Postgres --yes
   ```

### 2. Deploy the web app to Vercel

1. Import this repo as a new Vercel project and set **Root Directory** to
   `web`. Vercel auto-detects Next.js — no extra config needed.
2. Set `NEXT_PUBLIC_API_URL` to the Railway API's public URL from step 1.5
   above (e.g. `https://your-api.up.railway.app`).
3. Deploy. Note the resulting Vercel domain (e.g.
   `https://your-app.vercel.app`, or your own custom domain if you add one).

### 3. Close the loop: point the API back at the real web URL

1. Back in Railway, update the API service's `FRONTEND_URL` to the Vercel
   domain from step 2.3. This is both the API's CORS-allowed origin and
   where the browser gets redirected after Google OAuth — the app won't
   accept requests from the deployed frontend, and OAuth connect will land
   on the wrong URL, until this is set correctly.
2. Update `GOOGLE_REDIRECT_URI` to
   `https://<your-railway-api-domain>/auth/google/callback`.
3. In Google Cloud Console, on the same OAuth 2.0 Client ID, add that same
   URL under **Authorized redirect URIs** (keep the localhost one too if
   you still want local dev to work).
4. If the OAuth consent screen is still in "Testing" mode, either add each
   real user's Google account as a test user, or publish the app (Google
   review may be required depending on the scopes/verification status).
5. Redeploy the API (Railway redeploys automatically on variable changes in
   most configurations; trigger a manual redeploy if it doesn't).
6. From `/settings` on the deployed web app, click **Connect Google
   Calendar** to verify the full OAuth round-trip works against the real
   domains.

### Environment variables by platform

**Railway (`/api` service):**

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | from the Railway PostgreSQL plugin (linked automatically) |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://<your-railway-api-domain>/auth/google/callback` |
| `FRONTEND_URL` | `https://<your-vercel-domain>` |
| `RESEND_API_KEY` | from resend.com |
| `FROM_EMAIL` | a verified sender in Resend (your own domain for real production use) |

Not needed in production: `SHADOW_DATABASE_URL` (dev-only), `PORT` (Railway
sets this itself).

**Vercel (`/web` project):**

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<your-railway-api-domain>` |

## Before going live with a real client

The production database currently has the seed script's demo data in it (3
clients/weddings, 5 vendors, on top of the 11 `TimelineRule` and 5
`EmailTemplate` rows the app actually depends on). Fine for a portfolio demo
— **not** fine once this is handling a real client's real data:

- **Delete the 3 demo clients/weddings/vendors** before onboarding a real
  client. Order matters for foreign keys: delete each demo wedding's
  `Task`/`CalendarEvent`/`EmailLog`/`WeddingVendor` rows first, then the
  `Wedding`, then the `Client`; delete the 5 demo `Vendor` rows once nothing
  references them. (The 11 `TimelineRule` and 5 `EmailTemplate` rows should
  stay — those are the real configuration, not demo data.)
- **The daily email job doesn't know the demo clients aren't real.** Their
  seeded task due dates are fixed at seed time; if any of them ever fall
  within the due-soon (3-day) or overdue re-nudge windows, `runEmailJob`
  will try to send `milestone_reminder`/`task_overdue` emails to their
  `@example.com` addresses. `example.com` is IANA-reserved and never
  resolves to a real inbox, so this fails harmlessly (logged as
  `status: "failed"` in `EmailLog`) rather than actually reaching anyone —
  but it's still wasted Resend sends and log noise. Delete the demo data
  (above) or disable the cron schedule in `src/index.ts` before relying on
  email automation for a real wedding.
- **No auth on the app's own routes** (noted in Status below too) — add one
  before real client/vendor data is reachable by anyone who finds the URL.

## Status

- [x] Next.js 14 app scaffolded in `/web`
- [x] Express + TypeScript API with Prisma/PostgreSQL
- [x] Client, Wedding, Vendor, WeddingVendor, Task, TimelineRule,
      CalendarEvent, GoogleAuthToken, EmailTemplate, EmailLog data model +
      migrations
- [x] REST endpoints with zod validation and consistent JSON error responses
- [x] Seed script (11 timeline rules, 5 email templates, 3 clients, 3
      weddings with generated tasks + calendar events, 5 vendors)
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
- [x] Email automation: 5 editable templates, daily due-soon/overdue check
      (idempotent, re-nudges overdue tasks weekly), manual send + email log,
      `node-cron` schedule + on-demand admin trigger — **the actual Resend
      send needs your own API key to verify**, see "Email setup" above
- [x] Real dashboard: upcoming weddings, overdue tasks, today's/week's
      meetings, needs-attention flags — now the default landing page
- [x] Production-ready: env-driven CORS/API URL (no hardcoded localhost),
      `prisma migrate deploy` runs automatically on API start, `railway.json`
      for the `/api` Nixpacks build, both `.env.example` files cover every
      var actually used in production — see "Deployment" above

**MVP complete and deployment-ready.** Everything in the original spec's
Phase 1 (MVP) column is built and working. Not built (all explicitly out of
scope for v1 per the spec): Canva integration, multi-tenant support,
payments/invoicing, a mobile app, and any auth/login layer for the internal
app itself (only Google Calendar has an OAuth flow — the app's own routes
have no access control yet, consistent with "1–2 internal users, no complex
role system" from the spec). **This matters more once deployed**: every
`/clients`, `/weddings`, `/tasks`, etc. endpoint is reachable by anyone who
finds the Railway URL, with no login. Fine for a quick private demo; add
auth before real client/vendor data goes anywhere near this in production.
