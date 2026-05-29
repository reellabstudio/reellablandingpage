"""ReelLab Studio v3 backend tests — Stripe (mocked), affiliate, password reset,
public contact emails, CEO payments/affiliates-overview endpoints."""
import os
import uuid
import time
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ORIGIN = BASE_URL  # used as origin_url for checkout

CEO_EMAIL = "ceo@reellabstudio.com"
CEO_PASSWORD = "ReelLabceo26!"


def auth_h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session")
def ceo_token():
    r = requests.post(f"{API}/auth/login", json={"email": CEO_EMAIL, "password": CEO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def fresh_user():
    """Register a fresh user used for affiliate + password-reset tests."""
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_v3_{uniq}@example.com",
        "password": "OrigPass123!",
        "display_name": f"V3 {uniq}",
        "username": f"v3_{uniq}",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    body["password"] = payload["password"]
    return body


# ───────── Stripe (mocked) ─────────
class TestStripeMockedFlow:
    def test_founder_checkout_init(self):
        r = requests.post(f"{API}/payments/checkout", json={
            "package_id": "founder_circle",
            "origin_url": ORIGIN,
            "name": "Founder Test",
            "email": f"TEST_fchk_{uuid.uuid4().hex[:6]}@example.com",
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mocked"] is True
        assert d["session_id"].startswith("cs_mock_")
        assert "/checkout/mock" in d["url"]

    def test_checkout_status_auto_finalizes_on_first_poll(self):
        # init
        email = f"TEST_pstat_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/payments/checkout", json={
            "package_id": "founder_circle",
            "origin_url": ORIGIN,
            "name": "Poll Test",
            "email": email,
        }, timeout=15)
        sid = r.json()["session_id"]
        # First poll: mocked path auto-finalizes
        s = requests.get(f"{API}/payments/status/{sid}", timeout=15)
        assert s.status_code == 200
        body = s.json()
        assert body["payment_status"] == "paid"
        assert body["amount"] == 1.00

    def test_mock_complete_endpoint(self):
        r = requests.post(f"{API}/payments/checkout", json={
            "package_id": "creator_monthly",
            "origin_url": ORIGIN,
            "name": "Mock Complete",
            "email": f"TEST_mc_{uuid.uuid4().hex[:6]}@example.com",
        }, timeout=15).json()
        sid = r["session_id"]
        r2 = requests.post(f"{API}/payments/mock-complete/{sid}", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["ok"] is True
        # status reflects paid
        s = requests.get(f"{API}/payments/status/{sid}", timeout=15).json()
        assert s["payment_status"] == "paid"

    def test_invalid_package_rejected(self):
        r = requests.post(f"{API}/payments/checkout", json={
            "package_id": "bogus_pkg",
            "origin_url": ORIGIN,
        }, timeout=10)
        assert r.status_code in (400, 422)

    def test_webhook_returns_200_in_mock(self):
        r = requests.post(f"{API}/webhook/stripe", data=b"{}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True


# ───────── Affiliate ─────────
class TestAffiliateEndpoints:
    def test_affiliate_me_requires_auth(self):
        r = requests.get(f"{API}/affiliate/me", timeout=10)
        assert r.status_code in (401, 403)

    def test_affiliate_me_returns_shape(self, fresh_user):
        r = requests.get(f"{API}/affiliate/me", headers=auth_h(fresh_user["token"]), timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d["referral_code"], str)
        assert len(d["referral_code"]) == 6
        assert d["referral_code"] == d["referral_code"].upper()
        assert d["referral_link"].endswith(f"?ref={d['referral_code']}")
        assert isinstance(d["sparks"], list)
        for k in ("active_sparks", "cancelled_sparks", "total_earned", "mtd", "qtd", "ytd"):
            assert k in d
        assert isinstance(d["monthly_series"], list)
        assert len(d["monthly_series"]) == 12
        assert d["commission_rates"] == {"creator": 0.15, "studio": 0.30}

    def test_affiliate_lookup_valid_and_invalid(self, fresh_user):
        code = requests.get(f"{API}/affiliate/me", headers=auth_h(fresh_user["token"]), timeout=10).json()["referral_code"]
        r = requests.get(f"{API}/affiliate/lookup/{code}", timeout=10)
        assert r.status_code == 200
        assert r.json()["valid"] is True
        r2 = requests.get(f"{API}/affiliate/lookup/ZZZZZZ", timeout=10)
        assert r2.status_code == 200
        assert r2.json()["valid"] is False


# ───────── Founder paid flow w/ referral ─────────
class TestFounderPaidFlow:
    def test_founder_checkout_creates_records(self, fresh_user, ceo_token):
        # Use fresh user's referral code
        code = requests.get(f"{API}/affiliate/me", headers=auth_h(fresh_user["token"]), timeout=10).json()["referral_code"]
        email = f"TEST_fpaid_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/payments/checkout", json={
            "package_id": "founder_circle",
            "origin_url": ORIGIN,
            "name": "Founder Paid",
            "email": email,
            "creator_type": "podcaster",
            "handle": "@fpaid",
            "referral_code": code,
        }, timeout=15)
        assert r.status_code == 200
        sid = r.json()["session_id"]
        # Poll to finalize
        s = requests.get(f"{API}/payments/status/{sid}", timeout=15).json()
        assert s["payment_status"] == "paid"
        # Verify founder record created
        founders = requests.get(f"{API}/ceo/founders", headers=auth_h(ceo_token), timeout=10).json()["founders"]
        match = next((f for f in founders if f["email"] == email.lower()), None)
        assert match is not None, f"Founder record missing for {email}"
        assert match.get("paid") is True
        assert match.get("first_month_free") is True
        # Verify affiliate_referral created (visible via /affiliate/me sparks for the referring user)
        me = requests.get(f"{API}/affiliate/me", headers=auth_h(fresh_user["token"]), timeout=10).json()
        spark = next((sp for sp in me["sparks"] if sp.get("referred_email") == email.lower()), None)
        assert spark is not None, "affiliate_referrals row not created for founder referral"
        assert spark["status"] == "active"
        assert spark["plan_type"] == "founder"


# ───────── Creator subscription commission ─────────
class TestCreatorCommission:
    def test_creator_monthly_creates_commission(self, fresh_user):
        code = requests.get(f"{API}/affiliate/me", headers=auth_h(fresh_user["token"]), timeout=10).json()["referral_code"]
        email = f"TEST_ccomm_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/payments/checkout", json={
            "package_id": "creator_monthly",
            "origin_url": ORIGIN,
            "name": "Creator Comm",
            "email": email,
            "referral_code": code,
        }, timeout=15)
        sid = r.json()["session_id"]
        # First poll auto-finalizes
        s = requests.get(f"{API}/payments/status/{sid}", timeout=15).json()
        assert s["payment_status"] == "paid"
        # Re-poll the affiliate dash and look for commission
        me = requests.get(f"{API}/affiliate/me", headers=auth_h(fresh_user["token"]), timeout=10).json()
        # total_earned should include 49*0.15 = 7.35 (at minimum)
        assert me["total_earned"] >= 7.35
        # mtd should reflect this month
        assert me["mtd"] >= 7.35
        # find this referral as active
        spark = next((sp for sp in me["sparks"] if sp.get("referred_email") == email.lower()), None)
        assert spark is not None
        assert spark["plan_type"] == "creator"


# ───────── Password reset ─────────
class TestPasswordReset:
    def test_full_reset_flow(self, fresh_user):
        # 1) request
        r = requests.post(f"{API}/auth/password-reset/request", json={"email": fresh_user["user"]["email"]}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert "dev_reset_link" in body, "expected dev_reset_link when SMTP_HOST not set"
        link = body["dev_reset_link"]
        # extract token
        token = link.split("token=")[-1]
        assert len(token) > 10

        # 2) confirm
        new_pw = "NewPass456!"
        r2 = requests.post(f"{API}/auth/password-reset/confirm", json={"token": token, "new_password": new_pw}, timeout=15)
        assert r2.status_code == 200, r2.text
        assert r2.json()["ok"] is True

        # 3) login with new password works
        r3 = requests.post(f"{API}/auth/login", json={"email": fresh_user["user"]["email"], "password": new_pw}, timeout=15)
        assert r3.status_code == 200, r3.text

        # 4) Old password fails
        r4 = requests.post(f"{API}/auth/login", json={"email": fresh_user["user"]["email"], "password": fresh_user["password"]}, timeout=15)
        assert r4.status_code in (400, 401)

        # 5) Token reuse fails
        r5 = requests.post(f"{API}/auth/password-reset/confirm", json={"token": token, "new_password": "Another123!"}, timeout=15)
        assert r5.status_code == 400

    def test_unknown_email_returns_ok_no_leak(self):
        # Should not leak which emails exist
        r = requests.post(f"{API}/auth/password-reset/request", json={"email": f"nonexistent_{uuid.uuid4().hex[:6]}@example.com"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # No dev_reset_link should be returned for unknown email
        assert "dev_reset_link" not in r.json()


# ───────── Public endpoints ─────────
class TestPublicContactAndHelp:
    def test_contact_emails(self):
        r = requests.get(f"{API}/public/contact-emails", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("hello", "support", "sales", "ceo"):
            assert k in d
            assert "@" in d[k]

    def test_public_help_query(self):
        r = requests.post(f"{API}/public/help/query", json={"query": "How do I get started?"}, timeout=15)
        assert r.status_code == 200


# ───────── CEO endpoints (v3) ─────────
class TestCEOv3:
    def test_ceo_payments_list(self, ceo_token):
        r = requests.get(f"{API}/ceo/payments", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "transactions" in d
        assert isinstance(d["transactions"], list)
        # Verify NO mongodb _id leakage
        for t in d["transactions"][:5]:
            assert "_id" not in t

    def test_ceo_affiliates_overview(self, ceo_token):
        r = requests.get(f"{API}/ceo/affiliates-overview", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "affiliates" in d
        assert "total_paid" in d
        for row in d["affiliates"][:5]:
            for k in ("referral_code", "affiliate_name", "total_earned", "commission_count", "active_sparks"):
                assert k in row

    def test_ceo_endpoints_block_non_ceo(self, fresh_user):
        # fresh_user is a studio_owner — must get 403 on CEO endpoints
        # (note: fresh_user password has been changed by password reset test — re-login)
        for path in ("/ceo/payments", "/ceo/affiliates-overview"):
            r = requests.get(f"{API}{path}", headers=auth_h(fresh_user["token"]), timeout=10)
            assert r.status_code == 403, f"{path} expected 403 got {r.status_code}"
