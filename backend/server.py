"""ReelLab Studio backend - FastAPI + Motor (MongoDB)."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import random
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------- Config & DB ----------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
ACCESS_TTL = timedelta(days=7)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="ReelLab Studio API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("reellab")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")

bearer_scheme = HTTPBearer(auto_error=False)


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": now_utc() + ACCESS_TTL,
        "iat": now_utc(),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_ceo(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "ceo":
        raise HTTPException(status_code=403, detail="CEO access required")
    return user


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "display_name": u.get("display_name", ""),
        "username": u.get("username", ""),
        "role": u.get("role", "studio_owner"),
        "badge": u.get("badge", "none"),
        "is_studio": u.get("is_studio", False),
        "is_affiliate": u.get("is_affiliate", False),
        "company_name": u.get("company_name", ""),
        "logo_url": u.get("logo_url", ""),
        "photo_url": u.get("photo_url", ""),
        "bio": u.get("bio", ""),
        "website": u.get("website", ""),
        "social_handles": u.get("social_handles", {}),
        "phone": u.get("phone", ""),
        "legal_accepted": u.get("legal_accepted", False),
        "tutorial_completed": u.get("tutorial_completed", False),
        "theme": u.get("theme", "dark"),
        "stars_received": u.get("stars_received", 0),
        "created_at": u.get("created_at"),
    }


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str
    username: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class LegalIn(BaseModel):
    terms: bool
    code_of_conduct: bool
    tos: bool


class ProfileUpdateIn(BaseModel):
    display_name: Optional[str] = None
    username: Optional[str] = None
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    photo_url: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    social_handles: Optional[dict] = None
    theme: Optional[str] = None
    tutorial_completed: Optional[bool] = None


class ClientIn(BaseModel):
    name: str
    email: Optional[str] = ""
    company: Optional[str] = ""
    phone: Optional[str] = ""
    notes: Optional[str] = ""


class ProjectIn(BaseModel):
    name: str
    client_id: Optional[str] = None
    client_name: Optional[str] = ""
    deliverables: List[dict] = []
    scope: str = ""
    due_date: Optional[str] = None
    revision_rounds: int = 2
    budget: float = 0.0
    notes: str = ""


class ProjectStatusIn(BaseModel):
    status: str


class InvoiceItem(BaseModel):
    label: str
    amount: float


class InvoiceIn(BaseModel):
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    client_name: str
    items: List[InvoiceItem]
    due_date: Optional[str] = None
    notes: str = ""


class MessageIn(BaseModel):
    body: str


class ChecklistItemIn(BaseModel):
    text: str
    done: bool = False


class PostIn(BaseModel):
    body: str
    post_type: str = "text"
    media_url: str = ""


class CommentIn(BaseModel):
    body: str


class HelpQueryIn(BaseModel):
    query: str


class OverrideIn(BaseModel):
    project_id: str
    action: Literal["cancel", "force_status", "reject"]
    note: str
    new_status: Optional[str] = None


class BadgeAssignIn(BaseModel):
    user_id: str
    badge: Literal["none", "blue", "gold"]


# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": body.username.lower().strip()}):
        raise HTTPException(status_code=400, detail="Username taken")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(body.password),
        "display_name": body.display_name,
        "username": body.username.lower().strip(),
        "role": "studio_owner",
        "badge": "none",
        "is_studio": False,
        "is_affiliate": False,
        "company_name": "",
        "logo_url": "",
        "photo_url": "",
        "phone": "",
        "bio": "",
        "website": "",
        "social_handles": {},
        "legal_accepted": False,
        "tutorial_completed": False,
        "theme": "dark",
        "stars_received": 0,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": public_user(user)}


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


@api.post("/auth/legal-accept")
async def legal_accept(body: LegalIn, request: Request, user: dict = Depends(get_current_user)):
    if not (body.terms and body.code_of_conduct and body.tos):
        raise HTTPException(status_code=400, detail="All agreements required")
    ip = request.client.host if request.client else ""
    await db.users.update_one({"id": user["id"]}, {"$set": {"legal_accepted": True}})
    await db.legal_acceptance.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "terms_version": "1.0",
        "code_version": "1.0",
        "tos_version": "1.0",
        "accepted_at": now_iso(),
        "ip_address": ip,
    })
    return {"ok": True}


@api.patch("/auth/profile")
async def update_profile(body: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "username" in upd:
        upd["username"] = upd["username"].lower().strip()
        clash = await db.users.find_one({"username": upd["username"], "id": {"$ne": user["id"]}})
        if clash:
            raise HTTPException(status_code=400, detail="Username taken")
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"user": public_user(fresh)}


# ---------- Clients ----------
@api.get("/clients")
async def list_clients(user: dict = Depends(get_current_user)):
    items = await db.clients.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"clients": items}


@api.post("/clients")
async def create_client(body: ClientIn, user: dict = Depends(get_current_user)):
    c = {"id": str(uuid.uuid4()), "owner_id": user["id"], **body.model_dump(), "created_at": now_iso()}
    await db.clients.insert_one(c)
    c.pop("_id", None)
    return {"client": c}


@api.get("/clients/{cid}")
async def get_client(cid: str, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": cid, "owner_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    projects = await db.projects.find({"client_id": cid, "owner_id": user["id"]}, {"_id": 0}).to_list(200)
    return {"client": c, "projects": projects}


@api.delete("/clients/{cid}")
async def delete_client(cid: str, user: dict = Depends(get_current_user)):
    await db.clients.delete_one({"id": cid, "owner_id": user["id"]})
    return {"ok": True}


# ---------- Projects ----------
@api.get("/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    items = await db.projects.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"projects": items}


@api.post("/projects")
async def create_project(body: ProjectIn, user: dict = Depends(get_current_user)):
    p = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        **body.model_dump(),
        "status": "draft",
        "demo": False,
        "checklist": [],
        "messages": [],
        "deliverable_versions": [],
        "team": [],
        "created_at": now_iso(),
    }
    await db.projects.insert_one(p)
    p.pop("_id", None)
    return {"project": p}


@api.get("/projects/{pid}")
async def get_project(pid: str, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    # Allow owner or CEO
    if p["owner_id"] != user["id"] and user["role"] != "ceo":
        raise HTTPException(status_code=403, detail="Forbidden")
    invoices = await db.invoices.find({"project_id": pid}, {"_id": 0}).to_list(100)
    return {"project": p, "invoices": invoices}


@api.patch("/projects/{pid}/status")
async def set_project_status(pid: str, body: ProjectStatusIn, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    if p["owner_id"] != user["id"] and user["role"] != "ceo":
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.projects.update_one({"id": pid}, {"$set": {"status": body.status}})
    return {"ok": True}


@api.delete("/projects/{pid}")
async def delete_project(pid: str, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": pid})
    if not p:
        return {"ok": True}
    if p["owner_id"] != user["id"] and user["role"] != "ceo":
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.projects.delete_one({"id": pid})
    return {"ok": True}


@api.post("/projects/{pid}/messages")
async def add_message(pid: str, body: MessageIn, user: dict = Depends(get_current_user)):
    msg = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "author_name": user.get("display_name") or user["email"],
        "body": body.body,
        "created_at": now_iso(),
    }
    await db.projects.update_one({"id": pid}, {"$push": {"messages": msg}})
    return {"message": msg}


@api.post("/projects/{pid}/checklist")
async def add_checklist(pid: str, body: ChecklistItemIn, user: dict = Depends(get_current_user)):
    item = {"id": str(uuid.uuid4()), **body.model_dump()}
    await db.projects.update_one({"id": pid}, {"$push": {"checklist": item}})
    return {"item": item}


@api.patch("/projects/{pid}/checklist/{iid}")
async def toggle_checklist(pid: str, iid: str, body: ChecklistItemIn, user: dict = Depends(get_current_user)):
    await db.projects.update_one(
        {"id": pid, "checklist.id": iid},
        {"$set": {"checklist.$.done": body.done, "checklist.$.text": body.text}},
    )
    return {"ok": True}


# ---------- AI Editor ----------
def _generate_ai_clips() -> List[dict]:
    presets = [
        ("Opening hook", "highlight", 0.97, 8),
        ("Key quote", "quote", 0.94, 15),
        ("Reaction shot", "reaction", 0.88, 6),
        ("Product reveal", "highlight", 0.96, 12),
        ("B-roll: hands", "broll", 0.82, 9),
        ("Emotional beat", "highlight", 0.91, 11),
        ("Call to action", "quote", 0.89, 14),
        ("End card moment", "highlight", 0.85, 10),
    ]
    clips = []
    start = 5
    for label, cat, conf, dur in presets:
        clips.append({
            "id": str(uuid.uuid4()),
            "label": label,
            "category": cat,
            "confidence": conf,
            "start_seconds": start,
            "end_seconds": start + dur,
            "duration": dur,
            "accepted": False,
        })
        start += dur + random.randint(3, 12)
    return clips


@api.post("/ai/upload")
async def ai_upload(payload: dict, user: dict = Depends(get_current_user)):
    """Simulated upload — creates a video project ready for AI processing."""
    project_id = payload.get("project_id")
    filename = payload.get("filename", "raw_footage.mp4")
    duration = payload.get("duration_seconds", 180)
    vp = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "project_id": project_id,
        "filename": filename,
        "duration_seconds": duration,
        "status": "processing",
        "payment_status": "paid",  # mocked
        "payment_amount": 19.0,
        "ai_clips": [],
        "timeline": [],
        "created_at": now_iso(),
    }
    await db.video_projects.insert_one(vp)
    vp.pop("_id", None)
    return {"video_project": vp}


@api.post("/ai/process/{vpid}")
async def ai_process(vpid: str, user: dict = Depends(get_current_user)):
    """Simulated AI processing — instantly generates clips."""
    vp = await db.video_projects.find_one({"id": vpid, "owner_id": user["id"]})
    if not vp:
        raise HTTPException(status_code=404, detail="Not found")
    clips = _generate_ai_clips()
    await db.video_projects.update_one(
        {"id": vpid},
        {"$set": {"status": "ready", "ai_clips": clips, "processed_at": now_iso()}},
    )
    return {"clips": clips, "status": "ready"}


@api.get("/ai/projects")
async def list_video_projects(user: dict = Depends(get_current_user)):
    items = await db.video_projects.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"video_projects": items}


@api.get("/ai/projects/{vpid}")
async def get_video_project(vpid: str, user: dict = Depends(get_current_user)):
    vp = await db.video_projects.find_one({"id": vpid, "owner_id": user["id"]}, {"_id": 0})
    if not vp:
        raise HTTPException(status_code=404, detail="Not found")
    return {"video_project": vp}


@api.patch("/ai/projects/{vpid}/timeline")
async def save_timeline(vpid: str, payload: dict, user: dict = Depends(get_current_user)):
    timeline = payload.get("timeline", [])
    await db.video_projects.update_one(
        {"id": vpid, "owner_id": user["id"]},
        {"$set": {"timeline": timeline, "last_saved": now_iso()}},
    )
    return {"ok": True}


@api.post("/ai/projects/{vpid}/auto-edit")
async def auto_edit(vpid: str, payload: dict, user: dict = Depends(get_current_user)):
    """Simulated AI auto-edit — returns a built timeline."""
    target = payload.get("target", "tiktok")
    duration = payload.get("duration", 60)
    vp = await db.video_projects.find_one({"id": vpid, "owner_id": user["id"]})
    if not vp:
        raise HTTPException(status_code=404, detail="Not found")
    clips = vp.get("ai_clips", [])
    # Pick top-confidence clips fitting duration
    timeline = []
    total = 0
    sorted_clips = sorted(clips, key=lambda c: -c["confidence"])
    for c in sorted_clips:
        if total + c["duration"] <= duration:
            timeline.append({**c, "track": "video", "tl_start": total})
            total += c["duration"]
    await db.video_projects.update_one({"id": vpid}, {"$set": {"timeline": timeline}})
    return {"timeline": timeline, "target": target, "total_duration": total}


# ---------- Invoices ----------
@api.get("/invoices")
async def list_invoices(user: dict = Depends(get_current_user)):
    items = await db.invoices.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"invoices": items}


@api.post("/invoices")
async def create_invoice(body: InvoiceIn, user: dict = Depends(get_current_user)):
    total = sum(i.amount for i in body.items)
    inv = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "number": f"INV-{random.randint(1000, 9999)}",
        **body.model_dump(),
        "total": total,
        "status": "draft",
        "created_at": now_iso(),
    }
    await db.invoices.insert_one(inv)
    inv.pop("_id", None)
    return {"invoice": inv}


@api.patch("/invoices/{iid}/status")
async def update_invoice_status(iid: str, payload: dict, user: dict = Depends(get_current_user)):
    new_status = payload.get("status", "sent")
    await db.invoices.update_one({"id": iid, "owner_id": user["id"]}, {"$set": {"status": new_status}})
    return {"ok": True}


@api.post("/invoices/{iid}/pay")
async def mock_pay_invoice(iid: str, user: dict = Depends(get_current_user)):
    """Mocked Stripe payment — instantly marks invoice as paid."""
    await db.invoices.update_one({"id": iid}, {"$set": {"status": "paid", "paid_at": now_iso()}})
    return {"ok": True, "mocked": True}


# ---------- Community ----------
@api.get("/community/posts")
async def list_posts(user: dict = Depends(get_current_user)):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    # enrich author info
    author_ids = list({p["author_id"] for p in posts})
    authors = await db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    amap = {a["id"]: a for a in authors}
    for p in posts:
        a = amap.get(p["author_id"], {})
        p["author"] = {
            "id": a.get("id"),
            "display_name": a.get("display_name", "User"),
            "username": a.get("username", ""),
            "photo_url": a.get("photo_url", ""),
            "badge": a.get("badge", "none"),
        }
    return {"posts": posts}


@api.post("/community/posts")
async def create_post(body: PostIn, user: dict = Depends(get_current_user)):
    post = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "body": body.body,
        "post_type": body.post_type,
        "media_url": body.media_url,
        "likes": [],
        "comments": [],
        "created_at": now_iso(),
    }
    await db.posts.insert_one(post)
    post.pop("_id", None)
    post["author"] = {
        "id": user["id"],
        "display_name": user.get("display_name", "User"),
        "username": user.get("username", ""),
        "photo_url": user.get("photo_url", ""),
        "badge": user.get("badge", "none"),
    }
    return {"post": post}


@api.post("/community/posts/{post_id}/like")
async def toggle_like(post_id: str, user: dict = Depends(get_current_user)):
    p = await db.posts.find_one({"id": post_id})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    likes = p.get("likes", [])
    if user["id"] in likes:
        await db.posts.update_one({"id": post_id}, {"$pull": {"likes": user["id"]}})
        liked = False
    else:
        await db.posts.update_one({"id": post_id}, {"$addToSet": {"likes": user["id"]}})
        liked = True
    return {"liked": liked}


@api.post("/community/posts/{post_id}/comment")
async def add_comment(post_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
    c = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "author_name": user.get("display_name", "User"),
        "body": body.body,
        "created_at": now_iso(),
    }
    await db.posts.update_one({"id": post_id}, {"$push": {"comments": c}})
    return {"comment": c}


@api.post("/community/stars/{recipient_id}")
async def send_star(recipient_id: str, user: dict = Depends(get_current_user)):
    if recipient_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot star yourself")
    # 1 star per recipient per day
    today = now_utc().date().isoformat()
    existing = await db.star_transactions.find_one({
        "sender_id": user["id"],
        "recipient_id": recipient_id,
        "date": today,
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already sent today")
    await db.star_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "recipient_id": recipient_id,
        "points": 10,
        "date": today,
        "sent_at": now_iso(),
    })
    await db.users.update_one({"id": recipient_id}, {"$inc": {"stars_received": 1}})
    return {"ok": True, "points_awarded": 10}


@api.get("/community/members")
async def list_members(user: dict = Depends(get_current_user)):
    members = await db.users.find(
        {"id": {"$ne": user["id"]}},
        {"_id": 0, "password_hash": 0, "stars_received": 0},
    ).limit(100).to_list(100)
    return {"members": [public_user(m) for m in members]}


# ---------- Help Bot (FAQ keyword match) ----------
FAQ = [
    {"id": "1", "category": "Getting Started", "q": "How do I create a project?", "a": "Click 'New Project' on the Dashboard. The 5-step wizard walks you through selecting a client, defining deliverables, scope, review settings, then confirmation.", "k": ["create", "new", "project", "start"]},
    {"id": "2", "category": "AI Editing", "q": "How does AI moment detection work?", "a": "After upload, ReelLab analyzes speech energy, visual motion, scene changes, face detection, and audio peaks to surface your best moments with confidence scores.", "k": ["ai", "moment", "detection", "clip", "auto"]},
    {"id": "3", "category": "AI Editing", "q": "What video formats are supported?", "a": "MP4, MOV, MKV, AVI — up to 4GB per upload.", "k": ["format", "mp4", "mov", "mkv", "avi", "upload", "size"]},
    {"id": "4", "category": "Review & Revisions", "q": "How many revision rounds are included?", "a": "Two revision rounds are included per project. Additional rounds are billed separately.", "k": ["revision", "rounds", "revisions"]},
    {"id": "5", "category": "Invoicing & Payments", "q": "How do clients pay invoices?", "a": "Invoices include a Stripe payment link. Clients pay via credit card and the invoice auto-updates to 'paid'.", "k": ["invoice", "pay", "payment", "stripe"]},
    {"id": "6", "category": "Community & Stars", "q": "What is the stars system?", "a": "Send one star per user per day. Each star awards the recipient 10 points. You cannot see your own star count.", "k": ["star", "stars", "points", "community"]},
    {"id": "7", "category": "Plans & Pricing", "q": "How much does ReelLab cost?", "a": "Each project upload includes processing. Studio plan adds Stripe Connect for invoicing and the blue verified badge. See the pricing page for the latest rates.", "k": ["price", "pricing", "cost", "plan", "studio"]},
    {"id": "8", "category": "Account & Settings", "q": "How do I toggle dark mode?", "a": "Click the sun/moon icon in the top navigation. Your preference is saved to your profile.", "k": ["dark", "light", "mode", "theme"]},
    {"id": "9", "category": "Team & Collaboration", "q": "How do I invite a teammate?", "a": "Go to your project's Team tab and invite by email. You can assign Editor or Viewer roles.", "k": ["team", "invite", "collaborate"]},
    {"id": "10", "category": "Contact & Support", "q": "How do I contact support?", "a": "Email support@reellabstudio.com or click 'Reach out to support' in the help bot.", "k": ["support", "help", "contact", "email"]},
]


@api.get("/faq")
async def list_faq():
    return {"faq": FAQ}


@api.post("/help/query")
async def help_query(body: HelpQueryIn):
    q = body.query.lower()
    scored = []
    for entry in FAQ:
        score = 0
        for kw in entry["k"]:
            if kw in q:
                score += 2
        # weak match against question text
        for word in entry["q"].lower().split():
            if len(word) > 3 and word in q:
                score += 1
        if score > 0:
            scored.append((score, entry))
    scored.sort(key=lambda x: -x[0])
    if scored and scored[0][0] >= 2:
        best = scored[0][1]
        return {"match": True, "confidence": "high" if scored[0][0] >= 4 else "medium", "answer": best["a"], "question": best["q"]}
    return {"match": False, "answer": None, "suggestion": "Try rephrasing or reach out to support@reellabstudio.com"}


# ---------- CEO Back Office ----------
@api.get("/ceo/overview")
async def ceo_overview(user: dict = Depends(require_ceo)):
    user_count = await db.users.count_documents({})
    project_count = await db.projects.count_documents({})
    invoice_count = await db.invoices.count_documents({})
    paid_count = await db.invoices.count_documents({"status": "paid"})
    post_count = await db.posts.count_documents({})
    return {
        "users": user_count,
        "projects": project_count,
        "invoices": invoice_count,
        "paid_invoices": paid_count,
        "community_posts": post_count,
    }


@api.get("/ceo/users")
async def ceo_users(user: dict = Depends(require_ceo)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"users": [public_user(u) for u in users]}


@api.get("/ceo/projects")
async def ceo_projects(user: dict = Depends(require_ceo)):
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    return {"projects": projects}


@api.post("/ceo/override")
async def ceo_override(body: OverrideIn, user: dict = Depends(require_ceo)):
    p = await db.projects.find_one({"id": body.project_id})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    new_status = body.new_status or {"cancel": "cancelled", "reject": "rejected"}.get(body.action, "draft")
    await db.projects.update_one({"id": body.project_id}, {"$set": {"status": new_status, "ceo_override_note": body.note}})
    await db.activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "ceo_id": user["id"],
        "project_id": body.project_id,
        "action": body.action,
        "note": body.note,
        "at": now_iso(),
    })
    return {"ok": True, "new_status": new_status}


@api.post("/ceo/badge")
async def ceo_assign_badge(body: BadgeAssignIn, user: dict = Depends(require_ceo)):
    is_studio = body.badge == "blue"
    is_aff = body.badge == "gold"
    await db.users.update_one(
        {"id": body.user_id},
        {"$set": {"badge": body.badge, "is_studio": is_studio, "is_affiliate": is_aff}},
    )
    return {"ok": True}


@api.get("/ceo/activity")
async def ceo_activity(user: dict = Depends(require_ceo)):
    rows = await db.activity_log.find({}, {"_id": 0}).sort("at", -1).limit(200).to_list(200)
    return {"activity": rows}


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    # Indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username", unique=True, sparse=True)
        await db.projects.create_index("owner_id")
        await db.clients.create_index("owner_id")
        await db.invoices.create_index("owner_id")
        await db.posts.create_index("created_at")
        await db.star_transactions.create_index([("sender_id", 1), ("recipient_id", 1), ("date", 1)], unique=True)
    except Exception as e:
        logger.warning(f"index setup: {e}")

    # Seed CEO
    ceo_email = os.environ["CEO_EMAIL"].lower()
    ceo_password = os.environ["CEO_PASSWORD"]
    existing = await db.users.find_one({"email": ceo_email})
    if not existing:
        ceo = {
            "id": str(uuid.uuid4()),
            "email": ceo_email,
            "password_hash": hash_password(ceo_password),
            "display_name": "ReelLab CEO",
            "username": "ceo",
            "role": "ceo",
            "badge": "none",
            "is_studio": True,
            "is_affiliate": False,
            "company_name": "ReelLab Studio",
            "logo_url": "",
            "photo_url": "",
            "phone": "",
            "bio": "Founder of ReelLab Studio.",
            "website": "https://reellabstudio.com",
            "social_handles": {},
            "legal_accepted": True,
            "tutorial_completed": True,
            "theme": "dark",
            "stars_received": 0,
            "created_at": now_iso(),
        }
        await db.users.insert_one(ceo)
        logger.info(f"Seeded CEO {ceo_email}")
    else:
        # Keep password in sync with .env if changed
        if not verify_password(ceo_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": ceo_email},
                {"$set": {"password_hash": hash_password(ceo_password), "role": "ceo"}},
            )
            logger.info("Updated CEO password from .env")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------- Health ----------
@api.get("/")
async def root():
    return {"app": "ReelLab Studio API", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
