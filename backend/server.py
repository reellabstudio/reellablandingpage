"""ReelLab Studio backend - FastAPI + Motor (MongoDB)."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import random
import secrets
import smtplib
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# Stripe via emergentintegrations
try:
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest,
    )
    STRIPE_AVAILABLE = True
except Exception:
    STRIPE_AVAILABLE = False

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


class WaitlistIn(BaseModel):
    email: EmailStr
    source: str = "hero"


class FounderIn(BaseModel):
    name: str
    email: EmailStr
    creator_type: str = ""
    handle: str = ""


class FaqItem(BaseModel):
    category: str
    question: str
    answer: str
    keywords: List[str] = []


class PricingIn(BaseModel):
    plan: Literal["solo", "creator", "studio"]
    monthly: float
    yearly: float


class SettingsIn(BaseModel):
    key: str
    value: bool


class EmailTemplateIn(BaseModel):
    key: str
    subject: str
    body: str


class UserAdminIn(BaseModel):
    user_id: str
    plan: Optional[str] = None
    status: Optional[Literal["active", "pending", "suspended"]] = None
    badge: Optional[Literal["none", "blue", "gold"]] = None


class FlagIn(BaseModel):
    target_type: Literal["post", "comment", "user"]
    target_id: str
    reason: str


class ModerationResolveIn(BaseModel):
    action: Literal["dismiss", "remove", "warn", "suspend"]
    note: str = ""


# ─── Coupons / Access Control ───
class CouponIn(BaseModel):
    code: str
    label: str = ""
    discount_type: Literal["percent", "free"]
    discount_value: int = 0  # 1..99 when percent, 100 when free
    plan: Literal["solo", "creator", "studio"]
    assignment_type: Literal["email", "shareable"]
    assigned_email: Optional[str] = ""
    duration_type: Literal["fixed", "end_date", "unlimited"]
    duration_amount: Optional[int] = 0
    duration_unit: Optional[Literal["days", "months"]] = "days"
    end_date: Optional[str] = ""
    usage_limit_type: Literal["single", "limited", "unlimited"]
    usage_limit: Optional[int] = 1
    active: bool = True


class CouponValidateIn(BaseModel):
    code: str
    plan: Literal["solo", "creator", "studio"]
    email: Optional[EmailStr] = None


DEFAULT_PRICING = {
    "solo": {"monthly": 19.0, "yearly": 180.0},
    "creator": {"monthly": 49.0, "yearly": 468.0},
    "studio": {"monthly": 199.0, "yearly": 1908.0},
}

DEFAULT_SETTINGS = {
    "new_signups": True,
    "maintenance": False,
    "community": True,
    "affiliates": True,
    "dummy_data": True,
    "email_notifications": True,
}

DEFAULT_EMAILS = {
    "welcome": {"subject": "Welcome to ReelLab Studio ✦", "body": "Hi {{name}},\n\nWelcome to ReelLab. Your studio is ready — log in and create your first project.\n\n— The ReelLab Team"},
    "invoice_paid": {"subject": "Payment received — {{invoice_number}}", "body": "Hi {{name}},\n\nWe've received your payment of ${{amount}} for {{invoice_number}}. Thank you!\n\n— ReelLab"},
    "project_delivered": {"subject": "Your project is delivered 🎬", "body": "Hi {{name}},\n\nYour project '{{project_name}}' is ready for review.\n\n— ReelLab"},
    "founder_welcome": {"subject": "Welcome to the Founder Circle", "body": "Hi {{name}},\n\nYou're officially part of the ReelLab Founder Circle. We'll be in touch personally with early access details.\n\n— The Founders"},
    "password_reset": {"subject": "Reset your ReelLab password", "body": "Hi {{name}},\n\nYou requested a password reset. Click the link below to set a new password. This link expires in 30 minutes.\n\n{{reset_link}}\n\nIf you didn't request this, ignore this email.\n\n— ReelLab Support"},
}


# Stripe pricing (server-defined — never trust client)
STRIPE_PACKAGES = {
    "founder_circle": {"amount": 1.00, "label": "Founder Circle Membership", "description": "Lifetime status · first month of Creator free"},
    "solo_monthly": {"amount": 19.00, "label": "Solo Plan · Monthly"},
    "solo_yearly": {"amount": 180.00, "label": "Solo Plan · Yearly"},
    "creator_monthly": {"amount": 49.00, "label": "Creator Plan · Monthly"},
    "creator_yearly": {"amount": 468.00, "label": "Creator Plan · Yearly"},
    "studio_monthly": {"amount": 199.00, "label": "Studio Plan · Monthly"},
    "studio_yearly": {"amount": 1908.00, "label": "Studio Plan · Yearly"},
    "ai_processing": {"amount": 19.00, "label": "AI Video Processing"},
}

# Map package_id → plan key
PACKAGE_TO_PLAN = {
    "solo_monthly": "solo", "solo_yearly": "solo",
    "creator_monthly": "creator", "creator_yearly": "creator",
    "studio_monthly": "studio", "studio_yearly": "studio",
}

# Affiliate commission rates
COMMISSION_RATES = {"creator": 0.15, "studio": 0.30}


def get_stripe() -> Optional[StripeCheckout]:
    """Returns a configured StripeCheckout instance, or None if not available."""
    if not STRIPE_AVAILABLE:
        return None
    api_key = os.environ.get("STRIPE_API_KEY", "")
    if not api_key:
        return None
    return StripeCheckout(api_key=api_key, webhook_url="")  # webhook_url overridden per-call


def stripe_mock_mode() -> bool:
    """True when STRIPE_MODE=mock or STRIPE_API_KEY is the emergent placeholder."""
    mode = os.environ.get("STRIPE_MODE", "mock").lower()
    api_key = os.environ.get("STRIPE_API_KEY", "")
    return mode == "mock" or api_key in ("", "sk_test_emergent")


async def send_email(to_email: str, subject: str, body: str, html_body: Optional[str] = None) -> bool:
    """Send email via SMTP if configured, else log + return True (dev mode)."""
    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASSWORD", "")
    from_email = os.environ.get("SMTP_FROM_EMAIL", "support@reellabstudio.com")
    from_name = os.environ.get("SMTP_FROM_NAME", "ReelLab Support")

    if not smtp_host or not smtp_user or not smtp_pass:
        logger.info(f"[EMAIL MOCKED] To: {to_email} | Subject: {subject}\nBody:\n{body}")
        return True

    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(smtp_host, port, timeout=10) as s:
            s.starttls()
            s.login(smtp_user, smtp_pass)
            s.sendmail(from_email, [to_email], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"SMTP send failed: {e}")
        return False


def render_template(template_str: str, vars: dict) -> str:
    out = template_str
    for k, v in vars.items():
        out = out.replace("{{" + k + "}}", str(v))
    return out


def make_referral_code(user_id: str) -> str:
    """Stable 6-char referral code derived from user_id."""
    import hashlib
    h = hashlib.sha256(user_id.encode()).hexdigest()[:6].upper()
    return h


# ─── Additional Models ───
class CheckoutInitIn(BaseModel):
    package_id: Literal["founder_circle", "creator_monthly", "creator_yearly", "studio_monthly", "studio_yearly", "ai_processing", "solo_monthly", "solo_yearly"]
    origin_url: str
    name: Optional[str] = ""
    email: Optional[EmailStr] = None
    creator_type: Optional[str] = ""
    handle: Optional[str] = ""
    referral_code: Optional[str] = ""
    coupon_code: Optional[str] = ""
    ab_variant: Optional[str] = ""


class ABImpressionIn(BaseModel):
    page: str
    variant: str
    referral_code: Optional[str] = ""


class PasswordResetRequestIn(BaseModel):
    email: EmailStr


class PasswordResetConfirmIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


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


# ---------- Public: Waitlist & Founder Circle ----------
@api.post("/waitlist")
async def join_waitlist(body: WaitlistIn):
    email = body.email.lower().strip()
    existing = await db.waitlist.find_one({"email": email})
    if existing:
        # Idempotent — return success but flag
        return {"ok": True, "already_joined": True}
    entry = {
        "id": str(uuid.uuid4()),
        "email": email,
        "source": body.source,
        "joined_at": now_iso(),
        "status": "pending",
    }
    await db.waitlist.insert_one(entry)
    await db.activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "type": "amber",
        "text": f"<strong>{email}</strong> joined the waitlist",
        "at": now_iso(),
    })
    return {"ok": True, "already_joined": False}


@api.post("/founder-circle")
async def join_founder_circle(body: FounderIn):
    email = body.email.lower().strip()
    existing = await db.founders.find_one({"email": email})
    if existing:
        return {"ok": True, "already_joined": True}
    entry = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": email,
        "creator_type": body.creator_type,
        "handle": body.handle,
        "joined_at": now_iso(),
        "status": "applied",
    }
    await db.founders.insert_one(entry)
    await db.activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "type": "purple",
        "text": f"<strong>{body.name}</strong> joined the Founder Circle ({body.creator_type or 'creator'})",
        "at": now_iso(),
    })
    return {"ok": True, "already_joined": False}


# ---------- Public: Pricing & Public FAQ ----------
@api.get("/pricing")
async def get_pricing():
    doc = await db.settings.find_one({"key": "pricing"}, {"_id": 0})
    return {"pricing": doc.get("value", DEFAULT_PRICING) if doc else DEFAULT_PRICING}


@api.get("/public/faq")
async def public_faq():
    items = await db.faq.find({"published": True}, {"_id": 0}).sort("category", 1).to_list(200)
    if not items:
        return {"faq": FAQ}
    return {"faq": items}


# ---------- CEO: Waitlist & Founders ----------
@api.get("/ceo/waitlist")
async def ceo_waitlist(user: dict = Depends(require_ceo)):
    rows = await db.waitlist.find({}, {"_id": 0}).sort("joined_at", -1).to_list(1000)
    return {"waitlist": rows}


@api.get("/ceo/founders")
async def ceo_founders(user: dict = Depends(require_ceo)):
    rows = await db.founders.find({}, {"_id": 0}).sort("joined_at", -1).to_list(1000)
    return {"founders": rows}


# ---------- CEO: User admin ----------
@api.patch("/ceo/users")
async def ceo_update_user(body: UserAdminIn, user: dict = Depends(require_ceo)):
    upd = {}
    if body.plan is not None: upd["plan"] = body.plan
    if body.status is not None: upd["status"] = body.status
    if body.badge is not None:
        upd["badge"] = body.badge
        upd["is_studio"] = body.badge == "blue"
        upd["is_affiliate"] = body.badge == "gold"
    if upd:
        await db.users.update_one({"id": body.user_id}, {"$set": upd})
    return {"ok": True}


@api.delete("/ceo/users/{uid}")
async def ceo_delete_user(uid: str, user: dict = Depends(require_ceo)):
    if uid == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    await db.users.delete_one({"id": uid})
    return {"ok": True}


# ---------- CEO: FAQ Editor ----------
@api.get("/ceo/faq")
async def ceo_list_faq(user: dict = Depends(require_ceo)):
    items = await db.faq.find({}, {"_id": 0}).sort("category", 1).to_list(500)
    return {"faq": items}


@api.post("/ceo/faq")
async def ceo_create_faq(body: FaqItem, user: dict = Depends(require_ceo)):
    item = {
        "id": str(uuid.uuid4()),
        "category": body.category,
        "question": body.question,
        "answer": body.answer,
        "keywords": body.keywords,
        "published": True,
        "created_at": now_iso(),
    }
    await db.faq.insert_one(item)
    item.pop("_id", None)
    return {"faq": item}


@api.patch("/ceo/faq/{fid}")
async def ceo_update_faq(fid: str, body: FaqItem, user: dict = Depends(require_ceo)):
    await db.faq.update_one({"id": fid}, {"$set": body.model_dump()})
    return {"ok": True}


@api.delete("/ceo/faq/{fid}")
async def ceo_delete_faq(fid: str, user: dict = Depends(require_ceo)):
    await db.faq.delete_one({"id": fid})
    return {"ok": True}


# ---------- CEO: Pricing editor ----------
@api.put("/ceo/pricing")
async def ceo_update_pricing(body: PricingIn, user: dict = Depends(require_ceo)):
    existing = await db.settings.find_one({"key": "pricing"})
    current = existing.get("value", DEFAULT_PRICING) if existing else DEFAULT_PRICING.copy()
    current[body.plan] = {"monthly": body.monthly, "yearly": body.yearly}
    await db.settings.update_one(
        {"key": "pricing"},
        {"$set": {"value": current, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "pricing": current}


@api.post("/ceo/pricing/sync-stripe")
async def ceo_sync_stripe(user: dict = Depends(require_ceo)):
    """MOCKED — would push pricing to Stripe Products/Prices API."""
    await db.activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "type": "purple",
        "text": "<strong>CEO</strong> synced pricing to Stripe (MOCKED)",
        "at": now_iso(),
    })
    return {"ok": True, "mocked": True, "message": "Stripe sync simulated. Add live keys at deploy."}


# ---------- CEO: Platform settings ----------
@api.get("/ceo/settings")
async def ceo_get_settings(user: dict = Depends(require_ceo)):
    doc = await db.settings.find_one({"key": "platform"}, {"_id": 0})
    return {"settings": doc.get("value", DEFAULT_SETTINGS) if doc else DEFAULT_SETTINGS}


@api.put("/ceo/settings")
async def ceo_update_settings(body: SettingsIn, user: dict = Depends(require_ceo)):
    doc = await db.settings.find_one({"key": "platform"})
    current = doc.get("value", DEFAULT_SETTINGS.copy()) if doc else DEFAULT_SETTINGS.copy()
    current[body.key] = body.value
    await db.settings.update_one(
        {"key": "platform"},
        {"$set": {"value": current, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "settings": current}


# ---------- CEO: Email templates ----------
@api.get("/ceo/email-templates")
async def ceo_list_templates(user: dict = Depends(require_ceo)):
    doc = await db.settings.find_one({"key": "email_templates"}, {"_id": 0})
    return {"templates": doc.get("value", DEFAULT_EMAILS) if doc else DEFAULT_EMAILS}


@api.put("/ceo/email-templates")
async def ceo_update_template(body: EmailTemplateIn, user: dict = Depends(require_ceo)):
    doc = await db.settings.find_one({"key": "email_templates"})
    current = doc.get("value", DEFAULT_EMAILS.copy()) if doc else DEFAULT_EMAILS.copy()
    current[body.key] = {"subject": body.subject, "body": body.body}
    await db.settings.update_one(
        {"key": "email_templates"},
        {"$set": {"value": current, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "templates": current}


# ---------- CEO: Moderation ----------
@api.post("/community/flag")
async def flag_content(body: FlagIn, user: dict = Depends(get_current_user)):
    flag = {
        "id": str(uuid.uuid4()),
        "target_type": body.target_type,
        "target_id": body.target_id,
        "reason": body.reason,
        "reporter_id": user["id"],
        "status": "open",
        "created_at": now_iso(),
    }
    await db.moderation_flags.insert_one(flag)
    return {"ok": True}


@api.get("/ceo/moderation")
async def ceo_moderation(user: dict = Depends(require_ceo)):
    flags = await db.moderation_flags.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"flags": flags}


@api.post("/ceo/moderation/{fid}/resolve")
async def ceo_resolve_flag(fid: str, body: ModerationResolveIn, user: dict = Depends(require_ceo)):
    await db.moderation_flags.update_one(
        {"id": fid},
        {"$set": {"status": "resolved", "action": body.action, "note": body.note, "resolved_at": now_iso()}},
    )
    return {"ok": True}


# ---------- CEO: Dummy data ----------
@api.post("/ceo/dummy-data/seed")
async def ceo_seed_dummy(user: dict = Depends(require_ceo)):
    """Seed dummy projects/clients for demo. Marks them with demo=True."""
    dummy_clients = [
        {"name": "Oat & Co.", "email": "hello@oatco.example", "company": "Oat & Co."},
        {"name": "Maya Chen", "email": "maya@example.com", "company": "Maya Media"},
        {"name": "Northside Gym", "email": "info@northside.example", "company": "Northside Gym"},
        {"name": "Luma Studios", "email": "studio@luma.example", "company": "Luma Studios"},
    ]
    created = 0
    for c in dummy_clients:
        existing = await db.clients.find_one({"owner_id": user["id"], "name": c["name"]})
        if existing:
            continue
        await db.clients.insert_one({
            "id": str(uuid.uuid4()),
            "owner_id": user["id"],
            **c,
            "phone": "",
            "notes": "Demo client (clearable)",
            "demo": True,
            "created_at": now_iso(),
        })
        created += 1

    dummy_projects = [
        {"name": "Summer Campaign", "client_name": "Oat & Co.", "status": "editing"},
        {"name": "Podcast Clips S3", "client_name": "Maya Chen", "status": "review"},
        {"name": "Product Launch Reel", "client_name": "Northside Gym", "status": "delivered"},
        {"name": "Brand Story", "client_name": "Luma Studios", "status": "active"},
    ]
    for p in dummy_projects:
        existing = await db.projects.find_one({"owner_id": user["id"], "name": p["name"]})
        if existing:
            continue
        await db.projects.insert_one({
            "id": str(uuid.uuid4()),
            "owner_id": user["id"],
            "name": p["name"],
            "client_id": None,
            "client_name": p["client_name"],
            "deliverables": [{"title": "Main video", "format": "16:9", "duration": "60s"}],
            "scope": "Demo project",
            "due_date": "",
            "revision_rounds": 2,
            "budget": 1500,
            "notes": "",
            "status": p["status"],
            "demo": True,
            "checklist": [],
            "messages": [],
            "deliverable_versions": [],
            "team": [],
            "created_at": now_iso(),
        })
        created += 1
    return {"ok": True, "created": created}


@api.delete("/ceo/dummy-data")
async def ceo_clear_dummy(user: dict = Depends(require_ceo)):
    cl = await db.clients.delete_many({"demo": True})
    pr = await db.projects.delete_many({"demo": True})
    return {"ok": True, "clients_removed": cl.deleted_count, "projects_removed": pr.deleted_count}


# ---------- Startup ----------
# ─── Stripe / Payments ───
@api.post("/payments/checkout")
async def create_checkout(body: CheckoutInitIn, request: Request):
    if body.package_id not in STRIPE_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    pkg = STRIPE_PACKAGES[body.package_id]
    amount = float(pkg["amount"])

    # Coupon validation + discount application (server-side only — never trust client)
    coupon_applied = None
    free_via_coupon = False
    if body.coupon_code and body.package_id in PACKAGE_TO_PLAN:
        plan_key = PACKAGE_TO_PLAN[body.package_id]
        v = await _validate_coupon(body.coupon_code, plan_key, body.email)
        if not v["valid"]:
            raise HTTPException(status_code=400, detail=f"Coupon error: {v['reason']}")
        c = v["coupon"]
        if c["discount_type"] == "free":
            amount = 0.0
            free_via_coupon = True
        else:
            amount = round(amount * (1 - int(c["discount_value"]) / 100.0), 2)
        coupon_applied = c["code"]

    # Build URLs from frontend's origin (never hardcode)
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}&pkg={body.package_id}"
    cancel_url = f"{origin}/checkout/cancel?pkg={body.package_id}"

    metadata = {
        "package_id": body.package_id,
        "email": body.email or "",
        "name": body.name or "",
        "creator_type": body.creator_type or "",
        "handle": body.handle or "",
        "referral_code": body.referral_code or "",
        "coupon_code": coupon_applied or "",
        "ab_variant": body.ab_variant or "",
    }

    tx_id = str(uuid.uuid4())

    # 100%-free path — bypass Stripe entirely, mark paid immediately
    if free_via_coupon:
        fake_session = f"cs_free_{tx_id[:12]}"
        await db.payment_transactions.insert_one({
            "id": tx_id,
            "session_id": fake_session,
            "package_id": body.package_id,
            "amount": 0.0,
            "currency": "usd",
            "payment_status": "paid",
            "metadata": metadata,
            "mocked": True,
            "free_via_coupon": True,
            "created_at": now_iso(),
            "completed_at": now_iso(),
        })
        await _log_coupon_redemption(coupon_applied, body.email, body.package_id, 100.0, free=True)
        return {"url": f"{origin}/checkout/success?session_id={fake_session}&pkg={body.package_id}", "session_id": fake_session, "free": True, "mocked": True}

    if stripe_mock_mode():
        fake_session = f"cs_mock_{tx_id[:12]}"
        await db.payment_transactions.insert_one({
            "id": tx_id,
            "session_id": fake_session,
            "package_id": body.package_id,
            "amount": amount,
            "currency": "usd",
            "payment_status": "pending",
            "metadata": metadata,
            "mocked": True,
            "created_at": now_iso(),
        })
        return {"url": f"{origin}/checkout/mock?session_id={fake_session}&pkg={body.package_id}", "session_id": fake_session, "mocked": True}

    # Live Stripe path
    stripe = get_stripe()
    if not stripe:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    host_url = str(request.base_url)
    stripe.webhook_url = f"{host_url}api/webhook/stripe"

    req = CheckoutSessionRequest(amount=amount, currency="usd", success_url=success_url, cancel_url=cancel_url, metadata=metadata)
    session = await stripe.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "id": tx_id,
        "session_id": session.session_id,
        "package_id": body.package_id,
        "amount": amount,
        "currency": "usd",
        "payment_status": "pending",
        "metadata": metadata,
        "mocked": False,
        "created_at": now_iso(),
    })
    return {"url": session.url, "session_id": session.session_id, "mocked": False}


async def _log_coupon_redemption(code: str, email: str, package_id: str, discount_pct: float, free: bool = False):
    """Record a coupon usage + increment counter."""
    coupon = await db.coupons.find_one({"code": code})
    if not coupon:
        return
    plan_key = PACKAGE_TO_PLAN.get(package_id, "")
    expires = _coupon_expires_at(coupon)
    await db.coupon_redemptions.insert_one({
        "id": str(uuid.uuid4()),
        "coupon_code": code,
        "user_email": (email or "").lower(),
        "plan": plan_key,
        "package_id": package_id,
        "discount_applied": f"{int(discount_pct)}%" if not free else "FREE",
        "redeemed_at": now_iso(),
        "access_expires_at": expires,
    })
    await db.coupons.update_one({"code": code}, {"$inc": {"usage_count": 1}})
    await db.activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "type": "teal",
        "text": f"<strong>{email}</strong> redeemed coupon <code>{code}</code> on {plan_key}",
        "at": now_iso(),
    })


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # If already finalized, return
    if tx["payment_status"] in ("paid", "expired", "failed"):
        return {"payment_status": tx["payment_status"], "status": tx["payment_status"], "amount": tx["amount"], "currency": tx["currency"], "metadata": tx.get("metadata", {})}

    if tx.get("mocked"):
        # Mocked: simulate paid status after first poll
        await _finalize_payment(tx, "paid")
        return {"payment_status": "paid", "status": "complete", "amount": tx["amount"], "currency": tx["currency"], "metadata": tx.get("metadata", {})}

    # Live Stripe path
    stripe = get_stripe()
    if not stripe:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    cs = await stripe.get_checkout_status(session_id)
    if cs.payment_status == "paid":
        await _finalize_payment(tx, "paid")
    return {"payment_status": cs.payment_status, "status": cs.status, "amount": cs.amount_total / 100, "currency": cs.currency, "metadata": cs.metadata}


@api.post("/payments/mock-complete/{session_id}")
async def mock_complete_payment(session_id: str):
    """DEV only — instantly mark a mocked session as paid (used by /checkout/mock page)."""
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Not found")
    if not tx.get("mocked"):
        raise HTTPException(status_code=400, detail="Not a mocked transaction")
    if tx["payment_status"] != "paid":
        await _finalize_payment(tx, "paid")
    return {"ok": True}


async def _finalize_payment(tx: dict, new_status: str):
    """Idempotent finalization — safe to call multiple times."""
    if tx["payment_status"] == "paid":
        return
    await db.payment_transactions.update_one(
        {"id": tx["id"]},
        {"$set": {"payment_status": new_status, "completed_at": now_iso()}},
    )
    if new_status != "paid":
        return

    meta = tx.get("metadata", {})
    pkg_id = tx["package_id"]
    email = (meta.get("email") or "").lower().strip()

    # If a coupon was applied (paid path, not free) — log redemption now that payment succeeded
    coupon_code = meta.get("coupon_code", "")
    if coupon_code and not tx.get("free_via_coupon"):
        coupon = await db.coupons.find_one({"code": coupon_code})
        if coupon:
            discount_pct = int(coupon.get("discount_value", 0)) if coupon.get("discount_type") == "percent" else 100
            await _log_coupon_redemption(coupon_code, email, pkg_id, discount_pct, free=False)

    # Founder Circle: create founder record + first-month-free flag
    if pkg_id == "founder_circle":
        await db.founders.update_one(
            {"email": email},
            {"$setOnInsert": {
                "id": str(uuid.uuid4()),
                "name": meta.get("name", ""),
                "email": email,
                "creator_type": meta.get("creator_type", ""),
                "handle": meta.get("handle", ""),
                "joined_at": now_iso(),
                "status": "founder",
                "paid": True,
                "first_month_free": True,
            }},
            upsert=True,
        )
        # If user exists, mark them as founder + studio_owner with locked Creator pricing
        user = await db.users.find_one({"email": email}) if email else None
        if user:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"is_founder": True, "founder_locked_price": True, "plan": "creator"}},
            )
        await db.activity_log.insert_one({
            "id": str(uuid.uuid4()),
            "type": "purple",
            "text": f"<strong>{meta.get('name', email)}</strong> joined the Founder Circle (paid $1)",
            "at": now_iso(),
        })

        # Affiliate commission tracking — Founder doesn't generate commission yet,
        # but record referral for when they upgrade to Creator (month 2+).
        ref_code = meta.get("referral_code", "")
        if ref_code:
            await db.affiliate_referrals.insert_one({
                "id": str(uuid.uuid4()),
                "referral_code": ref_code,
                "referred_email": email,
                "referred_name": meta.get("name", ""),
                "package_id": pkg_id,
                "status": "active",  # active | cancelled
                "plan_type": "founder",  # founder | creator | studio
                "created_at": now_iso(),
            })

    # Recurring subscription commission tracking
    elif pkg_id.startswith(("creator_", "studio_")):
        plan = "creator" if pkg_id.startswith("creator_") else "studio"
        ref_code = meta.get("referral_code", "")
        if ref_code:
            commission_rate = COMMISSION_RATES[plan]
            commission_amount = tx["amount"] * commission_rate
            await db.affiliate_referrals.update_one(
                {"referral_code": ref_code, "referred_email": email},
                {"$set": {"status": "active", "plan_type": plan}, "$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "referral_code": ref_code,
                    "referred_email": email,
                    "referred_name": meta.get("name", ""),
                    "package_id": pkg_id,
                    "created_at": now_iso(),
                }},
                upsert=True,
            )
            await db.affiliate_commissions.insert_one({
                "id": str(uuid.uuid4()),
                "referral_code": ref_code,
                "referred_email": email,
                "plan": plan,
                "amount": commission_amount,
                "rate": commission_rate,
                "package_id": pkg_id,
                "transaction_id": tx["id"],
                "earned_at": now_iso(),
            })

    # Welcome email
    if email:
        tpl = (await db.settings.find_one({"key": "email_templates"}) or {}).get("value", DEFAULT_EMAILS)
        key = "founder_welcome" if pkg_id == "founder_circle" else "welcome"
        t = tpl.get(key, DEFAULT_EMAILS[key])
        await send_email(
            email,
            render_template(t["subject"], {"name": meta.get("name", "")}),
            render_template(t["body"], {"name": meta.get("name", "")}),
        )


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook handler — only active when STRIPE_MODE != mock."""
    if stripe_mock_mode():
        return {"ok": True, "mocked": True}

    stripe = get_stripe()
    if not stripe:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        resp = await stripe.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if resp.event_type in ("checkout.session.completed", "payment_intent.succeeded"):
        tx = await db.payment_transactions.find_one({"session_id": resp.session_id})
        if tx:
            await _finalize_payment(tx, "paid")
    elif resp.event_type in ("customer.subscription.deleted",):
        # Mark affiliate referral as cancelled
        email = (resp.metadata or {}).get("email", "").lower()
        if email:
            await db.affiliate_referrals.update_many({"referred_email": email}, {"$set": {"status": "cancelled", "cancelled_at": now_iso()}})
    return {"ok": True}


