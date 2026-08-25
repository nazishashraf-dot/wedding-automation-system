# Wedding Planning Automation System

An internal web app that replaces a wedding planner's patchwork of Canva, Google
Sheets, Google Calendar, and Google Forms with a single system: client/wedding
records, auto-generated planning timelines, task tracking, vendor management,
Google Calendar sync, and templated email automation.

This repo is currently at **Phase 0 (project setup)** — the frontend and backend
scaffolds exist and run, but no product features have been built yet.

## Folder structure

```
.
├── web/    Next.js 14 (App Router, TypeScript, Tailwind CSS) — the frontend
├── api/    Node.js + Express + TypeScript — the REST API, with Prisma as the
│           ORM for PostgreSQL
└── README.md
```

### `/web`

Standard Next.js 14 app created with `create-next-app` (App Router, `src/`
directory, TypeScript, Tailwind CSS, ESLint).

### `/api`

Express + TypeScript API.

- `src/index.ts` — app entry point, currently exposes `GET /health`
- `prisma/schema.prisma` — Prisma schema (datasource configured for
  PostgreSQL; no models defined yet)
- `.env` — local environment variables, including `DATABASE_URL` (not
  committed; see `.env.example` for the expected shape)

## Running locally

You'll need Node.js 18+ and a running PostgreSQL instance.

### 1. API (`/api`)

```bash
cd api
npm install
cp .env.example .env   # then edit DATABASE_URL to point at your local Postgres
npm run dev
```

The API starts on **http://localhost:4000** by default (configurable via
`PORT` in `.env`). Confirm it's up with:

```bash
curl http://localhost:4000/health
```

Other useful scripts in `/api`:

- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled build from `dist/`
- `npm run prisma:generate` — regenerate the Prisma client after editing
  `prisma/schema.prisma`

### 2. Web (`/web`)

```bash
cd web
npm install
npm run dev
```

The frontend starts on **http://localhost:3000**.

## Environment variables

`/api/.env` (not committed — copy from `/api/.env.example`):

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/wedding_automation?schema=public"
PORT=4000
```

## Status

- [x] Next.js 14 app scaffolded in `/web`
- [x] Express + TypeScript API scaffolded in `/api` with `GET /health`
- [x] Prisma installed and configured for PostgreSQL (no schema/models yet)
- [ ] Database schema (Client, Wedding, Task, Vendor, Meeting) — next phase
- [ ] Timeline/task automation engine — later phase
- [ ] Google Calendar integration — later phase
- [ ] Email automation — later phase
