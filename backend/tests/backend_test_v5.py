"""ReelLab Studio v5 backend tests — Stripe LIVE, SMTP LIVE, A/B test analytics.

CRITICAL: Do NOT actually complete a real Stripe payment. We only verify that
session creation returns a real cs_live_ id and that ab_variant + referral_code
are correctly propagated into payment_transactions.metadata.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
CEO_EMAIL = "ceo@reellabstudio.com"
CEO_PASSWORD = os.environ.get("CEO_PASSWORD", "")


def auth_h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session")
def ceo_token():
    r = requests.post(f"{API}/auth/login", json={"email": CEO_EMAIL, "password": CEO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def fresh_user():
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_v5_{uniq}@example.com",
        "password": "Pass123!",
        "display_name": f"V5 {uniq}",
        "username": f"v5_{uniq}",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    body["password"] = payload["password"]
    return body


# ───── Stripe / payment mode ─────
class TestPaymentMode:
    def test_payment_mode_is_live(self):
        r = requests.get(f"{API}/public/payment-mode", timeout=10)
        assert r.status_code == 200
        assert r.json() == {"stripe_live": True}


class TestLiveStripeCheckout:
    def test_founder_checkout_returns_real_cs_live_url(self, ceo_token):
        ref = "T5ABCD"
        ab = "a"
        email = f"TEST_v5live_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/payments/checkout", json={
            "package_id": "founder_circle",
            "origin_url": BASE_URL,
            "name": "V5 Live",
            "email": email,
            "referral_code": ref,
            "ab_variant": ab,
        }, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mocked"] is False
        assert d["session_id"].startswith("cs_live_"), d
        assert "checkout.stripe.com/c/pay/cs_live_" in d["url"], d["url"]

        # Verify metadata persisted in mongo via /ceo/payments
        sid = d["session_id"]
        plist = requests.get(f"{API}/ceo/payments", headers=auth_h(ceo_token), timeout=10).json()
        tx = next((t for t in plist["transactions"] if t.get("session_id") == sid), None)
        assert tx is not None, "tx not found in /ceo/payments"
        md = tx.get("metadata") or {}
        assert md.get("ab_variant") == ab
        assert md.get("referral_code") == ref
        # No mongo _id leak
        assert "_id" not in tx

    def test_variant_b_propagates(self, ceo_token):
        email = f"TEST_v5liveB_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/payments/checkout", json={
            "package_id": "founder_circle",
            "origin_url": BASE_URL,
            "name": "V5 LiveB",
            "email": email,
            "ab_variant": "b",
        }, timeout=20).json()
        sid = r["session_id"]
        assert sid.startswith("cs_live_")
        plist = requests.get(f"{API}/ceo/payments", headers=auth_h(ceo_token), timeout=10).json()
        tx = next((t for t in plist["transactions"] if t.get("session_id") == sid), None)
        assert tx is not None
        assert (tx.get("metadata") or {}).get("ab_variant") == "b"


# ───── A/B Impression endpoint ─────
class TestABImpression:
    def test_valid_variants(self):
        for v in ("a", "b"):
            r = requests.post(f"{API}/public/ab/impression", json={
                "page": "founder-checkout", "variant": v, "referral_code": "X1Y2Z3",
            }, timeout=10)
            assert r.status_code == 200, r.text
            assert r.json() == {"ok": True}

    def test_invalid_variant_400(self):
        r = requests.post(f"{API}/public/ab/impression", json={
            "page": "founder-checkout", "variant": "c",
        }, timeout=10)
        assert r.status_code == 400

    def test_missing_fields_422(self):
        r = requests.post(f"{API}/public/ab/impression", json={}, timeout=10)
        assert r.status_code in (400, 422)


# ───── CEO A/B analytics ─────
class TestCEOABAnalytics:
    def test_requires_auth_returns_401(self):
        r = requests.get(f"{API}/ceo/ab-test/founder-checkout", timeout=10)
        assert r.status_code in (401, 403)

    def test_non_ceo_returns_403(self, fresh_user):
        r = requests.get(f"{API}/ceo/ab-test/founder-checkout",
                         headers=auth_h(fresh_user["token"]), timeout=10)
        assert r.status_code == 403

    def test_shape(self, ceo_token):
        r = requests.get(f"{API}/ceo/ab-test/founder-checkout",
                         headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "variants" in d and isinstance(d["variants"], list)
        assert len(d["variants"]) == 2
        keys_seen = set()
        for v in d["variants"]:
            for k in ("variant", "impressions", "conversions",
                      "conversion_rate", "revenue", "by_referral_code"):
                assert k in v, f"missing {k}"
            assert isinstance(v["by_referral_code"], dict)
            keys_seen.add(v["variant"])
        assert keys_seen == {"a", "b"}
        for k in ("total_impressions", "total_conversions", "untracked_conversions"):
            assert k in d

    def test_by_referral_code_bucketing(self, ceo_token):
        """Seed an impression + insert a paid tx via DB-equivalent (we use checkout API
        + can't easily mark live tx as paid). Instead, verify that the impressions
        side at least registers a referral code by checking the analytics still
        returns the right shape and impressions are counted."""
        ref = f"T5REF{uuid.uuid4().hex[:2].upper()}"
        # Send 2 impressions for variant a with this referral
        for _ in range(2):
            r = requests.post(f"{API}/public/ab/impression", json={
                "page": "founder-checkout", "variant": "a", "referral_code": ref,
            }, timeout=10)
            assert r.status_code == 200
        # Verify analytics endpoint still serves correctly (impressions counted globally)
        ana = requests.get(f"{API}/ceo/ab-test/founder-checkout",
                           headers=auth_h(ceo_token), timeout=10).json()
        a_imps = next(v["impressions"] for v in ana["variants"] if v["variant"] == "a")
        assert a_imps >= 2


# ───── SMTP password reset (LIVE) ─────
class TestPasswordResetSMTPLive:
    def test_ceo_reset_no_dev_link(self):
        r = requests.post(f"{API}/auth/password-reset/request",
                          json={"email": CEO_EMAIL}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        # SMTP is configured → dev_reset_link MUST NOT be present
        assert "dev_reset_link" not in d, f"dev_reset_link leaked in live SMTP mode: {d}"

    def test_unknown_email_no_leak(self):
        r = requests.post(f"{API}/auth/password-reset/request",
                          json={"email": f"nonex_{uuid.uuid4().hex[:6]}@example.com"}, timeout=20)
        assert r.status_code == 200
        assert "dev_reset_link" not in r.json()


# ───── Regression smoke ─────
class TestRegressionSmoke:
    def test_contact_emails(self):
        r = requests.get(f"{API}/public/contact-emails", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("hello", "support", "sales", "ceo"):
            assert "@" in d[k]

    def test_help_query(self):
        r = requests.post(f"{API}/public/help/query",
                          json={"query": "How do I get started?"}, timeout=20)
        assert r.status_code == 200

    def test_affiliate_me(self, fresh_user):
        r = requests.get(f"{API}/affiliate/me",
                         headers=auth_h(fresh_user["token"]), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert len(d["referral_code"]) == 6

    def test_ceo_payments_no_id_leak(self, ceo_token):
        r = requests.get(f"{API}/ceo/payments",
                         headers=auth_h(ceo_token), timeout=10).json()
        for t in r["transactions"][:10]:
            assert "_id" not in t
