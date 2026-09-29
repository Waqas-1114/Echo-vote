# EchoVote Frontend

Next.js 16.3 (App Router) UI for EchoVote, written in JavaScript (JSX) with
Tailwind CSS. It has no server logic of its own. See the [root README](../README.md)
for the architecture, user flows and a page-by-page table.

## Run

```bash
npm install
npm run dev        # http://localhost:3000 (start the backend too, or use `npm run dev` at the repo root)
```

| Env var | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://localhost:4000` | Where `/api/*` requests are proxied. Read at **build** time for `next build`, and at startup for `next dev`. |

## How it talks to the backend

- Pages call relative URLs such as `fetch('/api/complaints')`.
  [`next.config.mjs`](next.config.mjs) rewrites `/api/:path*` to
  `${BACKEND_URL}/api/:path*`, so the browser only ever talks to this origin.
- After login, the JWT and user object are kept in `localStorage` (`token`,
  `user`) and sent as `Authorization: Bearer <token>`.
- Pages load their data inside `useEffect`; dashboards re-run the loader via a
  `reloadKey` after each action.
- Guards are client-side: dashboards redirect to `/auth/login` when there is no token.
  The backend enforces the real permissions.

## Code map

```
src/
├── app/
│   ├── page.jsx                     # landing page
│   ├── about/                       # about page
│   ├── auth/                        # login, register (?type=officer), verification-pending
│   ├── complaints/                  # public board, submit, [id] detail
│   └── dashboard/
│       ├── admin/                   # officer verification (admin only)
│       ├── citizen/                 # my complaints
│       └── officer/                 # hub (redirects by adminLevel), state/, district/
├── components/
│   ├── ComplaintSubmissionForm.jsx  # location dropdowns, category, department, priority, anonymous
│   ├── ComplaintDetail.jsx          # timeline, officers, proof photos, resolution, community support, feedback
│   └── ui/                          # button, card, input, textarea (shadcn-style)
├── lib/
│   ├── constants.js                 # enums, DEPARTMENTS, COMPLAINT_CATEGORIES (copy of backend/src/lib/constants.js)
│   └── utils.js                     # cn() class-name helper
└── data/indian-administrative-data.js  # states/districts for dropdowns (copy of the backend's)
```
