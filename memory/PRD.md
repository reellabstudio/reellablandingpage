# ReelLab Studio – PRD (v6 — DEPLOYED + LAUNCH-READY)

## Production
- **Live**: https://reellabstudio.com (deployed)
- **Preview**: https://reellab-backoffice.preview.emergentagent.com
- **Stripe**: LIVE (restricted key `rk_live_...`, real charges flow)
- **SMTP**: LIVE (Google Workspace, `support@reellabstudio.com`; `hello@` aliased, `sales@` separate)
- **LLM**: LIVE (Emergent Universal Key, Claude Sonnet 4-6 for caption AI)
- **AI Video Editor**: still simulated preset (P2 backlog)

## Tech stack
- React 19, React Router 7, Axios, lucide-react
- FastAPI, Motor (MongoDB), emergentintegrations (Stripe + Claude)
- Tailwind / custom CSS + Playfair Display + DM Mono

## Implemented modules

### Public
- Landing, Pricing, Founder Checkout (A/B-tested, real Stripe), Forgot/Reset Password, Legal Gate, 404

### Client / Studio Owner app
- Dashboard, Projects (5-step wizard + detail), **Content Studio (NEW)** — calendar + AI captions, AI Editor (simulated), Invoices (READ-ONLY for clients — paid history only), Community, Profile, Sparks (Affiliate)
- Clients tab REMOVED from non-CEO nav. Only CEO sees Clients.
- Register requires first_name + last_name (separate fields, both required). display_name auto-derived.

### CEO Back Office (15 sections)
Platform Overview · Activity Log · User Management · All Projects · Pricing · Waitlist · Founder Circle · Founder A/B · Dummy Data · FAQ Editor · Email Templates · Affiliates · Moderation · **Access Control (Coupons + Promotional + Group Tags)** · Platform Settings

### Coupon system (server-validated)
- Discount types: Percent (1–99%) | 100% Free (bypasses Stripe)
- Assignment: Email-bound | Shareable code
- Duration: Fixed (days/months) | Specific end date | Unlimited
- Usage limit: Single | Limited (count) | Unlimited
- **NEW**: Promotional flag + Group/Tag label (Founders, VIP, Holiday Sale)
- Per-coupon: toggle Active/Inactive, edit, delete
- Redemption log: user email, coupon, plan, discount, timestamp, access expiry

### Content Studio (NEW)
- Monthly / weekly calendar view, click-to-schedule
- Platform pills: Instagram, TikTok, YouTube, X, Facebook
- AI Caption Generator (Claude Sonnet 4-6) — returns 3 platform-optimised options with hashtags + CTAs
- Available inline per-post AND as a standalone generator modal
- Post fields: title, caption, platform, scheduled date/time, media URL, notes
- Owner-scoped — each user only sees their own posts

### Backend (80+ endpoints behind /api)
- Auth: register (first+last required) / login / me / legal-accept / password-reset
- Content: /content/posts (CRUD owner-scoped) / /content/caption/generate (Claude)
- Invoices: list (CEO=all, clients=synthesized from paid txs) / CRUD CEO-only / pay
- Coupons: /ceo/coupons CRUD + /coupons/validate + /ceo/coupon-redemptions
- A/B test: /public/ab/impression + /ceo/ab-test/founder-checkout
- Payments: /payments/checkout (live Stripe, coupon-aware, 100%-off bypass)
- Public: /public/payment-mode + /public/faq + /public/contact-emails + /waitlist + /founder-circle

## Mock removal audit (v6)
Verified clean: /invoices, /content-studio, /editor, /founder-checkout — NO "MOCKED" text anywhere visible to users.

## Test coverage
- Iteration 1–9: scaffolding → MVP → Stripe LIVE → SMTP LIVE → Content Studio → v9 full rebuild
- Iteration 10 (v10 payment modal + Stripe hardening — Feb 2026): 13/13 backend pytest; 100% frontend on testable surface. Removed legacy $19 per-upload modal. Modal now fires ONLY on explicit Select Plan / Add-On OR limit exhaustion. Free-tier "feature locked" variant with Upgrade CTAs. Webhook hardened: empty/bad signature → 400, idempotency via webhook_events collection, lifecycle handlers for invoice.payment_failed + customer.subscription.deleted + customer.subscription.updated. Studio tier never sees modal (guard at limit==-1).
- Iteration 11 (Feb 2026 — Gemini Nano Banana + Connectors): 24/24 backend pytest, 100% frontend on both new surfaces. AI cover-art generator inside Content Studio PostModal (Gemini 3.1 Flash Image Preview via EMERGENT_LLM_KEY → returns base64 data URL since S3 bucket has block-public-access on; data URL is auto-stored as media_url and previewed inline). ConnectorsModal for IG/TT/YT/X/FB with: real OAuth scaffolding for YouTube (Google) + IG/FB (Meta single app) — returns setup_required JSON with the exact missing env var names + redirect_uri when GOOGLE_OAUTH_* / META_OAUTH_* are unset; manual handle entry fallback for all platforms; TikTok + X manual-only by design. Studio-plan-only gate enforced server-side on both POST /api/connectors and /api/connectors/oauth/{platform}/start. Profile page now has 'Manage connectors' entrypoint.

## Backlog (P2, post-launch)
- Real AI moment detection for /editor (Replicate / Whisper + LLM scoring)
- Affiliate payout automation (Stripe Connect, $25 threshold)
- Wire real OAuth credentials: set GOOGLE_OAUTH_CLIENT_ID/SECRET + META_OAUTH_CLIENT_ID/SECRET in backend/.env, register redirect URI `https://reellabstudio.com/api/connectors/oauth/{platform}/callback` in each provider's developer console
- TikTok + X OAuth (manual handle entry only for now)
- Enable public-read on `ai/img/` prefix in S3 bucket (or front with CloudFront) so generated cover art gets a permanent URL instead of base64 data URL
- Field-level encryption for stored connector access_token / refresh_token
- Content Studio: cross-platform publishing via Buffer/Hootsuite APIs
- Pre-production toolkit (Brief / Shot List / Call Sheet)
- DMs, push notifications
- Team invites per project
- Mobile native apps
- Plan-upgrade checkout flow (currently only Founder Circle has a UI; Solo/Creator/Studio coupon UI awaits a Pricing checkout flow)
- Refactor large files: server.py → modular routers; AIEditor.jsx, FounderCheckout.jsx → smaller components
- Move auth tokens from localStorage → httpOnly cookies (XSS hardening)
- Audit React hook dependency warnings (ContentStudio.jsx, Dashboard.jsx, FounderCheckout.jsx)