# ─── Affiliate / Sparks ───
@api.get("/affiliate/me")
async def my_affiliate(user: dict = Depends(get_current_user)):
    """Returns my affiliate code + my Sparks + commission breakdown."""
    code = make_referral_code(user["id"])
    referrals = await db.affiliate_referrals.find({"referral_code": code}, {"_id": 0}).sort("created_at", -1).to_list(500)
    commissions = await db.affiliate_commissions.find({"referral_code": code}, {"_id": 0}).sort("earned_at", -1).to_list(2000)

    active_sparks = sum(1 for r in referrals if r.get("status") == "active")
    cancelled_sparks = sum(1 for r in referrals if r.get("status") == "cancelled")

    total_earned = sum(c["amount"] for c in commissions)
    # MTD / Quarter / Year breakdowns
    today = now_utc()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    quarter_start_month = ((today.month - 1) // 3) * 3 + 1
    quarter_start = today.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    def in_range(c, start):
        try:
            d = datetime.fromisoformat(c["earned_at"].replace("Z", "+00:00"))
            return d >= start
        except Exception:
            return False

    mtd = sum(c["amount"] for c in commissions if in_range(c, month_start))
    qtd = sum(c["amount"] for c in commissions if in_range(c, quarter_start))
    ytd = sum(c["amount"] for c in commissions if in_range(c, year_start))

    # Monthly series for last 12 months
    months = []
    for i in range(11, -1, -1):
        m_date = (today.replace(day=1) - timedelta(days=30 * i)).replace(day=1)
        m_label = m_date.strftime("%b %y")
        m_total = 0
        for c in commissions:
            try:
                d = datetime.fromisoformat(c["earned_at"].replace("Z", "+00:00"))
                if d.year == m_date.year and d.month == m_date.month:
                    m_total += c["amount"]
            except Exception:
                pass
        months.append({"month": m_label, "amount": round(m_total, 2)})

    return {
        "referral_code": code,
        "referral_link": f"https://reellabstudio.com/?ref={code}",
        "sparks": referrals,
        "active_sparks": active_sparks,
        "cancelled_sparks": cancelled_sparks,
        "total_earned": round(total_earned, 2),
        "mtd": round(mtd, 2),
        "qtd": round(qtd, 2),
        "ytd": round(ytd, 2),
        "monthly_series": months,
        "commission_rates": COMMISSION_RATES,
    }


@api.get("/affiliate/lookup/{code}")
async def lookup_referrer(code: str):
    """Public — used by referral landing pages to confirm a code is valid + show who referred you."""
    # Find user with this code
    code = code.upper()
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(2000)
    for u in users:
        if make_referral_code(u["id"]) == code:
            return {"valid": True, "referrer_name": u.get("display_name", "A ReelLab member"), "code": code}
    return {"valid": False}


# ─── Password Reset (internal email-based) ───
@api.post("/auth/password-reset/request")
async def request_password_reset(body: PasswordResetRequestIn, request: Request):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Always return success — don't leak whether email exists
    if user:
        token = secrets.token_urlsafe(32)
        expires = (now_utc() + timedelta(minutes=30)).isoformat()
        await db.password_resets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "email": email,
            "token": token,
            "expires_at": expires,
            "used": False,
            "created_at": now_iso(),
        })
        origin = request.headers.get("origin") or f"https://{os.environ.get('APP_DOMAIN', 'reellabstudio.com')}"
        reset_link = f"{origin}/reset-password?token={token}"

        tpl = (await db.settings.find_one({"key": "email_templates"}) or {}).get("value", DEFAULT_EMAILS)
        t = tpl.get("password_reset", DEFAULT_EMAILS["password_reset"])
        vars = {"name": user.get("display_name", ""), "reset_link": reset_link}
        await send_email(email, render_template(t["subject"], vars), render_template(t["body"], vars))
        # Only log the raw reset link in dev (no SMTP); in production this would leak the token.
        if not os.environ.get("SMTP_HOST"):
            logger.info(f"[RESET LINK for {email}] {reset_link}")
            return {"ok": True, "dev_reset_link": reset_link}
    return {"ok": True}


