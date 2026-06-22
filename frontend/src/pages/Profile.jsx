import { useState } from "react";
import { useAuth } from "../lib/auth";
import api, { formatErr } from "../lib/api";
import { Avatar, Badge } from "../components/Logo";
import ConnectorsModal from "../components/ConnectorsModal";
import { Plug } from "lucide-react";

export default function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    display_name: user?.display_name || "",
    username: user?.username || "",
    company_name: user?.company_name || "",
    photo_url: user?.photo_url || "",
    logo_url: user?.logo_url || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    website: user?.website || "",
    social_handles: user?.social_handles || { twitter: "", instagram: "", youtube: "" },
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);

  const set = (k, v) => setForm({ ...form, [k]: v });
  const setSocial = (k, v) => setForm({ ...form, social_handles: { ...form.social_handles, [k]: v } });

  const save = async () => {
    setMsg(""); setErr(""); setSaving(true);
    try {
      await api.patch("/auth/profile", form);
      await refresh();
      setMsg("Profile saved ✓");
    } catch (e) {
      setErr(formatErr(e.response?.data?.detail));
    }
    setSaving(false);
  };

  if (!user) return <div className="page-shell">Loading…</div>;

  return (
    <div className="page-shell" style={{ maxWidth: 820 }} data-testid="profile-page">
      <h1 className="page-title">Profile & Settings</h1>
      <p className="page-sub">How you show up in ReelLab Studio.</p>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Avatar user={user} size={70} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center" }}>
              {user.display_name} <Badge type={user.badge} />
            </div>
            <div style={{ fontSize: 13, color: "var(--text-sec)", marginBottom: 4 }}>@{user.username}</div>
            <div style={{ fontSize: 12, color: "var(--text-sec)" }}>
              {user.role.toUpperCase()} · joined {new Date(user.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 18 }}>Public profile</h3>
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div>
            <label className="label">Display name</label>
            <input className="input" value={form.display_name} onChange={(e) => set("display_name", e.target.value)} data-testid="profile-display-name" />
          </div>
          <div>
            <label className="label">Username</label>
            <input className="input" value={form.username} onChange={(e) => set("username", e.target.value.replace(/[^a-z0-9_]/gi, ""))} data-testid="profile-username" />
          </div>
          <div>
            <label className="label">Company</label>
            <input className="input" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} data-testid="profile-company" />
          </div>
          <div>
            <label className="label">Phone (private)</label>
            <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="profile-phone" />
          </div>
          <div>
            <label className="label">Photo URL</label>
            <input className="input" value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)} data-testid="profile-photo" />
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input className="input" value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} data-testid="profile-logo" />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">Bio / tagline</label>
          <textarea className="input" rows={2} value={form.bio} onChange={(e) => set("bio", e.target.value)} data-testid="profile-bio" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="label">Website</label>
          <input className="input" value={form.website} onChange={(e) => set("website", e.target.value)} data-testid="profile-website" />
        </div>

        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Social handles</h3>
        <div className="grid-2" style={{ marginBottom: 18 }}>
          <div>
            <label className="label">Twitter / X</label>
            <input className="input" value={form.social_handles?.twitter || ""} onChange={(e) => setSocial("twitter", e.target.value)} data-testid="profile-twitter" />
          </div>
          <div>
            <label className="label">Instagram</label>
            <input className="input" value={form.social_handles?.instagram || ""} onChange={(e) => setSocial("instagram", e.target.value)} data-testid="profile-instagram" />
          </div>
          <div>
            <label className="label">YouTube</label>
            <input className="input" value={form.social_handles?.youtube || ""} onChange={(e) => setSocial("youtube", e.target.value)} data-testid="profile-youtube" />
          </div>
          <div>
            <label className="label">TikTok</label>
            <input className="input" value={form.social_handles?.tiktok || ""} onChange={(e) => setSocial("tiktok", e.target.value)} data-testid="profile-tiktok" />
          </div>
        </div>

        {msg && <div style={{ background: "var(--teal-light)", color: "var(--teal)", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 10 }}>{msg}</div>}
        {err && <div style={{ background: "var(--coral-light)", color: "var(--coral)", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <button className="btn-primary" onClick={save} disabled={saving} data-testid="profile-save">{saving ? "Saving…" : "Save changes"}</button>
      </div>

      <div className="card" style={{ marginTop: 24 }} data-testid="profile-connectors-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>Publishing connectors</h3>
            <p style={{ fontSize: 12, color: "var(--text-sec)", lineHeight: 1.6, maxWidth: 420 }}>
              Link Instagram, YouTube, Facebook, TikTok, or X to publish directly from ReelLab Studio.
              {(user.plan !== "studio" && user.role !== "ceo") && " Studio plan required for direct publishing."}
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => setConnectorsOpen(true)}
            data-testid="open-connectors-profile"
            style={{ padding: "8px 14px" }}
          >
            <Plug size={13} style={{ display: "inline", marginRight: 6 }} /> Manage connectors
          </button>
        </div>
      </div>

      {connectorsOpen && (
        <ConnectorsModal
          onClose={() => setConnectorsOpen(false)}
          plan={user.plan || "free"}
          role={user.role || "client"}
        />
      )}
    </div>
  );
}
