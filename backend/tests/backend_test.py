"""ReelLab Studio backend regression tests.

Covers: auth, clients, projects, AI editor, invoices, community, help bot, CEO endpoints.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://reellab-backoffice.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CEO_EMAIL = "ceo@reellabstudio.com"
CEO_PASSWORD = os.environ.get("CEO_PASSWORD", "")


# -------------------- Fixtures --------------------
@pytest.fixture(scope="session")
def ceo_token():
    r = requests.post(f"{API}/auth/login", json={"email": CEO_EMAIL, "password": CEO_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"CEO login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "ceo"
    return data["token"]


@pytest.fixture(scope="session")
def studio_user():
    """Register a fresh studio owner; return {token, user}."""
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_studio_{uniq}@example.com",
        "password": "TestPass123!",
        "display_name": f"Test Studio {uniq}",
        "username": f"test_studio_{uniq}",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["token"], "user": data["user"], "password": payload["password"]}


def auth_h(tok):
    return {"Authorization": f"Bearer {tok}"}


# -------------------- Auth --------------------
class TestAuth:
    def test_health(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_ceo_login(self, ceo_token):
        assert isinstance(ceo_token, str) and len(ceo_token) > 20

    def test_register_then_me(self, studio_user):
        token = studio_user["token"]
        r = requests.get(f"{API}/auth/me", headers=auth_h(token), timeout=10)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == studio_user["user"]["email"]
        assert u["role"] == "studio_owner"
        assert u["legal_accepted"] is False

    def test_register_duplicate_email(self, studio_user):
        r = requests.post(f"{API}/auth/register", json={
            "email": studio_user["user"]["email"],
            "password": "anotherpass",
            "display_name": "Dup",
            "username": f"dup_{uuid.uuid4().hex[:6]}",
        }, timeout=10)
        assert r.status_code == 400

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": CEO_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_legal_accept_requires_all(self, studio_user):
        token = studio_user["token"]
        r = requests.post(f"{API}/auth/legal-accept", headers=auth_h(token),
                          json={"terms": True, "code_of_conduct": False, "tos": True}, timeout=10)
        assert r.status_code == 400

        r2 = requests.post(f"{API}/auth/legal-accept", headers=auth_h(token),
                           json={"terms": True, "code_of_conduct": True, "tos": True}, timeout=10)
        assert r2.status_code == 200

        me = requests.get(f"{API}/auth/me", headers=auth_h(token), timeout=10).json()["user"]
        assert me["legal_accepted"] is True

    def test_profile_update(self, studio_user):
        token = studio_user["token"]
        r = requests.patch(f"{API}/auth/profile", headers=auth_h(token),
                           json={"bio": "Test bio", "company_name": "TestCo", "theme": "light"}, timeout=10)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["bio"] == "Test bio"
        assert u["company_name"] == "TestCo"
        assert u["theme"] == "light"


# -------------------- Clients --------------------
class TestClients:
    def test_client_crud(self, studio_user):
        token = studio_user["token"]
        # create
        r = requests.post(f"{API}/clients", headers=auth_h(token),
                          json={"name": "TEST_Acme", "email": "a@a.com", "company": "Acme"}, timeout=10)
        assert r.status_code == 200
        c = r.json()["client"]
        assert c["name"] == "TEST_Acme"
        cid = c["id"]
        # list
        lst = requests.get(f"{API}/clients", headers=auth_h(token), timeout=10).json()["clients"]
        assert any(x["id"] == cid for x in lst)
        # get
        r = requests.get(f"{API}/clients/{cid}", headers=auth_h(token), timeout=10)
        assert r.status_code == 200
        assert r.json()["client"]["id"] == cid
        # delete
        r = requests.delete(f"{API}/clients/{cid}", headers=auth_h(token), timeout=10)
        assert r.status_code == 200
        # verify deleted
        r = requests.get(f"{API}/clients/{cid}", headers=auth_h(token), timeout=10)
        assert r.status_code == 404

    def test_clients_require_auth(self):
        r = requests.get(f"{API}/clients", timeout=10)
        assert r.status_code == 401


# -------------------- Projects --------------------
class TestProjects:
    def test_project_full_flow(self, studio_user):
        token = studio_user["token"]
        # create
        r = requests.post(f"{API}/projects", headers=auth_h(token),
                          json={"name": "TEST_Project1", "client_name": "Acme", "scope": "Edit reel",
                                "deliverables": [{"label": "60s cut"}], "revision_rounds": 2, "budget": 500}, timeout=10)
        assert r.status_code == 200
        p = r.json()["project"]
        pid = p["id"]
        assert p["status"] == "draft"
        # list
        lst = requests.get(f"{API}/projects", headers=auth_h(token), timeout=10).json()["projects"]
        assert any(x["id"] == pid for x in lst)
        # patch status
        r = requests.patch(f"{API}/projects/{pid}/status", headers=auth_h(token),
                           json={"status": "in_progress"}, timeout=10)
        assert r.status_code == 200
        got = requests.get(f"{API}/projects/{pid}", headers=auth_h(token), timeout=10).json()["project"]
        assert got["status"] == "in_progress"
        # add message
        r = requests.post(f"{API}/projects/{pid}/messages", headers=auth_h(token),
                          json={"body": "Hello"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["message"]["body"] == "Hello"
        # add checklist
        r = requests.post(f"{API}/projects/{pid}/checklist", headers=auth_h(token),
                          json={"text": "Color grade", "done": False}, timeout=10)
        assert r.status_code == 200
        iid = r.json()["item"]["id"]
        # toggle checklist
        r = requests.patch(f"{API}/projects/{pid}/checklist/{iid}", headers=auth_h(token),
                           json={"text": "Color grade", "done": True}, timeout=10)
        assert r.status_code == 200
        # verify persisted
        got = requests.get(f"{API}/projects/{pid}", headers=auth_h(token), timeout=10).json()["project"]
        assert any(c["id"] == iid and c["done"] is True for c in got["checklist"])
        assert len(got["messages"]) == 1
        # delete
        r = requests.delete(f"{API}/projects/{pid}", headers=auth_h(token), timeout=10)
        assert r.status_code == 200
        r = requests.get(f"{API}/projects/{pid}", headers=auth_h(token), timeout=10)
        assert r.status_code == 404


# -------------------- AI Editor --------------------
class TestAIEditor:
    def test_ai_full_flow(self, studio_user):
        token = studio_user["token"]
        # upload
        r = requests.post(f"{API}/ai/upload", headers=auth_h(token),
                          json={"filename": "raw.mp4", "duration_seconds": 180}, timeout=15)
        assert r.status_code == 200
        vp = r.json()["video_project"]
        assert vp["status"] == "processing"
        assert vp["payment_status"] == "paid"
        vpid = vp["id"]
        # process
        r = requests.post(f"{API}/ai/process/{vpid}", headers=auth_h(token), json={}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ready"
        assert len(data["clips"]) == 8
        # list
        lst = requests.get(f"{API}/ai/projects", headers=auth_h(token), timeout=10).json()["video_projects"]
        assert any(x["id"] == vpid for x in lst)
        # save timeline
        timeline = [{"id": data["clips"][0]["id"], "tl_start": 0}]
        r = requests.patch(f"{API}/ai/projects/{vpid}/timeline", headers=auth_h(token),
                           json={"timeline": timeline}, timeout=10)
        assert r.status_code == 200
        # auto edit
        r = requests.post(f"{API}/ai/projects/{vpid}/auto-edit", headers=auth_h(token),
                          json={"target": "tiktok", "duration": 60}, timeout=15)
        assert r.status_code == 200
        out = r.json()
        assert out["total_duration"] <= 60
        assert len(out["timeline"]) > 0


# -------------------- Invoices --------------------
class TestInvoices:
    def test_invoice_flow(self, studio_user):
        token = studio_user["token"]
        # create
        r = requests.post(f"{API}/invoices", headers=auth_h(token),
                          json={"client_name": "TEST_Client",
                                "items": [{"label": "Edit", "amount": 500}, {"label": "VFX", "amount": 250}]},
                          timeout=10)
        assert r.status_code == 200
        inv = r.json()["invoice"]
        assert inv["total"] == 750
        assert inv["status"] == "draft"
        iid = inv["id"]
        # patch status
        r = requests.patch(f"{API}/invoices/{iid}/status", headers=auth_h(token),
                           json={"status": "sent"}, timeout=10)
        assert r.status_code == 200
        # pay
        r = requests.post(f"{API}/invoices/{iid}/pay", headers=auth_h(token), json={}, timeout=10)
        assert r.status_code == 200
        assert r.json().get("mocked") is True
        # verify
        lst = requests.get(f"{API}/invoices", headers=auth_h(token), timeout=10).json()["invoices"]
        target = next(x for x in lst if x["id"] == iid)
        assert target["status"] == "paid"


# -------------------- Community --------------------
class TestCommunity:
    def test_post_like_comment(self, studio_user, ceo_token):
        token = studio_user["token"]
        # create post
        r = requests.post(f"{API}/community/posts", headers=auth_h(token),
                          json={"body": "TEST_post from studio", "post_type": "text"}, timeout=10)
        assert r.status_code == 200
        post = r.json()["post"]
        pid = post["id"]
        assert post["author"]["display_name"]
        # list
        posts = requests.get(f"{API}/community/posts", headers=auth_h(token), timeout=10).json()["posts"]
        assert any(p["id"] == pid for p in posts)
        # like by CEO
        r = requests.post(f"{API}/community/posts/{pid}/like", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["liked"] is True
        # toggle off
        r = requests.post(f"{API}/community/posts/{pid}/like", headers=auth_h(ceo_token), timeout=10)
        assert r.json()["liked"] is False
        # comment
        r = requests.post(f"{API}/community/posts/{pid}/comment", headers=auth_h(ceo_token),
                          json={"body": "Nice!"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["comment"]["body"] == "Nice!"

    def test_members(self, studio_user):
        token = studio_user["token"]
        r = requests.get(f"{API}/community/members", headers=auth_h(token), timeout=10)
        assert r.status_code == 200
        members = r.json()["members"]
        assert isinstance(members, list)
        # self should not be in list
        assert not any(m["id"] == studio_user["user"]["id"] for m in members)

    def test_send_star(self, studio_user, ceo_token):
        # CEO sends a star to studio user
        recipient_id = studio_user["user"]["id"]
        r = requests.post(f"{API}/community/stars/{recipient_id}", headers=auth_h(ceo_token), timeout=10)
        # could be 200 or 400 if already sent today (rerun)
        assert r.status_code in (200, 400)
        if r.status_code == 200:
            assert r.json()["points_awarded"] == 10
            # second time same day -> 400
            r2 = requests.post(f"{API}/community/stars/{recipient_id}", headers=auth_h(ceo_token), timeout=10)
            assert r2.status_code == 400

    def test_star_self_blocked(self, studio_user):
        token = studio_user["token"]
        rid = studio_user["user"]["id"]
        r = requests.post(f"{API}/community/stars/{rid}", headers=auth_h(token), timeout=10)
        assert r.status_code == 400


# -------------------- Help Bot --------------------
class TestHelpBot:
    def test_match(self):
        r = requests.post(f"{API}/help/query", json={"query": "How do I create a project?"}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["match"] is True
        assert "project" in d["answer"].lower() or "wizard" in d["answer"].lower()

    def test_no_match(self):
        r = requests.post(f"{API}/help/query", json={"query": "xyzzy nonsense quux"}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["match"] is False

    def test_faq_list(self):
        r = requests.get(f"{API}/faq", timeout=10)
        assert r.status_code == 200
        assert len(r.json()["faq"]) >= 10


# -------------------- CEO --------------------
class TestCEO:
    def test_overview(self, ceo_token):
        r = requests.get(f"{API}/ceo/overview", headers=auth_h(ceo_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("users", "projects", "invoices", "paid_invoices", "community_posts"):
            assert k in d

    def test_ceo_endpoints_forbidden_for_non_ceo(self, studio_user):
        token = studio_user["token"]
        for path in ("/ceo/overview", "/ceo/users", "/ceo/projects", "/ceo/activity"):
            r = requests.get(f"{API}{path}", headers=auth_h(token), timeout=10)
            assert r.status_code == 403, f"{path} expected 403, got {r.status_code}"

    def test_ceo_users_and_projects(self, ceo_token):
        u = requests.get(f"{API}/ceo/users", headers=auth_h(ceo_token), timeout=10)
        assert u.status_code == 200
        assert len(u.json()["users"]) >= 1
        p = requests.get(f"{API}/ceo/projects", headers=auth_h(ceo_token), timeout=10)
        assert p.status_code == 200

    def test_ceo_override_and_activity(self, ceo_token, studio_user):
        # create a project as studio user
        token = studio_user["token"]
        r = requests.post(f"{API}/projects", headers=auth_h(token),
                          json={"name": "TEST_Override", "client_name": "X"}, timeout=10)
        pid = r.json()["project"]["id"]
        # CEO overrides
        r = requests.post(f"{API}/ceo/override", headers=auth_h(ceo_token),
                          json={"project_id": pid, "action": "cancel", "note": "Test override"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["new_status"] == "cancelled"
        # activity log
        act = requests.get(f"{API}/ceo/activity", headers=auth_h(ceo_token), timeout=10).json()["activity"]
        assert any(a["project_id"] == pid and a["action"] == "cancel" for a in act)

    def test_ceo_badge_assign(self, ceo_token, studio_user):
        uid = studio_user["user"]["id"]
        r = requests.post(f"{API}/ceo/badge", headers=auth_h(ceo_token),
                          json={"user_id": uid, "badge": "blue"}, timeout=10)
        assert r.status_code == 200
        # verify
        users = requests.get(f"{API}/ceo/users", headers=auth_h(ceo_token), timeout=10).json()["users"]
        target = next(u for u in users if u["id"] == uid)
        assert target["badge"] == "blue"
        assert target["is_studio"] is True
