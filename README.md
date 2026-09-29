# EchoVote: Transparent Feedback Democracy

A civic platform where every citizen complaint is publicly trackable, like GitHub
issues for governance. Citizens report problems, the right government officers
receive them, and every step (assignment, acknowledgement, work progress, proof
photos, verification, closure) is recorded on a public timeline.

- **Problem:** public feedback systems are opaque, and complaints vanish into databases.
- **Solution:** every complaint gets a public ticket, a responsible officer, a
  deadline and an audit trail, and is verified before it counts as resolved.

---

## Contents

1. [Architecture](#architecture)
2. [Repository layout](#repository-layout)
3. [Getting started](#getting-started)
4. [Who uses it](#who-uses-it)
5. [How it works: the complaint lifecycle](#how-it-works-the-complaint-lifecycle)
6. [Authentication flow](#authentication-flow)
7. [Data model](#data-model)
8. [What each page does](#what-each-page-does)
9. [Security model](#security-model)
10. [Deployment](#deployment)
11. [Known issues and limitations](#known-issues-and-limitations)

---

## Architecture

```
 Browser
   │  pages, forms, dashboards (React)
   │  fetch('/api/...')  +  Authorization: Bearer <JWT from localStorage>
   ▼
 frontend/   Next.js 16.3 (App Router, JSX, Tailwind)          :3000
   │  next.config.mjs rewrites /api/*  →  BACKEND_URL/api/*
   ▼
 backend/    Express 5 REST API (Node.js, ES modules)        :4000
   │  middleware: JSON body, auth (JWT), role checks, multer uploads
   │  routes → src/lib/db.js (maps rows ⇄ JSON documents)
   │  service-role key (server only)
   ▼
 Supabase
   ├─ Postgres: administrative_divisions, users, complaints (RLS: locked)
   ├─ RPC: complaint_stats()
   └─ Storage: proof-of-work bucket (public read)
```

- The **frontend** is purely UI. All pages are client components that call
  relative `/api/...` URLs. Next.js proxies those to the backend, so the browser
  talks to one origin (no CORS), and the pages don't need to know where the API lives.
- The **backend** holds all business rules and is the only thing that talks to
  Supabase. It uses the service-role key, and Row Level Security blocks every
  other key.
- **Supabase** stores the data (Postgres) and proof-of-work photos (Storage).

## Repository layout

```
echovote/
├── package.json              # runs both apps together (concurrently)
├── backend/                  # Express API  → see backend/README.md
│   ├── src/
│   │   ├── server.js         # starts the HTTP server (PORT, default 4000)
│   │   ├── app.js            # Express app: middleware + route mounting
│   │   ├── routes/           # auth, complaints, officer, user, administrativeDivisions, admin
│   │   ├── middleware/       # auth.js (JWT + roles), upload.js (multer)
│   │   ├── lib/              # supabase.js (client), db.js (data access), auth.js (bcrypt/JWT), constants.js
│   │   ├── scripts/          # seedDatabase.js, seedOfficers.js
│   │   └── data/             # Indian states/districts + departments (seed source)
│   ├── supabase/migrations/  # SQL schema: tables, indexes, RLS, RPC, storage bucket
│   └── .env.example
└── frontend/                 # Next.js UI   → see frontend/README.md
    ├── src/
    │   ├── app/              # pages (App Router): home, auth, complaints, dashboards, about
    │   ├── components/       # ComplaintSubmissionForm, ComplaintDetail, ui/ (button, card, input, textarea)
    │   ├── lib/              # constants.js (enums), utils.js (cn helper)
    │   └── data/             # states/districts for the location dropdowns
    ├── public/
    ├── next.config.mjs       # /api proxy to the backend
    └── .env.example
```

`constants.js` (status/role enums) and `indian-administrative-data.js` exist in
both apps: the backend needs them for rules and seeding, the frontend for labels
and dropdowns. Keep the two copies in sync if you change them.

## Getting started

**Prerequisites:** Node.js 20.6+ and a [Supabase](https://supabase.com) project (the free tier is enough).

1. **Install everything** (root, backend and frontend):
   ```bash
   npm install
   ```
2. **Create the schema:** run
   [`backend/supabase/migrations/20260929000000_init.sql`](backend/supabase/migrations/20260929000000_init.sql)
   in Supabase Dashboard → SQL Editor (or `cd backend && npx supabase link --project-ref <ref> && npm run db:push`).
3. **Configure the backend:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Fill in `SUPABASE_URL` (just `https://<ref>.supabase.co`, no `/rest/v1`),
   `SUPABASE_SERVICE_ROLE_KEY` and a random `JWT_SECRET` (`openssl rand -base64 32`).
4. **Seed data** (once):
   ```bash
   npm run seed           # 36 states/UTs, 732 districts, 306 blocks, 612 panchayats
   npm run seed:officers  # admin, 14 officers, 15 citizens, 28 sample complaints
   ```
5. **Run both apps:**
   ```bash
   npm run dev            # backend :4000 + frontend :3000
   ```
   Open http://localhost:3000.

| Demo account | Email | Password |
|---|---|---|
| Citizen | `ramesh.gupta@gmail.com` (or any seeded `@gmail.com`) | `Citizen@123` |
| District officer (Mumbai, PWD) | `amit.patel@gov.in` | `Officer@123` |
| State officer (Maharashtra, PWD) | `rajesh.kumar@gov.in` | `Officer@123` |
| Admin (verifies officers) | `admin@echovote.gov.in` | `Admin@123` |

| Root script | What it does |
|---|---|
| `npm run dev` | backend (`node --watch`) and frontend (`next dev`) together |
| `npm run build` | production build of the frontend |
| `npm start` | backend + `next start` (run `build` first) |
| `npm run seed` / `seed:officers` | load seed data into Supabase |
| `npm run lint` | lint the frontend |

## Who uses it

| Role | `userType` | What they can do |
|---|---|---|
| **Guest** | – | Browse public complaints and their timelines |
| **Citizen** | `citizen` | Register, file complaints (optionally anonymous), track them, give feedback after closure |
| **State officer** | `government_officer`, `adminLevel: state` | Receives new complaints for their department and state, delegates them to district officers, verifies and closes resolved work |
| **District officer** | `government_officer`, `adminLevel: district` | Acknowledges assigned complaints, posts progress and proof photos, marks work resolved, notifies citizens |
| **Block officer** | `government_officer`, `adminLevel: block` | Generic officer dashboard (assigned and area complaints) |
| **Admin** | `admin` | Verifies or rejects self-registered officers at `/dashboard/admin`. Admin accounts can't be created through sign-up. |

Officers belong to a **department** (e.g. *Public Works Department*) and a
**jurisdiction**, a row in `administrative_divisions` (a state, district or block).

## How it works: the complaint lifecycle

```
 submitted ──assign──▶ acknowledged ──acknowledge──▶ in_progress ──proof + resolve──▶ resolved ──verify──▶ closed ──▶ citizen feedback
 (state officer)       (district officer)            (district officer)               (state officer)
                                                          ▲                                │
                                                          └──────────── rejected ──────────┘
```

**1. Citizen files a complaint:** `/complaints/submit` → `POST /api/complaints`
- The backend finds the **state division** for `location.state`. Complaints always start at state level.
- The department must be one of the canonical `DEPARTMENTS` (`constants.js`), the
  same names officers register with, so routing by department always matches.
- It looks for a **verified state officer** of that department in that
  jurisdiction and puts them in `officer_ids` automatically.
- It generates a public ticket number: `EV` + state (2) + district (3) + timestamp + 4 random chars (e.g. `EVMAMUM1790…`).
- Status becomes `submitted`, and the first `status_history` entry is written.
  Anonymous complaints get `is_public = false`.

**2. The state officer triages and delegates:** `/dashboard/officer/state`
- The dashboard (`GET /api/officer/state-dashboard`) shows, for the officer's department and state:
  - **unassigned** complaints: no officer yet, or still `submitted` and sitting with the state officer
  - district officers split into **free** (< 5 active complaints) and **busy**
  - **assigned** complaints in progress with district officers
  - **resolved** complaints awaiting verification (with their proof of work)
  - recently **closed** complaints
- **Assign** (`POST /api/officer/assign-complaint`): only state officers, only
  complaints in their state and department. It moves the complaint to the
  district division, replaces the officer list with the chosen district
  officer, sets status `acknowledged`, sets an optional deadline (`due_date`),
  and records the hand-off in `escalation_history` and `status_history`.

**3. The district officer works it:** `/dashboard/officer/district`
- The dashboard (`GET /api/officer/district-dashboard`) groups assigned complaints
  into pending, acknowledged, in progress and resolved. It flags deadlines as
  `OVERDUE`, `URGENT` (≤ 2 days), `APPROACHING` (≤ 5) or `ON_TRACK`, and shows
  category, priority and location breakdowns plus completion and on-time rates.
- **Acknowledge** (`POST /api/officer/complaints/:id/acknowledge`): status becomes `in_progress`.
- **Submit proof** (`POST …/submit-proof`) adds a `proof_of_work` entry
  (description, work details, photo URLs).
  - With `markAsResolved`, at least one photo is required. The status becomes
    `resolved`, and `resolution` records who resolved it and whether the deadline was met.
  - Otherwise it is a progress update, and it can move the deadline.
- **Update status** (`PUT …/status`) and **notify citizen** (`POST …/notify`)
  append to the timeline. District officers can't notify while a complaint is
  `resolved` and waiting for the state officer.
- **Photos:** the proof and resolve forms use a photo picker (`PhotoUploader`):
  choose files, drag & drop, or take a photo with the phone camera.
  - Photos are previewed and resized in the browser (long edge ≤ 1920 px, JPEG).
  - On submit they upload via `POST …/upload-proof-photos` to the Supabase Storage
    bucket `proof-of-work/<complaint id>/`, and the proof saves their public URLs.
  - Only the assigned officer can upload: images only, ≤ 10 files, ≤ 5 MB each.
  - **Marking resolved requires at least one photo.**

**4. The state officer verifies:** `POST /api/officer/complaints/:id/verify-and-close`
- Only the state officer of the complaint's own state and department can verify it.
- **Approve:** status becomes `closed`. The district officer's resolution write-up
  is kept, `verificationNotes`, `verifiedBy`, `verifiedAt` and `closedAt` are
  added, and an optional message to the citizen goes on the timeline.
- **Reject:** the complaint goes back to `in_progress`, with the reason recorded
  for the district officer.

**Community support:** anyone logged in can upvote a visible complaint (once
per user) and add supportive comments (`POST /api/complaints/:id/support`).
Upvoter ids are stored but never returned by the API.

**5. The citizen closes the loop:** `/complaints/:id`
- The citizen sees the full timeline: every status change with who made it,
  proof photos, resolution and verification.
- Once the complaint is `closed`, the owner can leave **feedback**
  (`POST /api/complaints/:id/feedback`, 1–5 stars plus a comment).

**Transparency rules** (in `GET /api/complaints` and `GET /api/complaints/:id`):
- Guests and citizens only see complaints with `is_public = true`. Officers also see private ones.
- Non-owners see a truncated description (100 characters in lists, 200 in detail).
- Proof of work, resolution, attachments, escalation history and feedback are
  shown only to the owner and to officers.

## Authentication flow

```
Login page ──POST /api/auth/login──▶ backend: find user by email (Supabase)
                                        bcrypt.compare(password, hash)
                                        sign JWT {userId, email, userType, isAnonymous}, expires in 7 days
          ◀── { token, user } ────────
localStorage.token / localStorage.user
Every API call:  Authorization: Bearer <token>
Backend middleware: optionalAuth | requireAuth | requireOfficer | requireAdmin → req.user
```

- Passwords are hashed with bcrypt (12 rounds on registration, 10 in the seed).
- After login, citizens go to `/dashboard/citizen`, officers to `/dashboard/officer`
  and admins to `/dashboard/admin`.
  The officer hub calls `/api/officer/profile` and redirects to the state or
  district dashboard based on `adminLevel`.
- **Officer self-registration** (`/auth/register?type=officer`) collects the
  department and requested level (state, district or block) and creates an
  **unverified** account, then shows `/auth/verification-pending`. Unverified
  officers can't log in.
- **Admin verification** (`/dashboard/admin`): the admin confirms the level, and
  the backend assigns the jurisdiction that matches the officer's address. A
  missing block is created under its district. Rejecting deactivates the account.
- Sign-up only creates citizens or officers. Admins come from the seed or the database.
- This is custom JWT auth, not Supabase Auth. Users live in the `users` table.

## Data model

Defined in [`backend/supabase/migrations/20260929000000_init.sql`](backend/supabase/migrations/20260929000000_init.sql).
Fields that are filtered or joined on are real columns (with indexes and foreign
keys). Nested, append-only data is stored as `jsonb`.

**`administrative_divisions`** is the Indian hierarchy: state → district → block → panchayat (→ ward).
- `code` is unique and upserted by the seed. `level` holds the hierarchy level,
  `parent_id` links to the parent division, and `state`/`district` are the names.
- `departments[]` lists the departments available at that level.

**`users`**
- `email` (unique, lowercase), `password` (bcrypt hash), `user_type`.
- `profile` (jsonb): name, phone, address {state, district, block, …, pincode}.
- `government_details` (jsonb): employeeId, department, designation,
  adminLevel, isVerified, verificationDocuments.
- `jurisdiction_id` → `administrative_divisions`.
- `is_anonymous`, `anonymous_id`.

**`complaints`**
- `ticket_number` (unique); `title`, `description`, `category`, `subcategory`,
  `priority` (low/medium/high/critical), `status`.
- `location` (jsonb): state, district, block, panchayat, ward, address, coordinates.
- Submitter: `submitted_by_user_id` → users, or `anonymous_id`.
- Assignment: `division_id` → divisions, `department`, `officer_ids[]`.
- Histories (jsonb arrays): `status_history`, `escalation_history`,
  `proof_of_work`, `attachments`.
- `public_support` {upvotes, comments, upvoters (private)}, `resolution`
  {description, resolvedBy, resolvedAt, verificationNotes, verifiedBy, verifiedAt, closedAt}, `feedback`.
- `updated_at` also serves as an **optimistic lock**. `saveComplaint()` only writes if
  it is unchanged since the complaint was loaded. Otherwise the API answers 409
  "updated by someone else, reload", so concurrent edits can't overwrite each other.
- `due_date`, `resolved_at`, `is_public`, `tags[]`, timestamps (an
  `updated_at` trigger keeps them current).

**`complaint_stats(p_user_id, p_anonymous_id, p_public_only)`** is an RPC that
returns per-status counts and the number of distinct states for the complaint list header.

The backend's [`src/lib/db.js`](backend/src/lib/db.js) maps rows to the
camelCase document shape the frontend expects (`_id`, `submittedBy`,
`assignedTo.officers`, …). Its `populateComplaints()` replaces officer and
division ids with names and designations using two batched queries.

## What each page does

| Page | Purpose | API used |
|---|---|---|
| `/` | Landing page: mission, features, how it works | – |
| `/about` | About the platform and tech stack | – |
| `/auth/login` | Login, then redirect by role (or `?redirect=`) | `POST /auth/login` |
| `/auth/register` (`?type=officer`) | Citizen or officer registration | `POST /auth/register` |
| `/auth/verification-pending` | Shown after officer registration | – |
| `/complaints` | Public complaint board: live stats, search, status/category/state filters, pagination | `GET /complaints` |
| `/complaints/submit` | New complaint form (location dropdowns, department, priority, anonymous) | `POST /complaints` |
| `/complaints/[id]` | Complaint detail: timeline, officers, proof, resolution, community support, feedback | `GET /complaints/:id`, `POST /complaints/:id/support`, `POST /complaints/:id/feedback` |
| `/dashboard/citizen` | My complaints with status counts and search | `GET /complaints/my-complaints` |
| `/dashboard/officer` | Officer hub: redirects state/district officers; generic view for others | `GET /officer/profile`, `/officer/my-complaints`, `/officer/area-complaints`, `/officer/subordinate-tasks` |
| `/dashboard/officer/state` | Delegate, verify and close, notify | `GET /officer/state-dashboard`, `POST /officer/assign-complaint`, `…/verify-and-close`, `…/notify` |
| `/dashboard/officer/district` | Acknowledge, proof/resolve, status, notify | `GET /officer/district-dashboard`, `…/acknowledge`, `…/submit-proof`, `…/status`, `…/notify` |
| `/dashboard/admin` | Verify or reject officer registrations | `GET /admin/officers`, `POST /admin/officers/:id/verify`, `…/reject` |

The full endpoint reference is in [backend/README.md](backend/README.md#api-reference).

## Security model

- **Row Level Security** is enabled on every table with no policies, so Supabase's
  public anon key can't read or write anything. Only the backend's
  service-role key can. Keep that key in `backend/.env`, never in the frontend.
- **Role checks** happen in backend middleware (`requireAuth`, `requireOfficer`,
  `requireAdmin`), plus per-route rules: for example, only state officers can
  assign or verify, and only the owner can leave feedback.
- **Input safety:**
  - Search terms are escaped before they reach PostgREST filters.
  - Complaint ids are validated as UUIDs.
  - Uploads are limited by type, size and count, and stored in Storage, not on disk.
- **Admin endpoints** (seeding, officer verification) require an admin token,
  and nobody can register as an admin.

## Deployment

- **Backend:** any Node host (Render, Railway, Fly, a VM).
  - `npm start` in `backend/`.
  - Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `PORT`,
    and optionally `CORS_ORIGIN`.
- **Frontend:** Vercel or any Node host.
  - Set **`BACKEND_URL` before building.** Next.js resolves rewrite targets at
    build time, so changing it later has no effect without a rebuild.
- **Database:** apply the migration to the production Supabase project and run the seeds once.

## Known issues and limitations

- **Session storage.** Tokens live in `localStorage` for 7 days and can't be revoked
  before they expire. A deactivated user's existing token keeps working until then,
  though login is refused.
- **No email notifications.** "Notify citizen" adds a message to the public
  timeline. It doesn't send email or SMS.
- **Shared constants are copied.** `constants.js` and `indian-administrative-data.js`
  exist in both apps, so edit both copies together.
- **Seed complaints duplicate.** `npm run seed:officers` creates the 28 sample
  complaints again each time it runs. Officers, citizens and the admin are skipped
  if they already exist.
