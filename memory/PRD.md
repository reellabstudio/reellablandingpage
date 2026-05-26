# ReelLab Studio – Product Requirements Document (PRD)

## Original problem statement
> Using this full code, build the fully functional ReelLab Studio app. Use the HTML for screen 24. Attached are all forms of the Logo to use throughout the app. For the CEO back office use the email `ceo@reellabstudio.com` (and I'll create the password).

User-chosen scope (from ask_human, 2026-05-26):
- Core MVP (Auth + Legal Gate, Dashboard, Projects, Clients, AI Editor Screen 24, Invoices, Community + Stars, Profile + Badges, CEO Back Office, Help Bot, Dark/Light)
- AI editing: **simulated / mocked** (UI fully working, fake AI moment detection + simulated processing)
- Payments: **fully mocked** (no Stripe keys)
- CEO password: `ReelLabceo26!`
- Help Bot: FAQ keyword matching only (no LLM)

## Tech stack
- Backend: FastAPI + Motor (async MongoDB), bcrypt + PyJWT (HS256 Bearer, 7-day)
- Frontend: React 19 + react-router-dom v7 + axios + lucide-react
- DB: MongoDB (`reellab_studio`)
- Styling: custom CSS variables (DM Sans + DM Mono), dark/light theme via `data-theme`

## User personas
- **CEO / Super Admin** – platform overseer, owns back office
- **Studio Owner** – workspace owner, manages projects/clients/invoices
- **Editor** – team member assigned to projects (foundation laid)
- **Viewer** – read-only client/team member (foundation laid)
- **Community User** – any signed-up user

## What's been implemented (2026-05-26)

### Backend (`/app/backend/server.py`)
- Auth: register, login, me, legal-accept, profile update (Bearer JWT)
- CEO auto-seed on startup, password re-sync from env
- Clients: full CRUD
- Projects: list, create, get, status update, delete, messages, checklist
- Video AI editor flow: `/ai/upload`, `/ai/process/{id}`, `/ai/projects`, `/ai/projects/{id}/timeline`, `/ai/projects/{id}/auto-edit` (all simulated)
- Invoices: create, list, status update, mock pay
- Community: posts (CRUD), like toggle, comments, member list, star transactions (1/day/recipient, +10 pts)
- Help bot: `/help/query` keyword FAQ matcher + `/faq` listing
- CEO back office: `/ceo/overview`, `/ceo/users`, `/ceo/projects`, `/ceo/override`, `/ceo/badge`, `/ceo/activity`
- MongoDB indexes (users.email unique, star_transactions composite unique)

### Frontend
- Landing page (dark, marketing copy, feature cards)
- Auth: Login, Register (with first-class branding hero side)
- Legal Gate (3 documents w/ checkboxes, IP+timestamp logged)
- App layout: top nav (Dashboard, Projects, Clients, AI Editor, Invoices, Community, CEO for ceo role), user menu with theme toggle
- Dashboard: stats (active projects, clients, paid revenue) + quick actions + recent projects + onboarding tour for new users
- Projects: list with search/filter, 5-step **new project wizard** (Client → Deliverables → Scope → Review → Confirm), detail page with 5 tabs (Deliverables, Messages, Checklist, Invoices, Team) + status state machine
- Clients: list grid + inline create form + delete
- Invoices: table view, create form with multi-line items, send/mark-paid actions
- **AI Editor (Screen 24)**: faithful replication – left AI clips panel (8 mocked moments with confidence/category), center preview canvas (aspect-ratio-aware) + toolbar (Trim/Speed/Resize/Filters/FX/Text/Trans/Audio/AI-Edit) + timeline with video/audio/text tracks and clickable clips, right properties panel (Clip/Export tabs, aspect picker, AI Auto-Edit), upload state with file picker → payment modal (MOCKED) → simulated processing progress → edit state, AI auto-edit assembles 60s TikTok cut, export button (MOCKED)
- Community: Feed (post, like, comment) + Members tab + Star sending (1 per recipient per day, +10 pts)
- Profile: editable display name, username, company, bio, social handles, photo/logo URLs, theme persistence
- CEO Back Office: 4 tabs – Overview (stats), Users (badge assignment), Projects (override modal w/ mandatory note), Activity Log
- Help Bot: floating film-reel bubble, expandable chat panel, FAQ keyword matching, fallback to email support@reellabstudio.com
- Dark/Light mode toggle (persisted to user profile + localStorage)
- Onboarding tour (7-step spotlight, dismissible)
- Mobile responsive: top nav collapses to bottom tab bar < 768px
- Custom data-testid on every interactive element

## Mocked / deferred (clearly indicated to user)
- **Stripe payments**: fully mocked (payment modal completes instantly; invoice "Mark Paid (mock)" button; AI upload payment screen)
- **Real AI video processing**: replaced with deterministic clip generator (8 preset moments)
- **Real video upload to storage**: only metadata stored
- **Export**: shows toast only, no actual export
- DMs, email/SMS notifications, affiliate dashboard, pre-production toolkit (shot lists, call sheets), team activity log UI, events – not in scope for v1

## Backlog / future
- P0: Real Stripe Checkout + webhook handler when keys available
- P0: Real AI integration (Replicate/Whisper/Gemini) for transcript + moment scoring
- P1: Direct messages, notifications system
- P1: Pre-production toolkit (Brief, Shot List, Call Sheet generators)
- P1: Team invites + per-project role assignment UI
- P2: Affiliate referral dashboard with gold badge auto-granting
- P2: Events (CEO-created invitations)
- P2: Mobile native apps

## Smart business enhancements
- Stars + 10-point recipient system creates retention/recognition loop
- "Studio Verified" blue badge funnels users toward paid Studio plan (auto-assigned when payment integration is real)
- Affiliate "Gold ★" badge ready for revenue-sharing program activation
