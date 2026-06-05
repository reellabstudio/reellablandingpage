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
- Iteration 1–8: scaffolding → MVP → Stripe LIVE → SMTP LIVE → Content Studio → A/B founder pricing
- Iteration 9 (v9 — Feb 2026): **FULL REBUILD**. Backend 25/25 pytest. 100% frontend after 2 follow-up fixes (token persist on Landing signup + dynamic AI Edit modal message). End-to-end signup → onboarding → dashboard verified. Real integrations live (AWS S3, OpenAI Whisper, Shotstack, Anthropic). Free tier hard limits enforced. AI Edit add-ons ($12/$30/$50) wired through Stripe.

## Backlog (P2, post-launch)
- Real AI moment detection for /editor (Replicate / Whisper + LLM scoring)
- Affiliate payout automation (Stripe Connect, $25 threshold)
- Stripe webhook signing secret (`whsec_...`) — currently optional
- Content Studio: cross-platform publishing via Buffer/Hootsuite APIs
- Pre-production toolkit (Brief / Shot List / Call Sheet)
- DMs, push notifications
- Team invites per project
- Mobile native apps
- Plan-upgrade checkout flow (currently only Founder Circle has a UI; Solo/Creator/Studio coupon UI awaits a Pricing checkout flow)
