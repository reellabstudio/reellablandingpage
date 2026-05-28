# ReelLab Studio – Product Requirements Document (PRD)

## Original problem statement
> Build the fully functional ReelLab Studio app. Use the HTML for screen 24. Attached are all forms of the Logo to use throughout the app. For the CEO back office use the email `ceo@reellabstudio.com` (and I'll create the password).
>
> Iteration 2 (2026-05-28): Full site/app update using 3 official HTMLs (Landing, CEO Back Office, Onboarding). Goal: "fully created before deployment so once deployed, no edits or updates will be needed (for the first 90 days at least)".

User choices confirmed:
- Stripe: **kept mocked**, keys to be swapped at deployment
- Founder Circle: **free signup**, save to MongoDB
- Waitlist: save to MongoDB so CEO sees all signups in back office
- CEO password: `ReelLabceo26!`
- Help Bot: FAQ keyword matching

## Architecture
- **Public marketing site** at `/` (Landing) + `/pricing` — pre-launch with waitlist + Founder Circle
- **App** at `/login`, `/register`, `/legal`, `/dashboard`, `/projects/*`, `/clients`, `/invoices`, `/editor`, `/community`, `/profile`
- **CEO Back Office** at `/ceo` — standalone admin shell with sidebar
- Backend: FastAPI + Motor (MongoDB) at `/api/*`, JWT Bearer (7-day) in localStorage
- Frontend: React 19 + React Router 7 + axios + lucide-react
- Fonts: **DM Sans + DM Mono + Playfair Display**
- Color palette (official): purple #7B4FD4 / purple-mid #9B6FE8 / purple-light #C4AAFF / teal #0F9B7A / coral #C44B2A / amber #C4891A

## What's been implemented

### Public marketing (v2 — official designs)
- **Landing** (`/`): Hero with Playfair headline + waitlist + 3 orbs animation, stats bar, pain points list, 6-feature grid, 8-platform export grid, 4-audience cards, Survey card linking to https://reellabcreatorsurvey.netlify.app, Founder Circle form, bottom CTA, footer. Public Help Bot floating bubble with FAQ matching.
- **Pricing** (`/pricing`): Monthly/Yearly toggle (21% saving), 3 plan cards (Solo $19, Creator $49, Studio $199), add-ons grid. Reads live pricing from backend so CEO updates reflect instantly.

### App (existing, palette refreshed)
- Login / Register / Legal Gate (now with **collapsible doc cards** matching official onboarding HTML)
- Dashboard, Projects (+ 5-step wizard, detail with 5 tabs), Clients, Invoices, AI Editor (Screen 24), Community (feed + members + 1-star/day), Profile

### CEO Back Office (rebuilt, 11 sections)
Sidebar navigation, standalone admin shell (no app top nav):
1. **Platform Overview** — 4 metric cards + recent activity feed + quick actions
2. **Activity Log** — full chronological feed
3. **User Management** — table with badge & status dropdowns, delete (non-CEO)
4. **All Projects** — override modal with required note + audit logging
5. **Pricing & Plans** — editable monthly/yearly per tier, "Sync to Stripe" (MOCKED button)
6. **Waitlist** — table of signups + CSV export
7. **Founder Circle** — applications with type/handle
8. **Dummy Data** — seed/clear demo clients & projects
9. **FAQ Editor** — full CRUD with category, question, answer, keywords
10. **Email Templates** — editable subject/body for welcome / invoice_paid / project_delivered / founder_welcome
11. **Affiliates & Badges** — blue/gold badge assignment with counts
12. **Moderation** — flagged content queue with dismiss/warn/remove/suspend actions
13. **Platform Settings** — 6 toggles (new_signups, maintenance, community, affiliates, dummy_data, email_notifications)

### Backend endpoints (additions in v2)
- `POST /api/waitlist` — public
- `POST /api/founder-circle` — public
- `GET /api/pricing` — public (live data drives /pricing page)
- `GET /api/public/faq` — public
- `GET/PATCH/DELETE /api/ceo/users` — admin
- `GET /api/ceo/waitlist`, `/api/ceo/founders`
- `GET/POST/PATCH/DELETE /api/ceo/faq` — full CRUD
- `PUT /api/ceo/pricing`, `POST /api/ceo/pricing/sync-stripe` (mocked)
- `GET/PUT /api/ceo/settings` — platform toggles
- `GET/PUT /api/ceo/email-templates`
- `POST /api/community/flag`, `GET/POST /api/ceo/moderation/*`
- `POST /api/ceo/dummy-data/seed`, `DELETE /api/ceo/dummy-data`

### Startup seeding
- CEO auto-seeded (`ceo@reellabstudio.com` / `ReelLabceo26!`), password syncs from `.env`
- Default pricing, platform settings, email templates seeded if missing
- FAQ seeded from in-code list if FAQ collection is empty

## MOCKED (clearly indicated to users)
- Stripe payments (invoice "Mark Paid" button + AI upload payment modal + CEO "Sync to Stripe" button)
- Real AI video processing (deterministic 8-clip generator)
- Video export (toast only)

## Backlog / post-deploy
- Wire real Stripe (CEO has UI ready, just needs keys in `backend/.env` at deploy)
- Real AI moment detection (Replicate / Whisper + LLM scoring) — UI is already there
- Cloudflare DNS / domain wiring at deploy
- Direct messages, push notifications
- Pre-production toolkit (Brief / Shot List / Call Sheet)
- Team invite UI per project

## Key files
- `/app/backend/server.py` — single-file backend, all endpoints
- `/app/frontend/src/App.js` — router
- `/app/frontend/src/pages/Landing.jsx` — official marketing landing
- `/app/frontend/src/pages/Pricing.jsx` — pricing page (live from /api/pricing)
- `/app/frontend/src/pages/LegalGate.jsx` — collapsible 3-doc gate
- `/app/frontend/src/pages/CEOBackOffice.jsx` — full 13-section admin
- `/app/frontend/src/pages/AIEditor.jsx` — Screen 24 editor
- `/app/frontend/src/components/HelpBotPublic.jsx` — public help bot (no auth)
- `/app/frontend/src/index.css` — design tokens (official palette + Playfair)
- `/app/frontend/src/reellab.css` — all page-level styles
