"""Iteration 7 backend regression tests — coupon validate, payments/checkout with coupon, redemption logging."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://reellab-backoffice.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CEO_EMAIL = "ceo@reellabstudio.com"
CEO_PASSWORD = os.environ.get("CEO_PASSWORD", "")
STUDIO_EMAIL = "jane.doe.test@reellabstudio.com"
STUDIO_PASSWORD = "testpass123"


@pytest.fixture(scope="module")
def studio_token():
    r = requests.post(f"{API}/auth/login", json={"email": STUDIO_EMAIL, "password": STUDIO_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def ceo_token():
    r = requests.post(f"{API}/auth/login", json={"email": CEO_EMAIL, "password": CEO_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ─── /api/coupons/validate (public) ───
class TestCouponValidate:
    def test_launch50_valid(self):
        r = requests.post(f"{API}/coupons/validate", json={"code": "LAUNCH50", "plan": "creator"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["valid"] is True
        assert d["code"] == "LAUNCH50"
        assert d["discount_type"] in ("percent", "percentage")
        assert d["discount_value"] == 50
        assert d["plan"] == "creator"

    def test_freecreator_valid(self):
        r = requests.post(f"{API}/coupons/validate", json={"code": "FREECREATOR", "plan": "creator"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["valid"] is True
        assert d["code"] == "FREECREATOR"
        assert d["discount_type"] == "free"
        assert d["plan"] == "creator"

    def test_invalid_code(self):
        r = requests.post(f"{API}/coupons/validate", json={"code": "NOSUCHCODE", "plan": "creator"})
        assert r.status_code == 200
        d = r.json()
        assert d["valid"] is False
        assert "reason" in d

    def test_cross_plan_rejected(self):
        r = requests.post(f"{API}/coupons/validate", json={"code": "LAUNCH50", "plan": "studio"})
        assert r.status_code == 200
        d = r.json()
        assert d["valid"] is False
        assert "creator" in d["reason"].lower() or "only applies" in d["reason"].lower()

    def test_lowercase_normalized(self):
        r = requests.post(f"{API}/coupons/validate", json={"code": "launch50", "plan": "creator"})
        assert r.status_code == 200
        assert r.json()["valid"] is True


# ─── /api/payments/checkout with coupon ───
class TestPaymentsCheckoutCoupon:
    def test_freecreator_returns_free_true(self, studio_token):
        r = requests.post(
            f"{API}/payments/checkout",
            headers={"Authorization": f"Bearer {studio_token}"},
            json={
                "package_id": "creator_monthly",
                "origin_url": BASE_URL,
                "name": "Jane Doe",
                "email": STUDIO_EMAIL,
                "coupon_code": "FREECREATOR",
            },
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("free") is True
        assert "session_id" in d
        assert d["session_id"].startswith("cs_free_")
        # success_url should point to /checkout/success or /dashboard
        assert "url" in d

    def test_redemption_logged_in_ceo_view(self, ceo_token):
        # Check that FREECREATOR redemption was logged
        r = requests.get(
            f"{API}/ceo/coupon-redemptions",
            headers={"Authorization": f"Bearer {ceo_token}"},
        )
        assert r.status_code == 200
        rows = r.json()["redemptions"]
        # Find any FREECREATOR redemption
        free_redemptions = [x for x in rows if x.get("coupon_code") == "FREECREATOR"]
        assert len(free_redemptions) >= 1, f"Expected FREECREATOR redemption to be logged. Rows: {rows[:3]}"

    def test_launch50_real_stripe_session(self, studio_token):
        """50% off should return a real Stripe URL (NOT actually completing payment)."""
        r = requests.post(
            f"{API}/payments/checkout",
            headers={"Authorization": f"Bearer {studio_token}"},
            json={
                "package_id": "creator_monthly",
                "origin_url": BASE_URL,
                "name": "Jane Doe",
                "email": STUDIO_EMAIL,
                "coupon_code": "LAUNCH50",
            },
        )
        assert r.status_code == 200, r.text
        d = r.json()
        # Either live Stripe URL or mocked
        if d.get("mocked"):
            assert "/checkout/mock" in d["url"]
        else:
            assert "checkout.stripe.com" in d["url"]
        assert d.get("free") is not True

    def test_invalid_coupon_returns_400(self, studio_token):
        r = requests.post(
            f"{API}/payments/checkout",
            headers={"Authorization": f"Bearer {studio_token}"},
            json={
                "package_id": "creator_monthly",
                "origin_url": BASE_URL,
                "name": "Jane",
                "email": STUDIO_EMAIL,
                "coupon_code": "NOSUCHCODE",
            },
        )
        assert r.status_code == 400


# ─── Regression: register requires first_name+last_name ───
class TestRegisterValidation:
    def test_register_missing_lastname(self):
        import uuid as _u
        r = requests.post(f"{API}/auth/register", json={
            "first_name": "Test",
            "email": f"TEST_v7_{_u.uuid4().hex[:8]}@example.com",
            "username": f"testv7_{_u.uuid4().hex[:6]}",
            "password": "password123",
        })
        # last_name is required
        assert r.status_code in (400, 422), r.text
