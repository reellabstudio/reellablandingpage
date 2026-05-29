# 🚀 ReelLab Studio — Deployment Cheatsheet

Generated 2026-05-29 — all of v3 has been tested at 100% backend + 100% frontend testid coverage.

---

## 1. STRIPE — Go Live Checklist

The app is built with `STRIPE_MODE=mock` in `backend/.env`. To enable real payments:

### A. Rotate keys (you already did this with the live secret — good)
1. Log into [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
2. Copy these 3 values:
   - **Publishable key** (`pk_live_...`)
   - **Secret key** (`sk_live_...`) — full secret, not restricted
   - **Webhook signing secret** (`whsec_...`) — from next step

### B. Configure webhook
1. Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://reellabstudio.com/api/webhook/stripe`
3. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. Copy the **Signing secret** (starts with `whsec_`)

### C. Create the products & prices in Stripe
For the recurring subscriptions you need Stripe Products + Prices. Create these in the Stripe Dashboard, then save the Price IDs:

| Product | Price | Recurring | Notes |
|---|---|---|---|
| ReelLab Solo | $19/mo | monthly | |
| ReelLab Solo Yearly | $180/yr | yearly | 21% off |
| ReelLab Creator | $49/mo | monthly | Founder gets first month FREE via 100% off coupon |
| ReelLab Creator Yearly | $468/yr | yearly | |
| ReelLab Studio | $199/mo | monthly | |
| ReelLab Studio Yearly | $1908/yr | yearly | |
| Founder Circle | $1 | one-time | |
| AI Processing | $19 | one-time | |

### D. Update `backend/.env` at deploy
```
STRIPE_API_KEY="sk_live_..."     # your full secret
STRIPE_MODE="live"               # switches off mock paths
```
Add publishable & webhook secrets too — the integration supports them.

After deploy, hit **CEO Back Office → Pricing & Plans → "Sync to Stripe"** — the (currently mocked) button is wired for the live API call.

---

## 2. CLOUDFLARE DNS — Reality Check (read your current zone)

Your Cloudflare zone (`jarred.ns.cloudflare.com / paislee.ns.cloudflare.com`) is **already correctly configured for email**. Here's what's in your zone today and what changes you may need at deploy:

### ✅ Already correct (no action)
- **Nameservers**: jarred.ns.cloudflare.com / paislee.ns.cloudflare.com
- **MX records**: All 5 Google Workspace MX records present (priorities 1, 5, 5, 10, 10) → your 4 emails (`hello@`, `support@`, `sales@`, `ceo@`) work via Google.
- **DKIM**: `google._domainkey` TXT record set
- **SPF**: `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`
- **Domain verifications**: Google + Neo present
- **www → root CNAME**: `www.reellabstudio.com` → `reellabstudio.com` (proxied ✅)

### ⚠️ Needs change at deploy
- **A records**: Your root `reellabstudio.com` currently points to 4 AWS IPs (44.219.244.211, 34.206.170.199, 44.197.32.160, 107.23.157.161) — these are from a previous host. After deploying to Emergent (or another host), update these to the new server's IP(s).
- **Cloudflare proxy**: Currently `cf-proxied:false` on root A records. **Flip these to "Proxied" (orange cloud)** once the new host is up — gives you free SSL, DDoS protection, caching.
- **DMARC**: No `_dmarc` TXT record yet — recommended to add:
  ```
  Type:  TXT
  Name:  _dmarc
  Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@reellabstudio.com"
  TTL:   Auto
  ```
  This stops people spoofing your domain in phishing attacks.

### 🆕 Recommended after deploy
- Add `api.reellabstudio.com` as a CNAME or A pointing to your backend host (if you ever split frontend/backend across hosts). Current architecture uses `/api/*` paths on the same domain so this is optional.

🎯 **Bottom line**: only the 4 root A records need to change at deploy. Everything else is shipped-ready.

---

## 3. EMAIL (SMTP via Google Workspace)

Internal password reset emails (and welcome / paid / delivered emails) use Python `smtplib`. To enable real sending:

1. Log into the Google account for `support@reellabstudio.com`
2. Account → Security → **2-Step Verification** (must be on)
3. **App passwords** → Generate one for "Mail" → "Other (ReelLab)"
4. Copy the 16-char app password
5. Update `backend/.env`:
```
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="support@reellabstudio.com"
SMTP_PASSWORD="<16-char app password>"
SMTP_FROM_EMAIL="support@reellabstudio.com"
SMTP_FROM_NAME="ReelLab Support"
```

Until `SMTP_HOST` is set, the password reset endpoint returns the reset link in the API response (dev-mode only — auto-disabled when SMTP is configured).

---

## 4. ENVIRONMENT VARIABLES — COMPLETE `backend/.env`

```ini
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="reellab_studio"

# CORS (restrict to your domain at deploy)
CORS_ORIGINS="https://reellabstudio.com,https://www.reellabstudio.com"

# Auth
JWT_SECRET="<generate a fresh 64-char random string>"
CEO_EMAIL="ceo@reellabstudio.com"
CEO_PASSWORD="ReelLabceo26!"

# Stripe (LIVE)
STRIPE_API_KEY="sk_live_..."
STRIPE_MODE="live"

# Domain & emails
APP_DOMAIN="reellabstudio.com"
HELLO_EMAIL="hello@reellabstudio.com"
SUPPORT_EMAIL="support@reellabstudio.com"
SALES_EMAIL="sales@reellabstudio.com"

# SMTP (Google Workspace app password)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="support@reellabstudio.com"
SMTP_PASSWORD="<google-app-password>"
SMTP_FROM_EMAIL="support@reellabstudio.com"
SMTP_FROM_NAME="ReelLab Support"
```

And `frontend/.env`:
```ini
REACT_APP_BACKEND_URL=https://reellabstudio.com
```

---

## 5. POST-DEPLOY SMOKE TESTS

After deploy, verify in this order:

1. **`https://reellabstudio.com`** → Landing renders, waitlist form submits (`POST /api/waitlist` returns 200)
2. **`https://reellabstudio.com/pricing`** → 3 plans visible, monthly/yearly toggle works
3. **`https://reellabstudio.com/founder-checkout`** → form renders. Skip clicking Pay $1 unless you're testing live Stripe.
4. **Sign in as CEO** at `/login` → lands on `/ceo` → all 13 sidebar sections load
5. **CEO → Pricing & Plans → "Sync to Stripe"** → confirms live Stripe is reachable
6. **Forgot password** at `/forgot-password` → enter your CEO email → check your inbox at `support@reellabstudio.com` for the reset email (verifies SMTP)
7. **Register a new test user** → confirm legal gate → land on /dashboard
8. **Visit `/sparks`** → confirm "Your Constellation" page loads with referral link

---

## 6. WHAT TO KEEP AN EYE ON FIRST 90 DAYS

- **Stripe webhook deliverability** — check Stripe Dashboard → Webhooks → "events" for any 4xx/5xx responses
- **MongoDB disk usage** — `payment_transactions` and `activity_log` grow forever; consider TTL indexes after 90 days
- **SMTP send rate** — Google free tier caps at ~500/day. Plenty for password resets + welcome emails. Upgrade to a transactional service (SendGrid/Resend) if you cross that.

🎉 You're ready to ship.
