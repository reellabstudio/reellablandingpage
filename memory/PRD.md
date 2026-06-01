# ReelLab Studio – PRD (v5 — LAUNCHED)

## Original problem statement
> Build the fully functional ReelLab Studio app from the official HTMLs. CEO email `ceo@reellabstudio.com`. Goal: "fully created before deployment, no edits needed for first 90 days."

## Tech stack
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations.payments.stripe + Python smtplib
- **Frontend**: React 19 + React Router 7 + axios + lucide-react
- **Fonts**: DM Sans / DM Mono / Playfair Display
- **Palette**: purple `#7B4FD4` → mid `#9B6FE8` → light `#C4AAFF`

## Status: LIVE (Feb 2026)
- **Stripe**: LIVE via restricted key `rk_live_...` — real $1.00 Founder Circle charges flow to `cs_live_...` Stripe Checkout sessions. Verified end-to-end.
- **SMTP**: LIVE via Google Workspace `support@reellabstudio.com` (port 587 STARTTLS, app password). Password reset emails deliver successfully.
- **Hello@ / Sales@**: routed via Workspace aliases (hello@ → support@; sales@ kept separate for marketing).
- **AI Editor**: still MOCKED (preset 8-clip generator) — P2 backlog for real Replicate/Whisper integration.

## Architecture
- **Public site** (no auth): `/`, `/pricing`, `/founder-checkout`, `/login`, `/register`, `/forgot-password`, `/reset-password`
- **App** (auth + legal-accepted): `/dashboard`, `/projects/*`, `/clients`, `/invoices`, `/editor`, `/community`, `/profile`, `/sparks`
- **CEO** (role=ceo): `/ceo` — 14 sections (Overview, Activity, Users, Projects, Pricing, Waitlist, Founder Circle, **Founder A/B**, Dummy Data, FAQ, Emails, Affiliates, Moderation, Settings)
- **Catch-all**: `/*` → `NotFound`

## v5 additions (Feb 2026 — Launch day)
- **A/B test on /founder-checkout**: 50/50 split, persisted per visitor in `localStorage.rl_ab_founder` (StrictMode-safe via useRef). Force a variant via `?v=a` or `?v=b`. Variants:
  - **A (control)**: "One dollar. / *Founder status.* / First month free."
  - **B**: "One dollar today. / *Yours for life.* / First month free."
- **CEO Back Office → Founder A/B panel**: impressions, conversions, conversion rate, revenue, and per-ref-code breakdown for each variant; LEADING pill on the winning variant.
- **POST /api/public/ab/impression** — public, fires once per page load.
- **GET /api/ceo/ab-test/founder-checkout** — CEO-only analytics with by-referral-code bucketing.
- **GET /api/public/payment-mode** — frontend hides card-form when Stripe is live (Stripe Checkout collects card data instead).
- **ab_variant** persisted into `payment_transactions.metadata` so conversions are correctly attributed.
- **Security**: reset link no longer logged when SMTP is configured (prevents token leakage in production logs).
- **Accessibility**: A/B panel + 404 page contrast fixes.

## Implemented (v1 → v5 cumulative)

### Public marketing
- Landing with hero (Playfair), waitlist form (saves to MongoDB), Founder Circle form (routes to paid checkout), Survey link, 8-platform export grid, 4-audience cards, public AI Help Bot
- Pricing page (3 tiers, monthly/yearly toggle, live data from `/api/pricing`)
- Founder Checkout — A/B-tested headline, hides card form in live Stripe mode (redirects to Stripe Checkout)
- 404 page — Playfair "doesn't exist" with Take me home / View pricing / Email support

### Auth + onboarding
- Register / Login (JWT Bearer in localStorage, 7-day expiry)
- Forgot Password + Reset Password — email-based, 30-min token, real Gmail SMTP delivery
- Legal Gate with 3 collapsible doc cards (Terms / Code of Conduct / ToS)
- Onboarding tour (7-step modal, dismiss on backdrop click)

### App
- Dashboard, Projects (5-step wizard + detail w/ 5 tabs), Clients, Invoices, AI Editor (Screen 24, mocked), Community, Profile
- Sparks / Affiliate Hub — "Your Constellation" branding, referral link copy w/ execCommand fallback, 4 stat cards (reactive to period toggle), 12-month commission bar chart, sparks table

### CEO Back Office (14 sections)
Platform Overview · Activity Log · User Management · All Projects · Pricing & Plans · Waitlist · Founder Circle · **Founder A/B** · Dummy Data · FAQ Editor · Email Templates · Affiliates & Badges · Moderation · Platform Settings

### Backend endpoints (70+ behind /api)
- Auth: register / login / me / legal-accept / profile / password-reset (request + confirm)
- Clients & Projects: full CRUD + messages + checklist
- AI editor: upload / process / projects / timeline / auto-edit
- Invoices: list / create / status / pay (mocked)
- Community: posts / likes / comments / members / stars / flag
- Help: faq / query / public/help/query / public/contact-emails
- Stripe (LIVE): payments/checkout / payments/status / webhook/stripe
- Public: waitlist / founder-circle / pricing / public/faq / public/payment-mode / public/ab/impression
- Affiliate: affiliate/me / affiliate/lookup/{code}
- CEO admin: overview / activity / users / projects / pricing / settings / email-templates / faq / waitlist / founders / payments / affiliates-overview / moderation / dummy-data / override / badge / **ab-test/founder-checkout**

## Test coverage
- Iteration 1: 25/25 backend, frontend critical flows passed
- Iteration 2: 17 new endpoints, 100% backend (42/42)
- Iteration 3: 17 new endpoints, 100% backend (59/59), 100% frontend testid coverage
- Iteration 4: 2 minor frontend bugs resolved (clipboard + period toggle)
- Iteration 5 (Feb 2026 — LAUNCH): 16/16 backend pytest pass. Stripe LIVE verified (`cs_live_...` sessions created). SMTP LIVE verified (no exceptions, no `dev_reset_link` returned, reset token no longer logged). A/B variant copy + persistence + redirect + CEO panel all functional. Three post-test fixes: A/B panel contrast, 404 page contrast, StrictMode dedup on impression POST. Reset-link log gated on `SMTP_HOST=""`.

## Backlog (P2, post-90-day-freeze)
- Real AI moment detection (Replicate / Whisper + LLM scoring) — UI already in place
- Affiliate payout automation via Stripe Connect ($25 threshold)
- Pre-production toolkit (Brief / Shot List / Call Sheet generators)
- Direct messages, push notifications
- Team invite UI per project
- Mobile native apps
- Stripe webhook secret + signature verification (currently optional; add when traffic justifies it)