@api.post("/auth/password-reset/confirm")
async def confirm_password_reset(body: PasswordResetConfirmIn):
    rec = await db.password_resets.find_one({"token": body.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    try:
        expires = datetime.fromisoformat(rec["expires_at"].replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")
    if now_utc() > expires:
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await db.password_resets.update_one({"id": rec["id"]}, {"$set": {"used": True, "used_at": now_iso()}})
    return {"ok": True}


# ─── Public AI Help Bot (no auth) ───
@api.post("/public/help/query")
async def public_help_query(body: HelpQueryIn):
    """Same as /help/query but no auth — for marketing site help bubble."""
    return await help_query(body)


# ─── Public emails ───
@api.get("/public/contact-emails")
async def public_emails():
    return {
        "hello": os.environ.get("HELLO_EMAIL", "hello@reellabstudio.com"),
        "support": os.environ.get("SUPPORT_EMAIL", "support@reellabstudio.com"),
        "sales": os.environ.get("SALES_EMAIL", "sales@reellabstudio.com"),
        "ceo": os.environ.get("CEO_EMAIL", "ceo@reellabstudio.com"),
    }


# ─── Public: payment mode (frontend hides card form when Stripe is live) ───
@api.get("/public/payment-mode")
async def public_payment_mode():
    return {"stripe_live": not stripe_mock_mode()}


# ─── A/B test: record impression + CEO analytics ───
@api.post("/public/ab/impression")
async def ab_impression(body: ABImpressionIn):
    if body.variant not in ("a", "b"):
        raise HTTPException(status_code=400, detail="Invalid variant")
    await db.ab_impressions.insert_one({
        "id": str(uuid.uuid4()),
        "page": body.page,
        "variant": body.variant,
        "referral_code": (body.referral_code or "").upper(),
        "at": now_iso(),
    })
    return {"ok": True}


@api.get("/ceo/ab-test/founder-checkout")
async def ceo_ab_founder(user: dict = Depends(require_ceo)):
    """A/B-test analytics: impressions vs. paid conversions for /founder-checkout."""
    impressions = await db.ab_impressions.find({"page": "founder-checkout"}, {"_id": 0}).to_list(20000)
    txs = await db.payment_transactions.find(
        {"package_id": "founder_circle", "payment_status": "paid"}, {"_id": 0}
    ).to_list(20000)

    def agg(variant: str):
        imps = [i for i in impressions if i["variant"] == variant]
        conv = [t for t in txs if (t.get("metadata") or {}).get("ab_variant") == variant]
        revenue = round(sum(float(t.get("amount") or 0) for t in conv), 2)
        rate = round((len(conv) / len(imps) * 100), 2) if imps else 0.0
        # by referral code
        by_ref = {}
        for c in conv:
            ref = ((c.get("metadata") or {}).get("referral_code") or "DIRECT").upper() or "DIRECT"
            by_ref.setdefault(ref, {"count": 0, "revenue": 0.0})
            by_ref[ref]["count"] += 1
            by_ref[ref]["revenue"] += float(c.get("amount") or 0)
        for v in by_ref.values():
            v["revenue"] = round(v["revenue"], 2)
        return {
            "variant": variant,
            "impressions": len(imps),
            "conversions": len(conv),
            "conversion_rate": rate,
            "revenue": revenue,
            "by_referral_code": by_ref,
        }

    return {
        "variants": [agg("a"), agg("b")],
        "total_impressions": len(impressions),
        "total_conversions": sum(1 for t in txs if (t.get("metadata") or {}).get("ab_variant") in ("a", "b")),
        "untracked_conversions": sum(1 for t in txs if (t.get("metadata") or {}).get("ab_variant") not in ("a", "b")),
    }


# ─── CEO: payment transactions audit ───
@api.get("/ceo/payments")
async def ceo_payments(user: dict = Depends(require_ceo)):
    rows = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    return {"transactions": rows}


@api.get("/ceo/affiliates-overview")
async def ceo_affiliates_overview(user: dict = Depends(require_ceo)):
    commissions = await db.affiliate_commissions.find({}, {"_id": 0}).to_list(5000)
    referrals = await db.affiliate_referrals.find({}, {"_id": 0}).to_list(5000)
    by_code = {}
    for c in commissions:
        by_code.setdefault(c["referral_code"], {"earned": 0.0, "count": 0})
        by_code[c["referral_code"]]["earned"] += c["amount"]
        by_code[c["referral_code"]]["count"] += 1
    for r in referrals:
        by_code.setdefault(r["referral_code"], {"earned": 0.0, "count": 0})
    rows = []
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(2000)
    name_by_code = {make_referral_code(u["id"]): u.get("display_name") or u["email"] for u in users}
    for code, agg in by_code.items():
        rows.append({
            "referral_code": code,
            "affiliate_name": name_by_code.get(code, "Unknown"),
            "total_earned": round(agg["earned"], 2),
            "commission_count": agg["count"],
            "active_sparks": sum(1 for r in referrals if r["referral_code"] == code and r.get("status") == "active"),
        })
    return {"affiliates": rows, "total_paid": round(sum(c["amount"] for c in commissions), 2)}


# ─── Coupons / Access Control (CEO) ───
def _coupon_expires_at(coupon: dict, from_iso: str = None) -> Optional[str]:
    base = datetime.fromisoformat((from_iso or now_iso()).replace("Z", "+00:00"))
    if coupon["duration_type"] == "unlimited":
        return None
    if coupon["duration_type"] == "end_date" and coupon.get("end_date"):
        return coupon["end_date"]
    if coupon["duration_type"] == "fixed":
        amt = int(coupon.get("duration_amount") or 0)
        unit = coupon.get("duration_unit") or "days"
        delta = timedelta(days=amt) if unit == "days" else timedelta(days=amt * 30)
        return (base + delta).isoformat()
    return None


async def _validate_coupon(code: str, plan: str, email: Optional[str] = None) -> dict:
    code = (code or "").strip().upper()
    if not code:
        return {"valid": False, "reason": "Code required"}
    c = await db.coupons.find_one({"code": code}, {"_id": 0})
    if not c:
        return {"valid": False, "reason": "Coupon not found"}
    if not c.get("active", True):
        return {"valid": False, "reason": "Coupon is inactive"}
    if c["plan"] != plan:
        return {"valid": False, "reason": f"This coupon only applies to the {c['plan'].title()} plan"}
    # Email lock
    if c["assignment_type"] == "email":
        if not email or email.lower().strip() != (c.get("assigned_email") or "").lower().strip():
            return {"valid": False, "reason": "This coupon is reserved for a specific email"}
    # End-date check (expiration of the COUPON itself, not the access it grants)
    if c["duration_type"] == "end_date" and c.get("end_date"):
        try:
            ed = datetime.fromisoformat(c["end_date"].replace("Z", "+00:00"))
            if now_utc() > ed:
                return {"valid": False, "reason": "Coupon has expired"}
        except Exception:
            pass
    # Usage limit
    if c["usage_limit_type"] != "unlimited":
        used = int(c.get("usage_count") or 0)
        limit = 1 if c["usage_limit_type"] == "single" else int(c.get("usage_limit") or 1)
        if used >= limit:
            return {"valid": False, "reason": "Coupon usage limit reached"}
    return {"valid": True, "coupon": c}


@api.post("/coupons/validate")
async def public_validate_coupon(body: CouponValidateIn):
    """Public — used by checkout pages."""
    res = await _validate_coupon(body.code, body.plan, body.email)
    if not res["valid"]:
        return {"valid": False, "reason": res["reason"]}
    c = res["coupon"]
    return {
        "valid": True,
        "code": c["code"],
        "label": c.get("label", ""),
        "discount_type": c["discount_type"],
        "discount_value": c["discount_value"],
        "plan": c["plan"],
    }


@api.get("/ceo/coupons")
async def ceo_list_coupons(user: dict = Depends(require_ceo)):
    rows = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"coupons": rows}


@api.post("/ceo/coupons")
async def ceo_create_coupon(body: CouponIn, user: dict = Depends(require_ceo)):
    code = body.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Code required")
    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Code already exists")
    data = body.model_dump()
    data["code"] = code
    if data["discount_type"] == "free":
        data["discount_value"] = 100
    elif not (1 <= int(data.get("discount_value", 0)) <= 99):
        raise HTTPException(status_code=400, detail="Percent discount must be 1–99")
    coupon = {
        "id": str(uuid.uuid4()),
        **data,
        "usage_count": 0,
        "created_at": now_iso(),
        "created_by": user["id"],
    }
    await db.coupons.insert_one(coupon)
    coupon.pop("_id", None)
    await db.activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "type": "purple",
        "text": f"<strong>CEO</strong> created coupon <code>{code}</code> for {data['plan']}",
        "at": now_iso(),
    })
    return {"coupon": coupon}


