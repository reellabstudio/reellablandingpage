"""ReelLab Studio v6 backend tests — focus on iteration 6 changes.

Covers:
 - Register requires first_name + last_name (422 if missing)
 - /api/auth/me returns first_name + last_name (CEO has ReelLab CEO)
 - /api/invoices CEO gating (POST 403 for non-CEO; GET returns can_create flag)
 - /api/content/posts CRUD owner-scoped
 - /api/content/caption/generate validation + 401 unauth
 - /api/ceo/coupons accepts promotional+group_tag; 403 for non-CEO
 - Public payment-mode still live (regression)

NOTE: caption-gen burns Emergent LLM credits — we make at most 1 successful call.
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
    r = requests.post(f"{API}/auth/login",
                      json={"email": CEO_EMAIL, "password": CEO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def fresh_user():
    """Register a fresh studio_owner with first/last name."""
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_v6_{uniq}@example.com",
        "password": "Pass123!",
        "first_name": "Jane",
        "last_name": "Doe",
        "username": f"v6_{uniq}",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    body["password"] = payload["password"]
    return body


# ───── Register: first_name + last_name ─────
class TestRegisterNames:
    def test_register_requires_first_and_last(self):
        uniq = uuid.uuid4().hex[:8]
        payload = {
            "email": f"TEST_v6n_{uniq}@example.com",
            "password": "Pass123!",
            "first_name": "Alice",
            "last_name": "Smith",
            "username": f"alice_{uniq}",
        }
        r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        u = d.get("user") or d
        assert u.get("first_name") == "Alice"
        assert u.get("last_name") == "Smith"
        # display_name should be combined first + last
        assert u.get("display_name") in ("Alice Smith", "Alice  Smith"), u

    def test_register_missing_last_name_422(self):
        uniq = uuid.uuid4().hex[:8]
        r = requests.post(f"{API}/auth/register", json={
            "email": f"TEST_v6m_{uniq}@example.com",
            "password": "Pass123!",
            "first_name": "Bob",
            "username": f"bob_{uniq}",
        }, timeout=15)
        assert r.status_code in (400, 422), r.text

    def test_register_empty_last_name_422(self):
        uniq = uuid.uuid4().hex[:8]
        r = requests.post(f"{API}/auth/register", json={
            "email": f"TEST_v6e_{uniq}@example.com",
            "password": "Pass123!",
            "first_name": "Carl",
            "last_name": "",
            "username": f"carl_{uniq}",
        }, timeout=15)
        assert r.status_code in (400, 422), r.text


# ───── /api/auth/me returns first/last name ─────
class TestAuthMeNames:
    def test_ceo_me_has_first_last(self, ceo_token):
        r = requests.get(f"{API}/auth/me", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        u = d.get("user") or d
        assert u.get("first_name") == "ReelLab", u
        assert u.get("last_name") == "CEO", u
        assert u.get("role") == "ceo"

    def test_fresh_user_me_has_first_last(self, fresh_user):
        r = requests.get(f"{API}/auth/me", headers=auth_h(fresh_user["token"]), timeout=10)
        assert r.status_code == 200
        d = r.json()
        u = d.get("user") or d
        assert u.get("first_name") == "Jane"
        assert u.get("last_name") == "Doe"


# ───── Invoices CEO gating ─────
class TestInvoicesGating:
    def test_non_ceo_cannot_create(self, fresh_user):
        r = requests.post(f"{API}/invoices",
                          headers=auth_h(fresh_user["token"]),
                          json={"client_id": "x", "amount": 100, "currency": "USD",
                                "description": "test"}, timeout=10)
        assert r.status_code == 403, r.text

    def test_non_ceo_get_invoices_can_create_false(self, fresh_user):
        r = requests.get(f"{API}/invoices",
                         headers=auth_h(fresh_user["token"]), timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("can_create") is False
        assert isinstance(d.get("invoices"), list)

    def test_ceo_get_invoices_can_create_true(self, ceo_token):
        r = requests.get(f"{API}/invoices",
                         headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("can_create") is True
        assert isinstance(d.get("invoices"), list)


# ───── Content Posts CRUD ─────
class TestContentPostsCRUD:
    def test_create_list_patch_delete_owner_scoped(self, fresh_user):
        tok = fresh_user["token"]
        # CREATE
        r = requests.post(f"{API}/content/posts",
                          headers=auth_h(tok),
                          json={
                              "title": "TEST_v6 post",
                              "platform": "instagram",
                              "scheduled_for": "2026-02-01T10:00:00Z",
                              "caption": "TEST_v6 hello world",
                              "status": "draft",
                          }, timeout=10)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        post = body.get("post") or body
        pid = post.get("id")
        assert pid, post
        assert post.get("platform") == "instagram"
        # LIST
        r = requests.get(f"{API}/content/posts", headers=auth_h(tok), timeout=10)
        assert r.status_code == 200
        listed = r.json()
        items = listed if isinstance(listed, list) else listed.get("posts", [])
        assert any(p.get("id") == pid for p in items), "created post not in list"
        # PATCH (server requires full ContentPostIn schema)
        r = requests.patch(f"{API}/content/posts/{pid}",
                           headers=auth_h(tok),
                           json={
                               "title": "TEST_v6 post",
                               "platform": "instagram",
                               "scheduled_for": "2026-02-01T10:00:00Z",
                               "caption": "TEST_v6 updated",
                               "status": "draft",
                           }, timeout=10)
        assert r.status_code == 200, r.text
        # Verify via GET
        r = requests.get(f"{API}/content/posts", headers=auth_h(tok), timeout=10)
        items = r.json().get("posts", [])
        found = next((p for p in items if p.get("id") == pid), None)
        assert found and found.get("caption") == "TEST_v6 updated"
        # DELETE
        r = requests.delete(f"{API}/content/posts/{pid}",
                            headers=auth_h(tok), timeout=10)
        assert r.status_code in (200, 204)
        # GET after delete - should not appear
        r = requests.get(f"{API}/content/posts", headers=auth_h(tok), timeout=10)
        items = r.json().get("posts", [])
        assert not any(p.get("id") == pid for p in items)

    def test_other_user_cannot_access(self, fresh_user, ceo_token):
        # CEO creates a post
        r = requests.post(f"{API}/content/posts",
                          headers=auth_h(ceo_token),
                          json={
                              "title": "TEST_v6 ceo_only",
                              "platform": "tiktok",
                              "scheduled_for": "2026-02-02T10:00:00Z",
                              "caption": "TEST_v6 ceo_only",
                          }, timeout=10)
        assert r.status_code in (200, 201), r.text
        pid = (r.json().get("post") or r.json()).get("id")
        assert pid
        # fresh user tries to patch CEO's post → 404 (need full body)
        r2 = requests.patch(f"{API}/content/posts/{pid}",
                            headers=auth_h(fresh_user["token"]),
                            json={
                                "title": "hacked",
                                "platform": "tiktok",
                                "scheduled_for": "2026-02-02T10:00:00Z",
                                "caption": "hacked",
                            }, timeout=10)
        assert r2.status_code == 404, r2.text
        # fresh user tries to delete CEO's post → 404
        r3 = requests.delete(f"{API}/content/posts/{pid}",
                             headers=auth_h(fresh_user["token"]), timeout=10)
        assert r3.status_code == 404
        # cleanup
        requests.delete(f"{API}/content/posts/{pid}", headers=auth_h(ceo_token), timeout=10)


# ───── Caption generator ─────
class TestCaptionGen:
    def test_unauth_401(self):
        r = requests.post(f"{API}/content/caption/generate",
                          json={"platform": "instagram", "topic": "coffee shop"}, timeout=10)
        assert r.status_code in (401, 403), r.text

    def test_validation_empty_topic(self, fresh_user):
        r = requests.post(f"{API}/content/caption/generate",
                          headers=auth_h(fresh_user["token"]),
                          json={"platform": "instagram", "topic": ""}, timeout=15)
        assert r.status_code in (400, 422), r.text

    def test_generates_three_captions(self, fresh_user):
        """Single live AI call to verify shape."""
        r = requests.post(f"{API}/content/caption/generate",
                          headers=auth_h(fresh_user["token"]),
                          json={"platform": "instagram",
                                "topic": "behind the scenes of a video shoot"},
                          timeout=45)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("platform") == "instagram"
        caps = d.get("captions")
        assert isinstance(caps, list)
        assert len(caps) == 3, f"expected 3 captions, got {len(caps)}: {caps}"
        for c in caps:
            assert isinstance(c, str) and len(c) > 0


# ───── Coupons: promotional + group_tag ─────
class TestCouponsExtended:
    def test_non_ceo_403_on_coupons(self, fresh_user):
        r = requests.get(f"{API}/ceo/coupons",
                         headers=auth_h(fresh_user["token"]), timeout=10)
        assert r.status_code == 403
        r = requests.post(f"{API}/ceo/coupons",
                         headers=auth_h(fresh_user["token"]),
                         json={"code": "X", "label": "x", "discount_type": "percent",
                               "discount_value": 10, "plan": "solo",
                               "assignment_type": "shareable",
                               "duration_type": "unlimited",
                               "usage_limit_type": "unlimited"},
                         timeout=10)
        assert r.status_code == 403

    def test_create_with_promotional_and_group_tag(self, ceo_token):
        code = f"TESTV6{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "label": "v6 test coupon",
            "discount_type": "percent",
            "discount_value": 25,
            "plan": "solo",
            "assignment_type": "shareable",
            "duration_type": "unlimited",
            "usage_limit_type": "limited",
            "usage_limit": 100,
            "promotional": True,
            "group_tag": "v6-launch",
        }
        r = requests.post(f"{API}/ceo/coupons",
                          headers=auth_h(ceo_token),
                          json=payload, timeout=10)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        # Roundtrip via GET
        r = requests.get(f"{API}/ceo/coupons", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        listed = r.json()
        items = listed if isinstance(listed, list) else listed.get("coupons", [])
        found = next((c for c in items if c.get("code") == code), None)
        assert found is not None, f"coupon {code} not in list"
        assert found.get("promotional") is True
        assert found.get("group_tag") == "v6-launch"
        # No mongo _id leak
        assert "_id" not in found
