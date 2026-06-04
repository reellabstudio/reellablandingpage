"""
Iteration 8 — v8 pricing update tests.
Covers:
- /api/pricing (new defaults + founder block)
- /api/public/founder-status
- /api/payments/checkout founder_tier propagation into payment_transactions metadata
- Cap enforcement code path (count helper sane)
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to backend .env (tests must run with frontend URL ideally)
    raise RuntimeError("REACT_APP_BACKEND_URL env not set for tests")

# Local mongo for verification (test container)
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "reellab")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mongo():
    cli = MongoClient(MONGO_URL)
    yield cli[DB_NAME]
    cli.close()


# ── 1. /api/pricing returns new defaults + founder block ──
class TestPricingEndpoint:
    def test_pricing_returns_v8_defaults(self, api):
        r = api.get(f"{BASE_URL}/api/pricing")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "pricing" in body and "founder" in body
        p = body["pricing"]
        assert p["solo"]["monthly"] == 19.0
        assert p["solo"]["yearly"] == 180.0
        assert p["creator"]["monthly"] == 79.0
        assert p["creator"]["yearly"] == 780.0
        assert p["studio"]["monthly"] == 199.0
        assert p["studio"]["yearly"] == 2028.0

    def test_pricing_founder_block(self, api):
        r = api.get(f"{BASE_URL}/api/pricing")
        f = r.json()["founder"]
        assert f["cap"] == 100
        assert f["entry_fee"] == 1.00
        assert f["tiers"]["creator"]["monthly"] == 49.0
        assert f["tiers"]["studio"]["monthly"] == 149.0
        assert isinstance(f["count"], int)
        assert f["spots_left"] == max(0, 100 - f["count"])
        assert f["available"] == (f["count"] < 100)


# ── 2. /api/public/founder-status ──
class TestFounderStatus:
    def test_founder_status_shape(self, api):
        r = api.get(f"{BASE_URL}/api/public/founder-status")
        assert r.status_code == 200
        b = r.json()
        for k in ("count", "cap", "spots_left", "available"):
            assert k in b
        assert b["cap"] == 100
        assert b["count"] >= 0
        assert b["spots_left"] == max(0, b["cap"] - b["count"])
        assert b["available"] == (b["count"] < b["cap"])

    def test_founder_status_matches_pricing_block(self, api):
        a = api.get(f"{BASE_URL}/api/public/founder-status").json()
        b = api.get(f"{BASE_URL}/api/pricing").json()["founder"]
        assert a["count"] == b["count"]
        assert a["spots_left"] == b["spots_left"]
        assert a["available"] == b["available"]


# ── 3. Checkout founder_tier propagation into mongo metadata ──
class TestFounderTierPropagation:
    def _checkout(self, api, founder_tier=None, email=None):
        payload = {
            "package_id": "founder_circle",
            "origin_url": BASE_URL,
            "name": "TEST Founder",
            "email": email or f"TEST_v8_{uuid.uuid4().hex[:8]}@example.com",
            "creator_type": "fitness",
            "handle": "@testfounder",
        }
        if founder_tier is not None:
            payload["founder_tier"] = founder_tier
        return api.post(f"{BASE_URL}/api/payments/checkout", json=payload), payload

    def test_checkout_studio_tier_propagates(self, api, mongo):
        r, payload = self._checkout(api, founder_tier="studio")
        # Either 200 (created) or 410 if sold out — but per problem statement count is ~3
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "session_id" in data, data
        session_id = data["session_id"]
        # Wait briefly for mongo insertion
        time.sleep(0.5)
        tx = mongo.payment_transactions.find_one({"session_id": session_id})
        assert tx is not None, f"No payment_transactions row for {session_id}"
        meta = tx.get("metadata", {})
        assert meta.get("founder_tier") == "studio", f"Expected studio, got {meta}"
        assert meta.get("package_id") == "founder_circle"
        # Cleanup test row
        mongo.payment_transactions.delete_one({"session_id": session_id})

    def test_checkout_default_tier_is_creator(self, api, mongo):
        r, payload = self._checkout(api, founder_tier=None)
        assert r.status_code == 200, r.text
        session_id = r.json()["session_id"]
        time.sleep(0.5)
        tx = mongo.payment_transactions.find_one({"session_id": session_id})
        assert tx is not None
        meta = tx.get("metadata", {})
        assert meta.get("founder_tier") == "creator", f"Expected creator default, got {meta}"
        mongo.payment_transactions.delete_one({"session_id": session_id})

    def test_checkout_creator_tier_explicit(self, api, mongo):
        r, payload = self._checkout(api, founder_tier="creator")
        assert r.status_code == 200, r.text
        session_id = r.json()["session_id"]
        time.sleep(0.5)
        tx = mongo.payment_transactions.find_one({"session_id": session_id})
        meta = tx.get("metadata", {})
        assert meta.get("founder_tier") == "creator"
        mongo.payment_transactions.delete_one({"session_id": session_id})

    def test_invalid_tier_rejected_by_pydantic(self, api):
        # Literal["creator","studio"] should 422 on bad value
        r = api.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_id": "founder_circle",
            "origin_url": BASE_URL,
            "email": f"TEST_bad_{uuid.uuid4().hex[:6]}@example.com",
            "founder_tier": "platinum",
        })
        assert r.status_code == 422, r.text


# ── 4. Founder cap enforcement (verified by current count not >= 100) ──
class TestFounderCap:
    def test_count_helper_under_cap(self, api):
        b = api.get(f"{BASE_URL}/api/public/founder-status").json()
        # Per problem statement current count ~3
        assert b["count"] < 100, f"Cap should not be reached: count={b['count']}"
        assert b["available"] is True


# ── 5. Pricing migration log present ──
class TestPricingMigration:
    def test_pricing_doc_in_mongo_matches_defaults(self, mongo):
        doc = mongo.settings.find_one({"key": "pricing"})
        assert doc is not None
        val = doc["value"]
        assert val["creator"]["monthly"] == 79.0
        assert val["creator"]["yearly"] == 780.0
        assert val["studio"]["monthly"] == 199.0
        assert val["studio"]["yearly"] == 2028.0


# ── 6. Sanity: regular package checkout still works ──
class TestRegularCheckoutRegression:
    def test_creator_monthly_checkout_creates_tx(self, api, mongo):
        r = api.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_id": "creator_monthly",
            "origin_url": BASE_URL,
            "email": f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_id" in data
        # cleanup
        time.sleep(0.3)
        mongo.payment_transactions.delete_one({"session_id": data["session_id"]})
