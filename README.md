# Tech Courses Academy

A free learning platform for the **[Tech Courses](https://www.youtube.com/@techcourses4u)** YouTube channel — turning its NISM securities-market certification and competitive-coding playlists into a structured, trackable course experience.

The catalog **syncs automatically from YouTube into a database** and is curated through an in-app **Course Studio**, so a non-technical owner runs everything from YouTube + a simple toggle screen — no code, no redeploys, changes go live instantly.

Built with **Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Prisma 7 + Neon Postgres.**

---

## Features

### For learners
- **Auto-synced catalog** — YouTube playlists → courses, videos → lessons.
- **Sign in** with email/password (scrypt-hashed, DB sessions) **or Google** (OAuth 2.0).
- **Enrolment & progress tracking** — persisted per user; **resume** at your first unfinished lesson.
- **Lesson player** — theater layout, collapsible chapter sidebar, inline completion toggles, progress bar, prev/next, "Complete & continue."
- **Big courses split into Parts** so a 300-lesson course feels finishable.
- **Trust signals** — real YouTube view counts, real enrolled counts, exam-info block, FAQ, and an optional mock-test button.
- **Light / dark** "Precision" design system.

### For the owner (Course Studio, `/admin`)
- **One screen** listing every detected playlist.
- **Publish** toggle, **Track** (Certification / Coding / Other), **Order**, and **Edit copy** (title, description, exam info, mock-test link) overrides.
- **Sync now** button + **nightly cron**; overrides are preserved on every sync.
- **Team access** — add/remove other admins by email.
- **ⓘ tooltips** on every control.

> Pricing is **free-now, paid-ready**: a checkout/Razorpay scaffold exists but is hidden; courses can be flipped to paid later.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (`@theme` tokens, OKLCH) |
| Database | Neon Postgres + Prisma 7 (driver adapter, no Rust engine) |
| Auth | Custom: scrypt + DB sessions; Google OAuth 2.0 |
| Content source | YouTube Data API v3 |
| Hosting | Vercel (cron for nightly sync) |

---

## Getting started

```bash
npm install
```

### Environment (`.env.local`)

```bash
# YouTube Data API v3 (public data only)
YOUTUBE_API_KEY=AIza...
YOUTUBE_CHANNEL_HANDLE=@techcourses4u

# Neon Postgres
DATABASE_URL=postgresql://USER:PASS@HOST/neondb?sslmode=require

# Google OAuth (optional — enables "Continue with Google")
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...

# Course Studio "owner" admins (always-on bootstrap; more can be added in-app)
ADMIN_EMAILS=owner@example.com

# Secret the nightly cron uses to call the sync endpoint
CRON_SECRET=a_long_random_string
```

> All `.env*` files are git-ignored. Never commit secrets.

### First run

```bash
npm run db:push     # create/update tables on Neon
npm run sync:db     # pull the channel into the database
npm run dev         # http://localhost:3000
```

Then sign in with an `ADMIN_EMAILS` address and open **`/admin`** to publish courses.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run sync:db` | Manually sync the catalog from YouTube into Postgres |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:generate` | Regenerate the Prisma client |

> **Dev gotcha:** if you change `prisma/schema.prisma` while `npm run dev` is running, **restart the dev server** — a running process keeps the old generated client in memory and DB calls for new models will error.

---

## Routes

| Route | Description |
| --- | --- |
| `/` | Landing — hero, channel stats, tracks, most-watched |
| `/courses` | Catalog — filter by track, search, sort |
| `/courses/[slug]` | Course detail — curriculum, exam info, FAQ, enrol panel |
| `/learn/[slug]` | Lesson player (login required) |
| `/dashboard` | Continue learning + progress (login required) |
| `/login`, `/signup` | Auth (email/password + Google) |
| `/contact` | Contact form and support links |
| `/admin` | **Course Studio** (admin only) |
| `GET/POST /api/admin/sync` | Sync endpoint (cron `Bearer CRON_SECRET` or admin session) |
| `GET /api/auth/google[/callback]` | Google OAuth flow |

---

## Architecture

```
YouTube Data API ──(sync)──▶  Neon Postgres  ──(read)──▶  Next.js pages
       ▲                       Course / Lesson / Channel
       │                       User / Session / Admin / Enrollment / Progress
  Course Studio  ──(overrides: publish / track / order / title / desc / exam / mock)
```

**Data model (Prisma):**
- `Course` (= YouTube playlist id), `Lesson` (= `playlistId_videoId`), `Channel` (singleton stats) — the catalog.
- `User`, `Session` — auth. `Admin` — the DB admin allowlist (plus `ADMIN_EMAILS` bootstrap).
- `Enrollment`, `Progress` — per-user learning state.

**Key modules:**
- `src/lib/sync.ts` — YouTube → DB upsert. Synced fields refresh each run; owner-curated fields are set once and preserved.
- `src/lib/catalog.ts` — DB reads that assemble the UI `Course` shape, incl. **section grouping** for long courses (server-only).
- `src/lib/course-utils.ts` — pure, client-safe helpers.
- `src/lib/auth.ts` — password hashing, DB sessions, current user, OAuth login.
- `src/lib/admin.ts` — admin checks (`isAdmin`, bootstrap + DB allowlist), `getAdmins`.
- `src/lib/actions.ts` / `admin-actions.ts` — server actions (auth, enrol, progress; course overrides, sync, team access).
- `src/lib/store.tsx` — client store seeded from the server session; optimistic updates.

**Stable IDs:** courses keyed by playlist id, lessons by `playlistId_videoId`, so enrolments and progress survive every re-sync.

---

## Course Studio (owner guide)

1. Add/arrange videos in a **YouTube playlist** (playlist = course; video order = lesson order).
2. In **`/admin`**, click **Sync now** (or wait for the nightly sync).
3. Toggle **Publish**, choose a **Track**, set **Order**, and optionally **Edit copy** (rename, description, exam info, mock-test link).
4. Changes appear on the live site immediately.

**Admins:** anyone in `ADMIN_EMAILS` (shown as **Owner**, can't be removed in-app) plus anyone added under **Team access**. Hover the **ⓘ** icons for help on each control.

---

## Deploying to Vercel

1. Import the repo; set every `.env.local` value as a Vercel environment variable.
2. Add the production Google OAuth redirect URI in Google Cloud Console: `https://YOUR_DOMAIN/api/auth/google/callback`.
3. Set a strong `CRON_SECRET` — Vercel sends it to the cron automatically.
4. The nightly sync is configured in **`vercel.json`** (`/api/admin/sync`, 03:00 UTC daily).
5. After the first deploy, run a sync (Course Studio → **Sync now**) to populate the catalog.

---

## Notes

- Course videos are © their channel; this site embeds them, it does not re-host.
- Passwords are scrypt-hashed; sessions are httpOnly cookies backed by the database.
- See **`IMPROVEMENTS.md`** for a researched, prioritized roadmap (learner + owner side).