@api.patch("/ceo/coupons/{cid}")
async def ceo_update_coupon(cid: str, body: CouponIn, user: dict = Depends(require_ceo)):
    upd = body.model_dump()
    upd["code"] = upd["code"].strip().upper()
    if upd["discount_type"] == "free":
        upd["discount_value"] = 100
    await db.coupons.update_one({"id": cid}, {"$set": upd})
    return {"ok": True}


@api.patch("/ceo/coupons/{cid}/toggle")
async def ceo_toggle_coupon(cid: str, user: dict = Depends(require_ceo)):
    c = await db.coupons.find_one({"id": cid})
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    new_active = not c.get("active", True)
    await db.coupons.update_one({"id": cid}, {"$set": {"active": new_active}})
    return {"ok": True, "active": new_active}


@api.delete("/ceo/coupons/{cid}")
async def ceo_delete_coupon(cid: str, user: dict = Depends(require_ceo)):
    await db.coupons.delete_one({"id": cid})
    return {"ok": True}


@api.get("/ceo/coupon-redemptions")
async def ceo_coupon_redemptions(user: dict = Depends(require_ceo)):
    rows = await db.coupon_redemptions.find({}, {"_id": 0}).sort("redeemed_at", -1).limit(500).to_list(500)
    return {"redemptions": rows}


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


    # Seed default settings, pricing, FAQ, email templates (idempotent)
    if not await db.settings.find_one({"key": "pricing"}):
        await db.settings.insert_one({"key": "pricing", "value": DEFAULT_PRICING, "updated_at": now_iso()})
    if not await db.settings.find_one({"key": "platform"}):
        await db.settings.insert_one({"key": "platform", "value": DEFAULT_SETTINGS, "updated_at": now_iso()})
    if not await db.settings.find_one({"key": "email_templates"}):
        await db.settings.insert_one({"key": "email_templates", "value": DEFAULT_EMAILS, "updated_at": now_iso()})
    # Seed FAQ if empty
    if await db.faq.count_documents({}) == 0:
        for f in FAQ:
            await db.faq.insert_one({
                "id": str(uuid.uuid4()),
                "category": f["category"],
                "question": f["q"],
                "answer": f["a"],
                "keywords": f["k"],
                "published": True,
                "created_at": now_iso(),
            })


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
