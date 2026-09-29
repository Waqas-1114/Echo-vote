# EchoVote Backend

Express 5 REST API for EchoVote. It owns all business rules and is the only
component with access to Supabase (Postgres and Storage). See the
[root README](../README.md) for the overall architecture and complaint lifecycle.

## Run

```bash
cp .env.example .env     # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, PORT
npm install
npm run dev              # node --watch, http://localhost:4000 ehehe
```

| Script | What it does |
|---|---|
| `npm run dev` | Start with auto-restart on file changes |
| `npm start` | Start for production |
| `npm run seed` | Upsert Indian administrative divisions (safe to re-run) |
| `npm run seed:officers` | Create the admin, demo officers, citizens and 28 complaints (run **once**: complaints duplicate on re-run) |
| `npm run db:push` | Apply `supabase/migrations` with the Supabase CLI (after `npx supabase link`) |

| Env var | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | `https://<ref>.supabase.co` (no `/rest/v1`) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service-role / secret key. Server only. |
| `JWT_SECRET` | yes | Signs login tokens. |
| `PORT` | no | Default `4000` |
| `CORS_ORIGIN` | no | Comma-separated origins allowed to call the API directly. Not needed when going through the frontend proxy. |

## Code map

```
src/
├── server.js               # listen on PORT
├── app.js                  # JSON body, CORS (optional), routers, 404 + error handler
├── middleware/
│   ├── auth.js             # optionalAuth, requireAuth, requireOfficer, requireAdmin → req.user
│   └── upload.js           # multer: multipart "photos" → req.files (≤10 files, ≤5 MB)
├── routes/                 # one router per resource, mounted under /api
├── lib/
│   ├── supabase.js         # lazy service-role client
│   ├── db.js               # row ⇄ document mappers, getters/savers, populateComplaints, fetchAll, ilikeAny
│   ├── auth.js             # bcrypt hashing, JWT sign/verify, ticket + anonymous id generators
│   └── constants.js        # UserType, AdminLevel, ComplaintStatus, ComplaintPriority
├── scripts/                # seedDatabase.js, seedOfficers.js (runnable directly or via /api/admin)
└── data/                   # states, districts and departments used by the seeds
supabase/migrations/        # schema (tables, indexes, RLS, complaint_stats RPC, storage bucket)
```

**Request pipeline:** `express.json()` → auth middleware (sets `req.user` to the
JWT payload `{ userId, email, userType, isAnonymous }`) → route handler →
`lib/db.js` → Supabase. Handlers load a complaint as a plain object, change it,
and write it back with `saveComplaint()`. That save is optimistically locked on
`updated_at`: if someone else saved in between, it throws `ConflictError` and
the route answers **409** so the client can reload. `updateComplaint()` wraps
load → change → save with automatic retries, for small independent edits such as upvotes.

## API reference

Every path is prefixed with `/api`. Auth levels: **public**, **optional** (a guest
works, and a token unlocks more), **user** (any logged-in user), **officer**
(`government_officer`), **admin**. A missing or invalid token returns `401`; the
wrong role returns `403`.

### Auth
| Method | Path | Auth | Body → Response |
|---|---|---|---|
| POST | `/auth/register` | public | `{ email, password, userType? ('citizen' or 'government_officer'), profile{ name, phone, address, isAnonymous? }, governmentDetails? { employeeId, department (one of DEPARTMENTS), designation, adminLevel (state/district/block) } }` → `{ user, token }` (201). Officers start unverified. |
| POST | `/auth/login` | public | `{ email, password }` → `{ user (incl. governmentDetails.jurisdiction), token }`. Unverified officers and deactivated accounts get 403. |

