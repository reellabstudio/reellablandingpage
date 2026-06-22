"""
v11 Backend Tests — Connectors (OAuth + manual) + Gemini Nano Banana image generation
Covers the NEW surfaces added in iteration 11:
  - GET  /api/connectors
  - POST /api/connectors (manual handle, studio_only gate)
  - DEL  /api/connectors/{platform}
  - GET  /api/connectors/oauth/{platform}/start (setup_required path + no_oauth + studio_only)
  - POST /api/ai/image/generate (Gemini Nano Banana via EMERGENT_LLM_KEY)
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://reellab-backoffice.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CEO_EMAIL = "ceo@reellabstudio.com"
CEO_PASSWORD = "ReelLabceo26!"


# ─── Fixtures ───
@pytest.fixture(scope="session")
def ceo_token():
    r = requests.post(f"{API}/auth/login", json={"email": CEO_EMAIL, "password": CEO_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"CEO login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"No token in CEO login response: {r.json()}"
    return tok


@pytest.fixture(scope="session")
def free_token():
    """Register fresh free user, accept legal."""
    email = f"v11test_{uuid.uuid4().hex[:8]}@reellabstudio.com"
    payload = {
        "first_name": "V11",
        "last_name": "Tester",
        "email": email,
        "username": f"v11_{uuid.uuid4().hex[:6]}",
        "password": "testpass123",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code in (200, 201), f"register failed {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    # Accept legal
    try:
        requests.post(f"{API}/legal/accept",
                      json={"terms": True, "privacy": True, "marketing": False},
                      headers={"Authorization": f"Bearer {tok}"}, timeout=10)
    except Exception:
        pass
    return tok


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# ─── Connectors CRUD (CEO) ───
class TestConnectorsCEO:
    def test_list_connectors_empty_or_existing(self, ceo_token):
        r = requests.get(f"{API}/connectors", headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "connectors" in data
        assert isinstance(data["connectors"], list)

    def test_create_manual_tiktok(self, ceo_token):
        # Clean slate first
        requests.delete(f"{API}/connectors/tiktok", headers=auth(ceo_token), timeout=10)
        r = requests.post(f"{API}/connectors",
                          json={"platform": "tiktok", "handle": "@reellabtt_v11"},
                          headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "connector" in data
        c = data["connector"]
        assert c["platform"] == "tiktok"
        assert c["handle"] == "@reellabtt_v11"
        assert c["connected"] is True
        assert c["auth_type"] == "manual"

        # Verify via list
        r2 = requests.get(f"{API}/connectors", headers=auth(ceo_token), timeout=10)
        platforms = [x["platform"] for x in r2.json()["connectors"]]
        assert "tiktok" in platforms

    def test_create_manual_x(self, ceo_token):
        requests.delete(f"{API}/connectors/x", headers=auth(ceo_token), timeout=10)
        r = requests.post(f"{API}/connectors",
                          json={"platform": "x", "handle": "@reellabx_v11"},
                          headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["connector"]["handle"] == "@reellabx_v11"

    def test_create_manual_youtube_as_ceo(self, ceo_token):
        # CEO can manually save handle for YT too
        requests.delete(f"{API}/connectors/youtube", headers=auth(ceo_token), timeout=10)
        r = requests.post(f"{API}/connectors",
                          json={"platform": "youtube", "handle": "@reellabyt_v11"},
                          headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["connector"]["platform"] == "youtube"

    def test_disconnect_connector(self, ceo_token):
        # Ensure a tiktok row exists
        requests.post(f"{API}/connectors", json={"platform": "tiktok", "handle": "@todelete"},
                      headers=auth(ceo_token), timeout=10)
        r = requests.delete(f"{API}/connectors/tiktok", headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200
        assert r.json() == {"ok": True}

        # Verify removed
        r2 = requests.get(f"{API}/connectors", headers=auth(ceo_token), timeout=10)
        platforms = [x["platform"] for x in r2.json()["connectors"]]
        assert "tiktok" not in platforms

    def test_invalid_platform_validation(self, ceo_token):
        r = requests.post(f"{API}/connectors",
                          json={"platform": "snapchat", "handle": "@foo"},
                          headers=auth(ceo_token), timeout=10)
        assert r.status_code in (400, 422)


# ─── Connectors studio_only gating (Free user) ───
class TestConnectorsFreeGating:
    def test_post_connector_blocked_for_free(self, free_token):
        r = requests.post(f"{API}/connectors",
                          json={"platform": "tiktok", "handle": "@blocked"},
                          headers=auth(free_token), timeout=10)
        assert r.status_code == 402, f"expected 402 got {r.status_code} {r.text}"
        detail = r.json().get("detail") or {}
        assert detail.get("code") == "studio_only", detail

    def test_oauth_start_blocked_for_free(self, free_token):
        r = requests.get(f"{API}/connectors/oauth/youtube/start",
                         headers=auth(free_token), timeout=10)
        assert r.status_code == 402
        detail = r.json().get("detail") or {}
        assert detail.get("code") == "studio_only"

    def test_list_connectors_works_for_free(self, free_token):
        # Listing connectors should still work even on Free
        r = requests.get(f"{API}/connectors", headers=auth(free_token), timeout=10)
        assert r.status_code == 200
        assert "connectors" in r.json()


# ─── OAuth start endpoints (setup_required path) ───
class TestOAuthStart:
    def test_youtube_setup_required(self, ceo_token):
        r = requests.get(f"{API}/connectors/oauth/youtube/start", headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("setup_required") is True
        assert data["platform"] == "youtube"
        assert data["provider"] == "google"
        missing = data.get("missing", [])
        assert "GOOGLE_OAUTH_CLIENT_ID" in missing
        assert "GOOGLE_OAUTH_CLIENT_SECRET" in missing
        assert "redirect_uri" in data

    def test_instagram_setup_required(self, ceo_token):
        r = requests.get(f"{API}/connectors/oauth/instagram/start", headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("setup_required") is True
        assert data["provider"] == "meta"
        missing = data.get("missing", [])
        assert "META_OAUTH_CLIENT_ID" in missing
        assert "META_OAUTH_CLIENT_SECRET" in missing

    def test_facebook_setup_required(self, ceo_token):
        r = requests.get(f"{API}/connectors/oauth/facebook/start", headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("setup_required") is True
        assert data["provider"] == "meta"

    def test_tiktok_no_oauth(self, ceo_token):
        r = requests.get(f"{API}/connectors/oauth/tiktok/start", headers=auth(ceo_token), timeout=10)
        assert r.status_code == 400, r.text
        detail = r.json().get("detail") or {}
        assert detail.get("code") == "no_oauth"

    def test_x_no_oauth(self, ceo_token):
        r = requests.get(f"{API}/connectors/oauth/x/start", headers=auth(ceo_token), timeout=10)
        assert r.status_code == 400
        detail = r.json().get("detail") or {}
        assert detail.get("code") == "no_oauth"


# ─── OAuth callback edge cases ───
class TestOAuthCallback:
    def test_callback_missing_code_redirects(self, ceo_token):
        # Should redirect to /profile?connector_error=missing_code
        r = requests.get(f"{API}/connectors/oauth/youtube/callback",
                         allow_redirects=False, timeout=10)
        assert r.status_code in (302, 307)
        loc = r.headers.get("location", "")
        assert "connector_error" in loc

    def test_callback_invalid_state(self, ceo_token):
        r = requests.get(f"{API}/connectors/oauth/youtube/callback",
                         params={"code": "fake", "state": "nope"},
                         allow_redirects=False, timeout=10)
        assert r.status_code in (302, 307)
        assert "invalid_state" in r.headers.get("location", "")


# ─── Gemini Nano Banana image generation ───
class TestImageGeneration:
    def test_generate_image_ceo(self, ceo_token):
        r = requests.post(f"{API}/ai/image/generate",
                          json={"prompt": "cinematic neon studio at night, purple lighting, ultra detailed",
                                "aspect": "1:1"},
                          headers=auth(ceo_token), timeout=60)
        # Accept 200 (success) or 502 (LLM transient)
        if r.status_code == 502:
            pytest.skip(f"Gemini transient failure: {r.text}")
        assert r.status_code == 200, f"image gen failed: {r.status_code} {r.text[:500]}"
        data = r.json()
        assert "image_data_url" in data
        url = data["image_data_url"]
        assert url.startswith("data:image/"), f"expected data URL, got: {url[:80]}"
        assert ";base64," in url
        assert len(url) > 500, "data URL suspiciously short"
        assert data.get("aspect") == "1:1"
        assert data.get("mime", "").startswith("image/")

    def test_generate_image_validation_short_prompt(self, ceo_token):
        r = requests.post(f"{API}/ai/image/generate",
                          json={"prompt": "ab", "aspect": "1:1"},
                          headers=auth(ceo_token), timeout=10)
        assert r.status_code == 422

    def test_generate_image_invalid_aspect(self, ceo_token):
        r = requests.post(f"{API}/ai/image/generate",
                          json={"prompt": "a beautiful sunset landscape", "aspect": "3:4"},
                          headers=auth(ceo_token), timeout=10)
        assert r.status_code == 422

    def test_generate_image_unauthenticated(self):
        r = requests.post(f"{API}/ai/image/generate",
                          json={"prompt": "beach sunset", "aspect": "1:1"}, timeout=10)
        assert r.status_code in (401, 403)


# ─── Regression: existing endpoints still work ───
class TestRegression:
    def test_pricing_still_works(self):
        r = requests.get(f"{API}/pricing", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "addons" in data

    def test_usage_me_ceo(self, ceo_token):
        r = requests.get(f"{API}/usage/me", headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["plan"] == "studio"

    def test_content_posts_list(self, ceo_token):
        r = requests.get(f"{API}/content/posts", headers=auth(ceo_token), timeout=10)
        assert r.status_code == 200
        assert "posts" in r.json()

    def test_caption_generate_still_works(self, ceo_token):
        r = requests.post(f"{API}/content/caption/generate",
                          json={"topic": "A test post about AI video editing", "platform": "instagram"},
                          headers=auth(ceo_token), timeout=30)
        # 200 success or 502 transient
        assert r.status_code in (200, 502), r.text


# ─── Cleanup ───
@pytest.fixture(scope="session", autouse=True)
def cleanup_connectors(ceo_token):
    yield
    for p in ("tiktok", "x", "youtube", "instagram", "facebook"):
        try:
            requests.delete(f"{API}/connectors/{p}", headers=auth(ceo_token), timeout=5)
        except Exception:
            pass
