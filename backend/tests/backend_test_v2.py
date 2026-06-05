"""ReelLab Studio v2 backend regression tests.

Covers NEW v2 surface: waitlist, founder-circle, pricing, public FAQ,
CEO admin extensions (waitlist/founders/faq CRUD/pricing/settings/email-templates/
user admin/moderation/dummy-data).
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

CEO_EMAIL = "ceo@reellabstudio.com"
CEO_PASSWORD = os.environ.get("CEO_PASSWORD", "")


@pytest.fixture(scope="session")
def ceo_token():
    r = requests.post(f"{API}/auth/login", json={"email": CEO_EMAIL, "password": CEO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "ceo"
    return data["token"]


@pytest.fixture(scope="session")
def studio_user():
    uniq = uuid.uuid4().hex[:8]
    r = requests.post(f"{API}/auth/register", json={
        "email": f"TEST_v2_{uniq}@example.com",
        "password": "TestPass123!",
        "display_name": f"V2 {uniq}",
        "username": f"v2_{uniq}",
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


def auth_h(tok):
    return {"Authorization": f"Bearer {tok}"}


# -------------- Public Waitlist & Founder --------------
class TestPublicWaitlist:
    def test_waitlist_signup(self):
        email = f"TEST_wait_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/waitlist", json={"email": email, "source": "hero"}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["already_joined"] is False
        # idempotent
        r2 = requests.post(f"{API}/waitlist", json={"email": email, "source": "hero"}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["already_joined"] is True

    def test_waitlist_invalid_email(self):
        r = requests.post(f"{API}/waitlist", json={"email": "not-an-email"}, timeout=10)
        assert r.status_code == 422

    def test_founder_circle(self):
        email = f"TEST_founder_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/founder-circle", json={
            "name": "Test Founder", "email": email,
            "creator_type": "podcaster", "handle": "@test"
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["already_joined"] is False
        # duplicate
        r2 = requests.post(f"{API}/founder-circle", json={
            "name": "Test Founder", "email": email,
            "creator_type": "podcaster", "handle": "@test"
        }, timeout=10)
        assert r2.json()["already_joined"] is True


# -------------- Public Pricing & FAQ --------------
class TestPublicPricingFaq:
    def test_pricing(self):
        r = requests.get(f"{API}/pricing", timeout=10)
        assert r.status_code == 200
        p = r.json()["pricing"]
        for plan in ("solo", "creator", "studio"):
            assert plan in p
            assert "monthly" in p[plan]
            assert "yearly" in p[plan]
            assert isinstance(p[plan]["monthly"], (int, float))

    def test_public_faq(self):
        r = requests.get(f"{API}/public/faq", timeout=10)
        assert r.status_code == 200
        faq = r.json()["faq"]
        assert isinstance(faq, list)
        assert len(faq) >= 1


# -------------- CEO: Waitlist & Founders --------------
class TestCEOWaitlistFounders:
    def test_role_gating(self, studio_user):
        token = studio_user["token"]
        for path in ("/ceo/waitlist", "/ceo/founders", "/ceo/faq",
                     "/ceo/settings", "/ceo/email-templates", "/ceo/moderation"):
            r = requests.get(f"{API}{path}", headers=auth_h(token), timeout=10)
            assert r.status_code == 403, f"{path} expected 403 got {r.status_code}"

    def test_ceo_waitlist_list(self, ceo_token):
        # seed a row first
        email = f"test_listwait_{uuid.uuid4().hex[:6]}@example.com"
        requests.post(f"{API}/waitlist", json={"email": email}, timeout=10)
        r = requests.get(f"{API}/ceo/waitlist", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        rows = r.json()["waitlist"]
        assert any(x["email"] == email.lower() for x in rows), f"missing {email}; first 3 rows: {rows[:3]}"

    def test_ceo_founders_list(self, ceo_token):
        email = f"test_listfounder_{uuid.uuid4().hex[:6]}@example.com"
        requests.post(f"{API}/founder-circle", json={"name": "L", "email": email}, timeout=10)
        r = requests.get(f"{API}/ceo/founders", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        rows = r.json()["founders"]
        assert any(x["email"] == email.lower() for x in rows), f"missing {email}"


# -------------- CEO: FAQ CRUD --------------
class TestCEOFaq:
    def test_faq_crud(self, ceo_token):
        # create
        r = requests.post(f"{API}/ceo/faq", headers=auth_h(ceo_token), json={
            "category": "TEST", "question": "TEST_Q?", "answer": "TEST_A.", "keywords": ["test"]
        }, timeout=10)
        assert r.status_code == 200
        fid = r.json()["faq"]["id"]
        # list
        lst = requests.get(f"{API}/ceo/faq", headers=auth_h(ceo_token), timeout=10).json()["faq"]
        assert any(x["id"] == fid for x in lst)
        # update
        r = requests.patch(f"{API}/ceo/faq/{fid}", headers=auth_h(ceo_token), json={
            "category": "TEST", "question": "TEST_Q2?", "answer": "TEST_A2.", "keywords": ["t2"]
        }, timeout=10)
        assert r.status_code == 200
        lst = requests.get(f"{API}/ceo/faq", headers=auth_h(ceo_token), timeout=10).json()["faq"]
        updated = next(x for x in lst if x["id"] == fid)
        assert updated["question"] == "TEST_Q2?"
        # delete
        r = requests.delete(f"{API}/ceo/faq/{fid}", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        lst = requests.get(f"{API}/ceo/faq", headers=auth_h(ceo_token), timeout=10).json()["faq"]
        assert not any(x["id"] == fid for x in lst)


# -------------- CEO: Pricing --------------
class TestCEOPricing:
    def test_pricing_update_and_stripe_sync(self, ceo_token):
        r = requests.put(f"{API}/ceo/pricing", headers=auth_h(ceo_token), json={
            "plan": "solo", "monthly": 22.0, "yearly": 220.0
        }, timeout=10)
        assert r.status_code == 200
        # verify reflected in public /pricing
        p = requests.get(f"{API}/pricing", timeout=10).json()["pricing"]
        assert p["solo"]["monthly"] == 22.0
        # restore
        requests.put(f"{API}/ceo/pricing", headers=auth_h(ceo_token), json={
            "plan": "solo", "monthly": 19.0, "yearly": 180.0
        }, timeout=10)
        # stripe sync (mocked)
        r = requests.post(f"{API}/ceo/pricing/sync-stripe", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["mocked"] is True


# -------------- CEO: Settings --------------
class TestCEOSettings:
    def test_settings_get_and_toggle(self, ceo_token):
        r = requests.get(f"{API}/ceo/settings", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        s = r.json()["settings"]
        assert "community" in s
        original = s["community"]
        # flip
        r = requests.put(f"{API}/ceo/settings", headers=auth_h(ceo_token),
                         json={"key": "community", "value": not original}, timeout=10)
        assert r.status_code == 200
        assert r.json()["settings"]["community"] == (not original)
        # restore
        requests.put(f"{API}/ceo/settings", headers=auth_h(ceo_token),
                     json={"key": "community", "value": original}, timeout=10)


# -------------- CEO: Email templates --------------
class TestCEOEmailTemplates:
    def test_email_templates(self, ceo_token):
        r = requests.get(f"{API}/ceo/email-templates", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        t = r.json()["templates"]
        assert "welcome" in t
        new_subject = f"Welcome TEST {uuid.uuid4().hex[:6]}"
        r = requests.put(f"{API}/ceo/email-templates", headers=auth_h(ceo_token), json={
            "key": "welcome", "subject": new_subject, "body": "Hi {{name}}"
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["templates"]["welcome"]["subject"] == new_subject


# -------------- CEO: User admin --------------
class TestCEOUserAdmin:
    def test_patch_user(self, ceo_token, studio_user):
        uid = studio_user["user"]["id"]
        r = requests.patch(f"{API}/ceo/users", headers=auth_h(ceo_token), json={
            "user_id": uid, "badge": "gold", "status": "suspended", "plan": "creator"
        }, timeout=10)
        assert r.status_code == 200
        users = requests.get(f"{API}/ceo/users", headers=auth_h(ceo_token), timeout=10).json()["users"]
        u = next(x for x in users if x["id"] == uid)
        assert u["badge"] == "gold"
        assert u["is_affiliate"] is True

    def test_delete_self_blocked(self, ceo_token):
        # get ceo id
        users = requests.get(f"{API}/ceo/users", headers=auth_h(ceo_token), timeout=10).json()["users"]
        ceo = next(u for u in users if u["email"] == CEO_EMAIL)
        r = requests.delete(f"{API}/ceo/users/{ceo['id']}", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 400

    def test_delete_user(self, ceo_token):
        # create disposable user
        uniq = uuid.uuid4().hex[:8]
        reg = requests.post(f"{API}/auth/register", json={
            "email": f"TEST_del_{uniq}@example.com", "password": "TestPass123!",
            "display_name": "Del", "username": f"del_{uniq}",
        }, timeout=10).json()
        uid = reg["user"]["id"]
        r = requests.delete(f"{API}/ceo/users/{uid}", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        users = requests.get(f"{API}/ceo/users", headers=auth_h(ceo_token), timeout=10).json()["users"]
        assert not any(u["id"] == uid for u in users)


# -------------- Moderation --------------
class TestModeration:
    def test_flag_then_resolve(self, ceo_token, studio_user):
        token = studio_user["token"]
        # studio user creates a post
        post = requests.post(f"{API}/community/posts", headers=auth_h(token),
                             json={"body": "TEST flagged"}, timeout=10).json()["post"]
        # ceo flags it (any auth user can flag)
        r = requests.post(f"{API}/community/flag", headers=auth_h(ceo_token), json={
            "target_type": "post", "target_id": post["id"], "reason": "spam"
        }, timeout=10)
        assert r.status_code == 200
        # list
        flags = requests.get(f"{API}/ceo/moderation", headers=auth_h(ceo_token), timeout=10).json()["flags"]
        match = next((f for f in flags if f["target_id"] == post["id"]), None)
        assert match is not None
        assert match["status"] == "open"
        # resolve
        r = requests.post(f"{API}/ceo/moderation/{match['id']}/resolve",
                          headers=auth_h(ceo_token),
                          json={"action": "dismiss", "note": "ok"}, timeout=10)
        assert r.status_code == 200
        flags = requests.get(f"{API}/ceo/moderation", headers=auth_h(ceo_token), timeout=10).json()["flags"]
        match2 = next(f for f in flags if f["id"] == match["id"])
        assert match2["status"] == "resolved"


# -------------- Dummy data --------------
class TestDummyData:
    def test_seed_and_clear(self, ceo_token):
        r = requests.post(f"{API}/ceo/dummy-data/seed", headers=auth_h(ceo_token), timeout=15)
        assert r.status_code == 200
        # at least 0 created (idempotent if rerun)
        r = requests.delete(f"{API}/ceo/dummy-data", headers=auth_h(ceo_token), timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "clients_removed" in body
        assert "projects_removed" in body