### Complaints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/complaints` | optional | Paginated list. Query: `page, limit (≤50), status, category, state, district, search, userComplaints=true`. Returns `{ complaints, stats, pagination }`. Guests and citizens see public complaints only. |
| POST | `/complaints` | user | Create: `{ title, description, category, subcategory?, priority?, location{state, district, …}, department (one of DEPARTMENTS), tags?, isAnonymous? }`. Assigned to the state division and a verified state officer of that department. |
| GET | `/complaints/my-complaints` | user | The caller's own complaints, including ones filed anonymously |
| GET | `/complaints/:id` | optional | Detail with populated officers, division, timeline authors. Owners and officers also get proof, resolution, escalations, feedback. |
| POST | `/complaints/:id/support` | user | `{ type: 'upvote' }` (counted once per user) or `{ type: 'comment', comment (≤1000 chars) }` → `{ publicSupport, hasUpvoted }` |
| POST | `/complaints/:id/feedback` | user (owner) | `{ rating 1–5, comments }`. Only once the complaint is `closed`. |
| GET | `/complaints/assigned` | officer | 10 latest complaints assigned to me + counts |
| GET | `/complaints/jurisdiction` | officer | Open complaints in my district not yet assigned to me |
| POST | `/complaints/:id/assign` | officer | Add myself to the officers and set `in_progress` |

### Officer
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/officer/profile` | officer | Name, designation, department, adminLevel, jurisdiction |
| GET | `/officer/my-complaints` | officer | All complaints assigned to me (with `daysOpen`) |
| GET | `/officer/area-complaints` | officer | All complaints in my jurisdiction division |
| GET | `/officer/subordinate-tasks` | officer | Complaints held by lower-level officers of my department in my state (and my district, below state level) |
| GET | `/officer/state-dashboard` | officer (state) | Free and busy district officers, plus unassigned, assigned, resolved and closed complaints |
| GET | `/officer/district-dashboard` | officer (district) | My complaints by stage, deadline status, analytics |
| POST | `/officer/assign-complaint` | officer (state) | `{ complaintId, officerId, deadline?, instructions? }`: delegate to a district officer (status `acknowledged`) |
| POST | `/officer/complaints/:id/acknowledge` | assigned officer | `{ message? }` → `in_progress` |
| POST | `/officer/complaints/:id/submit-proof` | assigned officer | `{ description, workDetails, photosUrls[], markAsResolved?, estimatedCompletionDate? }`. Resolving needs ≥ 1 photo. |
| POST | `/officer/complaints/:id/add-work-progress` | assigned officer | `{ description, workDetails, photosUrls?, progressPercentage? }` |
| POST | `/officer/complaints/:id/upload-proof-photos` | officer | multipart `photos` → `{ urls }` (Supabase Storage public URLs) |
| PUT | `/officer/complaints/:id/status` | assigned officer | `{ status, comments? }` |
| POST | `/officer/complaints/:id/notify` | officer | `{ message }`: adds a citizen notification to the timeline |
| POST | `/officer/complaints/:id/verify-and-close` | officer (state, same state and department) | `{ approved, verificationNotes, notifyCitizen?, notificationMessage? }`. Approve → `closed` (records verification and `closedAt`), reject → `in_progress`. |
| POST | `/officer/complaints/:id/verify-resolution` | officer (state) | `{ approved, comments? }`: older variant of verify-and-close |

### Other
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/user/profile` | user | The caller's profile (no password hash) |
| GET | `/administrative-divisions` | public | Query: `level, state, district, parentId` |
| POST | `/administrative-divisions` | public | `{ state, district? }` → state, its districts, and the blocks/panchayats of a district |
| POST | `/admin/seed` | admin | `{ force: true }`: re-run the division seed |
| POST | `/admin/seed-officers` | admin | Run the officer/citizen/complaint seed |
| GET | `/admin/officers?status=pending\|verified\|all` | admin | Officer registrations (no password hashes) |
| POST | `/admin/officers/:id/verify` | admin | `{ adminLevel? }`: verify, assigning the jurisdiction that matches the officer's address |
| POST | `/admin/officers/:id/reject` | admin | Deactivate the registration |
| GET | `/health` | public | `{ status: "ok" }` |
