# ReelLab Studio – PRD (v3 — deployment-ready)

## Original problem statement
> Build the fully functional ReelLab Studio app from the official HTMLs. CEO email `ceo@reellabstudio.com`. Goal: "fully created before deployment, no edits needed for first 90 days."

## Tech stack
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations.payments.stripe + Python smtplib
- **Frontend**: React 19 + React Router 7 + axios + lucide-react
- **Fonts**: DM Sans / DM Mono / Playfair Display
- **Palette**: purple `#7B4FD4` → mid `#9B6FE8` → light `#C4AAFF`

## Architecture
- **Public site** (no auth): `/`, `/pricing`, `/founder-checkout`, `/login`, `/register`, `/forgot-password`, `/reset-password`
- **App** (auth + legal-accepted): `/dashboard`, `/projects/*`, `/clients`, `/invoices`, `/editor`, `/community`, `/profile`, `/sparks`
- **CEO** (role=ceo, no app layout): `/ceo`
- **Catch-all**: `/*` → `NotFound`

## Implemented (v1 → v2 → v3 cumulative)

### Public marketing
- Landing with hero (Playfair), waitlist form (saves to MongoDB), Founder Circle form (routes to paid checkout), Survey link, 8-platform export grid, 4-audience cards, public AI Help Bot
- Pricing page (3 tiers, monthly/yearly toggle, live data from `/api/pricing`)
- **Founder Checkout (v3)** — official paid design: $1 + lifetime status + first month Creator free → $49/mo after. Stripe-form layout with full validation. MOCKED in dev (warning banner shows).
- **404 page (v3)** — Playfair "doesn't exist" with Take me home / View pricing / Email support

### Auth + onboarding
- Register / Login (JWT Bearer in localStorage, 7-day expiry)
- **Forgot Password + Reset Password (v3)** — email-based, 30-min token, dev_reset_link returned when SMTP not configured
- Legal Gate with 3 collapsible doc cards (Terms / Code of Conduct / ToS), pulse-animated continue CTA
- Onboarding tour (7-step modal, dismiss on backdrop click)

### App
- Dashboard (stats + quick actions + recent projects + onboarding tour for new users)
- Projects (list, 5-step wizard, detail w/ 5 tabs: Deliverables / Messages / Checklist / Invoices / Team)
- Clients (CRUD), Invoices (line items + mock pay button)
- **AI Editor (Screen 24)** — faithful replica: AI clips panel (8 deterministic preset moments), preview canvas (aspect-aware), 9-tool toolbar (Trim/Speed/Resize/Filters/FX/Text/Transitions/Audio/**AI Edit**), video/audio/text timeline tracks, properties panel (Clip/Export tabs)
- Community (feed + members + 1-star/day, +10 pts each)
- Profile (display name / handle / company / bio / social handles / theme persistence)
- **Sparks / Affiliate Hub (v3)** — "Your Constellation" branding. Referral link with copy-to-clipboard (now has try/catch + execCommand fallback). 4 stat cards. 12-month commission bar chart. Period toggle (monthly/quarterly/annual). Sparks table with status (active/cancelled).

### CEO Back Office (13 sections)
Platform Overview · Activity Log · User Management · All Projects (with override + audit) · Pricing & Plans (editable + Sync-to-Stripe button) · Waitlist · Founder Circle applications · Dummy Data · FAQ Editor · Email Templates · Affiliates & Badges · Moderation · Platform Settings (6 toggles)

### Backend endpoints (66 total, all behind /api)
- Auth: register / login / me / legal-accept / profile / **password-reset/request** / **password-reset/confirm**
- Clients & Projects: full CRUD + messages + checklist
- AI editor: upload / process / projects / timeline / auto-edit
- Invoices: list / create / status / pay (mocked)
- Community: posts / likes / comments / members / stars / flag
- Help: faq / query / public/help/query / public/contact-emails
- **Stripe (v3)**: payments/checkout / payments/status / payments/mock-complete / webhook/stripe
- Public: waitlist / founder-circle / pricing / public/faq
- **Affiliate (v3)**: affiliate/me / affiliate/lookup/{code}
- CEO admin: overview / activity / users / projects / pricing / settings / email-templates / faq / waitlist / founders / payments / affiliates-overview / moderation / dummy-data / override / badge

### Integrations & background
- **Stripe**: scaffolded via `emergentintegrations.payments.stripe.checkout.StripeCheckout`. `STRIPE_MODE=mock` in dev. End-to-end flow tested: checkout → status polling → auto-finalize on first poll → affiliate commission record created when ref code present. Webhook handler returns 200 in mock mode, processes real events in live mode.
- **SMTP**: `smtplib` with STARTTLS. Google Workspace ready. Falls back to logging when SMTP_HOST unset.
- **Referral capture**: `<RefCapture />` in App.js stores `?ref=CODE` in `localStorage.rl_ref` (JSON `{code, ts}`).

## Test coverage
- Iteration 1: 25/25 backend, frontend critical flows passed
- Iteration 2: 17 new endpoints, 100% backend (42/42 total)
- Iteration 3: 17 new endpoints, **100% backend (59/59 total), 100% frontend testid coverage** — 2 minor UX issues flagged
- Iteration 4 (Feb 2026): **Both iteration_3 frontend issues RESOLVED.** AffiliateHub copy-link/copy-code hardened with `window.isSecureContext` guard + `Promise.resolve` wrapper + `document.execCommand` fallback (no more runtime overlay). Period toggle now drives both the chart card AND the `stat-mtd` card (label + amount + MTD/QTD/YTD suffix). New testids: `stat-mtd-amount`, `stat-mtd-period`. 100% (8/8) frontend assertions pass, 0 pageerrors.

## MOCKED in dev (clearly indicated; live in production)
- Stripe charges (all flows — toggle via `STRIPE_MODE=live`)
- SMTP email (toggle via setting `SMTP_HOST`)
- AI video processing (preset 8-clip generator — will need real Replicate/Whisper integration)
- Video export (toast only)

## Deployment artifacts
- `/app/memory/DEPLOYMENT.md` — Stripe + Cloudflare DNS + Google Workspace SMTP cheatsheet
- `/app/memory/test_credentials.md` — CEO creds + test flow notes

## Backlog (post-deploy, beyond first 90 days)
- Real AI moment detection (Replicate / Whisper + LLM scoring) — UI already there
- Direct messages, push notifications
- Pre-production toolkit (Brief / Shot List / Call Sheet generators)
- Team invite UI per project
- Affiliate payout automation via Stripe Connect (currently manual after $25)
- Mobile native apps
