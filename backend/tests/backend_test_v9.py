"""
Iteration 9 — v9 release backend tests.
Covers:
- GET /api/pricing v9 shape (free/creator/studio + limits + addons + founder)
- POST /api/payments/checkout for AI edit addons + founder (cs_live_ URL)
- /api/usage/me (free user defaults)
- /api/usage/ai-edit/consume 402 for free user
- /api/content/posts calendar_limit 402 at 10th post
- /api/content/caption/generate captions_exhausted 402 at 3rd
- /api/uploads/presign returns S3 PUT URL
- /api/ai/render contract + auth (no live invoke)
- /api/ai/transcribe contract + auth (no live invoke)
- /api/ceo/campaigns POST/GET + 403 for non-CEO
- /api/ceo/dm POST
- /api/ceo/analytics shape + 403
- /api/ceo/studio-projects GET/PATCH + 403
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

CEO_EMAIL = "ceo@reellabstudio.com"
CEO_PASSWORD = os.environ.get("CEO_PASSWORD", "")


def _register_free_user():
    """Register a fresh free-tier user and return (session, user_dict, token)."""
    suffix = uuid.uuid4().hex[:8]
    email = f"v9test_{suffix}@reellabstudio.com"
    payload = {
        "email": email,
        "password": "testpass123",
        "first_name": "Creator",
        "last_name": "Tester",
        "username": f"v9t{suffix}",
    }
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=20)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"no token in register response: {data}"
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s, data.get("user") or {}, token, email


def _login_ceo():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": CEO_EMAIL, "password": CEO_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"CEO login failed: {r.text}"
    token = r.json().get("token") or r.json().get("access_token")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def free_user():
    s, u, t, em = _register_free_user()
    return {"session": s, "user": u, "token": t, "email": em}


@pytest.fixture(scope="module")
def ceo_session():
    return _login_ceo()


@pytest.fixture(scope="module")
def anon():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── 1. /api/pricing v9 shape ───────────────────────────────────────────
class TestPricingV9:
    def test_pricing_plans(self, anon):
        r = anon.get(f"{BASE_URL}/api/pricing", timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()
        p = b["pricing"]
        assert p["free"] == {"monthly": 0.0, "yearly": 0.0}
        assert p["creator"]["monthly"] == 89.0
        assert p["creator"]["yearly"] == 900.0
        assert p["studio"]["monthly"] == 199.0
        assert p["studio"]["yearly"] == 2100.0

    def test_pricing_limits(self, anon):
        b = anon.get(f"{BASE_URL}/api/pricing").json()
        lim = b["limits"]
        assert lim["free"]["edits"] == 3
        assert lim["free"]["captions"] == 3
        assert lim["free"]["calendar_posts"] == 10
        assert lim["free"]["ai_edits"] == 0

    def test_pricing_addons(self, anon):
        b = anon.get(f"{BASE_URL}/api/pricing").json()
        ad = b["addons"]
        assert ad["ai_edits_1"]["amount"] == 12.0
        assert ad["ai_edits_3"]["amount"] == 30.0
        assert ad["ai_edits_5"]["amount"] == 50.0

    def test_pricing_founder(self, anon):
        b = anon.get(f"{BASE_URL}/api/pricing").json()
        f = b["founder"]
        assert f["entry_fee"] == 50.0
        assert f["tiers"]["creator"]["monthly"] == 49.0
        assert f["cap"] == 100


# ── 2. /api/payments/checkout — addon + founder ─────────────────────────
class TestCheckout:
    def test_checkout_ai_edits_3_returns_stripe_url(self, free_user):
        s = free_user["session"]
        r = s.post(
            f"{BASE_URL}/api/payments/checkout",
            json={"package_id": "ai_edits_3", "origin_url": "https://reellabstudio.com"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        url = d.get("url") or d.get("checkout_url") or d.get("session_url") or ""
        assert "stripe.com" in url or url.startswith("https://checkout.stripe.com"), f"bad url: {url}"
        # cs_live_ session under live key
        assert ("cs_live_" in url) or ("cs_test_" in url), f"no cs_ id in url: {url}"

    def test_checkout_founder_50(self, free_user):
        s = free_user["session"]
        r = s.post(
            f"{BASE_URL}/api/payments/checkout",
            json={"package_id": "founder_circle", "origin_url": "https://reellabstudio.com"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        url = r.json().get("url", "")
        assert "stripe.com" in url


# ── 3. /api/usage/me ─────────────────────────────────────────────────────
class TestUsageMe:
    def test_fresh_free_user(self, free_user):
        s = free_user["session"]
        r = s.get(f"{BASE_URL}/api/usage/me", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] == "free"
        assert d["limits"]["ai_edits"] == 0
        assert d["used"]["ai_edits"] == 0
        assert "ai_edit_credits" in d

    def test_requires_auth(self, anon):
        r = anon.get(f"{BASE_URL}/api/usage/me", timeout=10)
        assert r.status_code in (401, 403)


# ── 4. /api/usage/ai-edit/consume — 402 for free user ───────────────────
class TestAIEditConsume:
    def test_free_user_gets_402(self, free_user):
        s = free_user["session"]
        r = s.post(f"{BASE_URL}/api/usage/ai-edit/consume", json={}, timeout=15)
        assert r.status_code == 402, r.text
        d = r.json()
        detail = d.get("detail") or {}
        assert isinstance(detail, dict), f"detail not dict: {detail}"
        assert detail.get("code") == "ai_edits_exhausted"
        assert "addons" in detail
        assert "ai_edits_3" in detail["addons"]


# ── 5. /api/content/posts calendar_limit ─────────────────────────────────
class TestCalendarLimit:
    def test_eleventh_post_402(self):
        # fresh user
        s, _, _, _ = _register_free_user()
        for i in range(10):
            r = s.post(
                f"{BASE_URL}/api/content/posts",
                json={
                    "title": f"TEST_{i}",
                    "caption": "x",
                    "platform": "instagram",
                    "scheduled_for": "2026-02-01T10:00:00Z",
                    "status": "draft",
                },
                timeout=15,
            )
            assert r.status_code == 200, f"post {i} failed: {r.status_code} {r.text}"
        # 11th must 402
        r = s.post(
            f"{BASE_URL}/api/content/posts",
            json={
                "title": "TEST_11",
                "caption": "x",
                "platform": "instagram",
                "scheduled_for": "2026-02-01T10:00:00Z",
                "status": "draft",
            },
            timeout=15,
        )
        assert r.status_code == 402, r.text
        detail = r.json().get("detail") or {}
        assert detail.get("code") == "calendar_limit"


# ── 6. /api/content/caption/generate captions_exhausted ─────────────────
class TestCaptionLimit:
    def test_caption_fourth_402(self):
        s, _, _, _ = _register_free_user()
        ok = 0
        for i in range(3):
            r = s.post(
                f"{BASE_URL}/api/content/caption/generate",
                json={"topic": f"travel reel {i}", "platform": "instagram", "tone": "fun"},
                timeout=60,
            )
            # acceptable to get 200 or 503 if LLM key throttled — we still want usage incremented on success
            if r.status_code == 200:
                ok += 1
            elif r.status_code in (503, 502):
                pytest.skip(f"LLM unavailable ({r.status_code}); skipping caption-limit test")
            else:
                assert False, f"caption gen {i} unexpected: {r.status_code} {r.text}"
        # 4th call
        r = s.post(
            f"{BASE_URL}/api/content/caption/generate",
            json={"topic": "fourth", "platform": "instagram", "tone": "fun"},
            timeout=30,
        )
        assert r.status_code == 402, f"expected 402, got {r.status_code}: {r.text}"
        detail = r.json().get("detail") or {}
        assert detail.get("code") == "captions_exhausted"


# ── 7. /api/uploads/presign ─────────────────────────────────────────────
class TestPresign:
    def test_presign_returns_s3_put_url(self, free_user):
        s = free_user["session"]
        r = s.post(
            f"{BASE_URL}/api/uploads/presign",
            json={"filename": "TEST_video.mp4", "content_type": "video/mp4"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "upload_url" in d and "key" in d and "public_url" in d
        assert "reellab-video-generator" in d["public_url"]
        assert "us-east-2" in d["public_url"]
        assert d["upload_url"].startswith("https://")

    def test_presign_requires_auth(self, anon):
        r = anon.post(f"{BASE_URL}/api/uploads/presign", json={"filename": "x.mp4"}, timeout=10)
        assert r.status_code in (401, 403)


# ── 8. /api/ai/render contract (no live invoke) ─────────────────────────
class TestRenderContract:
    def test_render_requires_auth(self, anon):
        r = anon.post(
            f"{BASE_URL}/api/ai/render",
            json={"source_url": "https://x.com/v.mp4", "aspect": "9:16"},
            timeout=10,
        )
        assert r.status_code in (401, 403)

    def test_render_get_requires_auth(self, anon):
        r = anon.get(f"{BASE_URL}/api/ai/render/dummy_id", timeout=10)
        assert r.status_code in (401, 403)


# ── 9. /api/ai/transcribe contract (no live invoke) ─────────────────────
class TestTranscribeContract:
    def test_transcribe_requires_auth(self, anon):
        r = anon.post(
            f"{BASE_URL}/api/ai/transcribe",
            json={"public_url": "https://x.com/audio.mp3"},
            timeout=10,
        )
        assert r.status_code in (401, 403)


# ── 10. /api/ceo/campaigns + dm ─────────────────────────────────────────
class TestCEOCampaigns:
    def test_send_campaign_to_free(self, ceo_session):
        body = {"audience": "free", "subject": "TEST_v9 campaign", "body": "Hi {first_name} — TEST"}
        r = ceo_session.post(f"{BASE_URL}/api/ceo/campaigns", json=body, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "sent" in d
        assert isinstance(d["sent"], int)

    def test_list_campaigns(self, ceo_session):
        r = ceo_session.get(f"{BASE_URL}/api/ceo/campaigns", timeout=15)
        assert r.status_code == 200
        assert "campaigns" in r.json()
        assert isinstance(r.json()["campaigns"], list)

    def test_campaigns_403_for_non_ceo(self, free_user):
        s = free_user["session"]
        r = s.post(
            f"{BASE_URL}/api/ceo/campaigns",
            json={"audience": "free", "subject": "x", "body": "y"},
            timeout=15,
        )
        assert r.status_code == 403

    def test_dm_to_known_user(self, ceo_session):
        # DM the CEO themselves so we don't spam
        r = ceo_session.post(
            f"{BASE_URL}/api/ceo/dm",
            json={"user_email": CEO_EMAIL, "subject": "TEST_v9 dm", "body": "TEST"},
            timeout=60,
        )
        # 200 ok, or 502 if SMTP transient
        assert r.status_code in (200, 502), r.text


# ── 11. /api/ceo/analytics ──────────────────────────────────────────────
class TestCEOAnalytics:
    def test_analytics_shape(self, ceo_session):
        r = ceo_session.get(f"{BASE_URL}/api/ceo/analytics", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("mrr", "total_users", "signups_30d", "plan_breakdown",
                  "ai_edit_addons_sold", "founder_count", "founder_cap"):
            assert k in d, f"missing {k}"
        assert d["founder_cap"] == 100

    def test_analytics_403_for_non_ceo(self, free_user):
        s = free_user["session"]
        r = s.get(f"{BASE_URL}/api/ceo/analytics", timeout=10)
        assert r.status_code == 403


# ── 12. /api/ceo/studio-projects ────────────────────────────────────────
class TestCEOStudioProjects:
    def test_list_projects(self, ceo_session):
        r = ceo_session.get(f"{BASE_URL}/api/ceo/studio-projects", timeout=15)
        assert r.status_code == 200, r.text
        assert "projects" in r.json()

    def test_list_403_for_non_ceo(self, free_user):
        s = free_user["session"]
        r = s.get(f"{BASE_URL}/api/ceo/studio-projects", timeout=10)
        assert r.status_code == 403

    def test_patch_unknown_project_404(self, ceo_session):
        r = ceo_session.patch(
            f"{BASE_URL}/api/ceo/studio-projects/nonexistent_id_xyz",
            json={"status": "accepted", "note": "TEST"},
            timeout=10,
        )
        assert r.status_code == 404
