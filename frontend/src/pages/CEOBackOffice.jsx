import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { Badge, Avatar } from "../components/Logo";
import { Shield, LogOut, RefreshCw, Plus, Trash2, Save, Edit3, AlertTriangle, Check, X } from "lucide-react";
import AccessControl from "./CEOAccessControl";

const NAV = [
  { section: "Overview", items: [
    { key: "overview", icon: "⬛", label: "Platform Overview" },
    { key: "activity", icon: "📋", label: "Activity Log" },
  ]},
  { section: "Management", items: [
    { key: "users", icon: "👥", label: "User Management" },
    { key: "projects", icon: "🎬", label: "All Projects" },
    { key: "pricing", icon: "💳", label: "Pricing & Plans" },
  ]},
  { section: "Growth", items: [
    { key: "waitlist", icon: "📧", label: "Waitlist" },
    { key: "founders", icon: "✦", label: "Founder Circle" },
    { key: "abtest", icon: "🅰", label: "Founder A/B" },
  ]},
  { section: "Content", items: [
    { key: "dummy", icon: "🧪", label: "Dummy Data" },
    { key: "faq", icon: "❓", label: "FAQ Editor" },
    { key: "emails", icon: "✉️", label: "Email Templates" },
  ]},
  { section: "Community", items: [
    { key: "affiliates", icon: "⭐", label: "Affiliates & Badges" },
    { key: "moderation", icon: "🛡️", label: "Moderation" },
  ]},
  { section: "Platform", items: [
    { key: "access", icon: "🔐", label: "Access Control" },
    { key: "settings", icon: "⚙️", label: "Platform Settings" },
  ]},
];

const TITLES = {
  overview: "Platform Overview", activity: "Activity Log", users: "User Management",
  projects: "All Projects", pricing: "Pricing & Plans", waitlist: "Waitlist",
  founders: "Founder Circle Applications", dummy: "Dummy Data Manager", faq: "FAQ Editor",
  emails: "Email Templates", affiliates: "Affiliates & Badges", moderation: "Content Moderation",
  settings: "Platform Settings", abtest: "Founder Checkout · A/B Test",
  access: "Access Control · Coupons & Overrides",
};

export default function CEOBackOffice() {
  const { user, logout, theme, setTheme } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("overview");
  const [toast, setToast] = useState(null);

  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const onLogout = () => { logout(); navigate("/login"); };

  if (!user) return <div className="page-shell">Loading…</div>;
  if (user.role !== "ceo") return (
    <div className="page-shell" style={{ textAlign: "center", padding: 80 }}>
      <Shield size={36} color="var(--coral)" />
      <h2 style={{ marginTop: 12 }}>Access denied</h2>
      <p style={{ color: "var(--text-sec)" }}>CEO Back Office is restricted.</p>
    </div>
  );

  return (
    <div className="ceo-shell" data-testid="ceo-page" data-theme="dark">
      {toast && <div className="toast" data-testid="ceo-toast">{toast}</div>}

      <aside className="ceo-sidebar">
        <div className="ceo-sidebar-logo">
          <div className="rl-logo-mark">✦</div>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--text)" }}>Reel<span style={{ color: "var(--purple-mid)" }}>Lab</span></div>
            <div className="ceo-sidebar-badge">CEO Dashboard</div>
          </div>
        </div>
        <div className="ceo-sidebar-nav">
          {NAV.map((grp) => (
            <div key={grp.section}>
              <div className="ceo-nav-section-label">{grp.section}</div>
              {grp.items.map((it) => (
                <button
                  key={it.key}
                  className={`ceo-nav-item ${section === it.key ? "active" : ""}`}
                  onClick={() => setSection(it.key)}
                  data-testid={`ceo-nav-${it.key}`}
                >
                  <span className="ceo-nav-icon">{it.icon}</span>
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="ceo-sidebar-footer">
          <div className="ceo-chip">
            <div className="ceo-avatar">{(user.display_name || "C").charAt(0)}</div>
            <div style={{ flex: 1 }}>
              <div className="ceo-name">{user.display_name || "CEO"}</div>
              <div className="ceo-role">Super Admin</div>
            </div>
            <button onClick={onLogout} className="row-btn" style={{ padding: 4 }} title="Sign out" data-testid="ceo-logout"><LogOut size={12} /></button>
          </div>
        </div>
      </aside>

      <main className="ceo-main">
        <div className="ceo-topbar">
          <div className="ceo-topbar-title" data-testid="ceo-section-title">{TITLES[section]}</div>
          <button className="row-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} data-testid="ceo-theme">{theme === "dark" ? "☀ Light" : "🌙 Dark"}</button>
          <button className="row-btn" onClick={() => window.location.reload()} data-testid="ceo-refresh"><RefreshCw size={12} style={{ marginRight: 4, display: "inline" }} />Refresh</button>
        </div>
        <div className="ceo-content">
          {section === "overview" && <Overview showToast={showToast} />}
          {section === "activity" && <Activity />}
          {section === "users" && <Users showToast={showToast} />}
          {section === "projects" && <Projects showToast={showToast} />}
          {section === "pricing" && <Pricing showToast={showToast} />}
          {section === "waitlist" && <Waitlist />}
          {section === "founders" && <Founders />}
          {section === "abtest" && <ABTest />}
          {section === "access" && <AccessControl showToast={showToast} />}
          {section === "dummy" && <DummyData showToast={showToast} />}
          {section === "faq" && <FAQEditor showToast={showToast} />}
          {section === "emails" && <EmailTemplates showToast={showToast} />}
          {section === "affiliates" && <Affiliates showToast={showToast} />}
          {section === "moderation" && <Moderation showToast={showToast} />}
          {section === "settings" && <Settings showToast={showToast} />}
        </div>
      </main>
    </div>
  );
}

// ─── Overview ───
function Overview({ showToast }) {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  useEffect(() => {
    (async () => {
      const [ov, ac] = await Promise.all([api.get("/ceo/overview"), api.get("/ceo/activity")]);
      setData(ov.data);
      setActivity(ac.data.activity.slice(0, 8));
    })();
  }, []);
  if (!data) return <div className="spinner" />;
  return (
    <div data-testid="ceo-overview-panel">
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <Metric label="Total Users" val={data.users} change="+12% MoM" up />
        <Metric label="Active Projects" val={data.projects} change={`${data.paid_invoices}/${data.invoices} paid`} up />
        <Metric label="Community Posts" val={data.community_posts} change="growing" up />
        <Metric label="Paid Revenue" val={`$${(data.paid_invoices * 199).toLocaleString()}`} change="mocked" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        <div className="card">
          <div style={{ padding: "14px 18px", borderBottom: ".5px solid var(--border)", fontSize: 13, fontWeight: 500 }}>Recent Activity</div>
          <div style={{ padding: "8px 18px" }}>
            {activity.length === 0 && <div style={{ color: "var(--text-sec)", fontSize: 13, padding: 16, textAlign: "center" }}>No activity yet.</div>}
            {activity.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: ".5px solid var(--border)", alignItems: "flex-start" }} data-testid={`activity-${a.id}`}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: `var(--${a.type || "purple"})`, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: "var(--text-sec)", lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: a.text || a.action }} />
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--text-dim)" }}>{new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div style={{ padding: "14px 18px", borderBottom: ".5px solid var(--border)", fontSize: 13, fontWeight: 500 }}>Quick Actions</div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn-secondary" style={{ textAlign: "left", padding: "10px 14px" }} onClick={() => showToast("Tip: switch to the FAQ Editor in the sidebar")}>✦ Add a new FAQ entry</button>
            <button className="btn-secondary" style={{ textAlign: "left", padding: "10px 14px" }} onClick={() => showToast("Tip: switch to Pricing & Plans in the sidebar")}>💳 Update pricing</button>
            <button className="btn-secondary" style={{ textAlign: "left", padding: "10px 14px" }} onClick={() => showToast("Tip: switch to Platform Settings in the sidebar")}>⚙️ Toggle maintenance mode</button>
          </div>
        </div>
      </div>
    </div>
  );
}
const Metric = ({ label, val, change, up }) => (
  <div className="metric-card">
    <div className="metric-label">{label}</div>
    <div className="metric-val">{val}</div>
    <div className={`metric-change ${up ? "up" : "down"}`}>{change}</div>
  </div>
);

// ─── Activity ───
function Activity() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/ceo/activity").then((r) => setRows(r.data.activity)); }, []);
  return (
    <div className="card" data-testid="ceo-activity-panel">
      <div style={{ padding: "14px 18px", borderBottom: ".5px solid var(--border)", fontSize: 13, fontWeight: 500 }}>All Activity ({rows.length})</div>
      <div style={{ padding: 18 }}>
        {rows.length === 0 && <div style={{ color: "var(--text-sec)", fontSize: 13, textAlign: "center", padding: 24 }}>No activity logged yet.</div>}
        {rows.map((a) => (
          <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: ".5px solid var(--border)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: `var(--${a.type || "purple"})`, marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12, color: "var(--text-sec)" }} dangerouslySetInnerHTML={{ __html: a.text || `<strong>${a.action}</strong> on project ${a.project_id} — ${a.note || ""}` }} />
            <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--text-dim)" }}>{new Date(a.at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Users ───
function Users({ showToast }) {
  const [users, setUsers] = useState([]);
  const load = () => api.get("/ceo/users").then((r) => setUsers(r.data.users));
  useEffect(() => { load(); }, []);
  const setBadge = async (id, badge) => { await api.patch("/ceo/users", { user_id: id, badge }); showToast("Badge updated ✓"); load(); };
  const setStatus = async (id, status) => { await api.patch("/ceo/users", { user_id: id, status }); showToast("Status updated ✓"); load(); };
  return (
    <div className="card" data-testid="ceo-users-panel" style={{ padding: 0 }}>
      <table className="data-table">
        <thead><tr><th style={{ paddingTop: 14, paddingLeft: 18 }}>User</th><th>Email</th><th>Role</th><th>Badge</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} data-testid={`ceo-user-${u.id}`}>
              <td style={{ paddingLeft: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar user={u} size={28} /><div><div style={{ fontWeight: 500 }}>{u.display_name} <Badge type={u.badge} /></div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>@{u.username}</div></div></div></td>
              <td>{u.email}</td>
              <td><span className="pill pill-purple">{u.role}</span></td>
              <td>
                <select className="input" style={{ maxWidth: 120, padding: "5px 8px", fontSize: 11 }} value={u.badge} onChange={(e) => setBadge(u.id, e.target.value)} data-testid={`ceo-badge-${u.id}`}>
                  <option value="none">None</option><option value="blue">Blue (Studio)</option><option value="gold">Gold (Affiliate)</option>
                </select>
              </td>
              <td>
                <select className="input" style={{ maxWidth: 110, padding: "5px 8px", fontSize: 11 }} value={u.status || "active"} onChange={(e) => setStatus(u.id, e.target.value)} data-testid={`ceo-status-${u.id}`}>
                  <option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option>
                </select>
              </td>
              <td>{u.role !== "ceo" && <button className="row-btn danger" onClick={async () => { if (window.confirm(`Delete ${u.email}?`)) { await api.delete(`/ceo/users/${u.id}`); showToast("User deleted"); load(); } }} data-testid={`ceo-delete-user-${u.id}`}><Trash2 size={11} /></button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Projects ───
function Projects({ showToast }) {
  const [projects, setProjects] = useState([]);
  const [override, setOverride] = useState(null);
  const [form, setForm] = useState({ action: "cancel", note: "", new_status: "" });
  const load = () => api.get("/ceo/projects").then((r) => setProjects(r.data.projects));
  useEffect(() => { load(); }, []);
  const apply = async () => {
    await api.post("/ceo/override", { project_id: override.id, action: form.action, note: form.note, new_status: form.new_status || null });
    setOverride(null); setForm({ action: "cancel", note: "", new_status: "" });
    showToast("Override applied"); load();
  };
  return (
    <>
      <div className="card" data-testid="ceo-projects-panel" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th style={{ paddingTop: 14, paddingLeft: 18 }}>Project</th><th>Client</th><th>Owner</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} data-testid={`ceo-project-${p.id}`}>
                <td style={{ paddingLeft: 18 }}><strong>{p.name}</strong></td>
                <td>{p.client_name || "—"}</td>
                <td><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{p.owner_id?.slice(0, 8) || "—"}</span></td>
                <td><span className={`pill status-${p.status}`}>{p.status}</span></td>
                <td><button className="row-btn danger" onClick={() => setOverride(p)} data-testid={`ceo-override-${p.id}`}><AlertTriangle size={11} style={{ marginRight: 4, display: "inline" }} />Override</button></td>
              </tr>
            ))}
            {projects.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 28, color: "var(--text-sec)" }}>No projects yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {override && (
        <div className="modal-overlay" data-testid="ceo-override-modal">
          <div className="modal">
            <div className="modal-title">Override "{override.name}"</div>
            <div className="modal-sub">This action is logged with your note and timestamp.</div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Action</label>
              <select className="input" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
                <option value="cancel">Cancel project</option>
                <option value="reject">Reject project</option>
                <option value="force_status">Force status</option>
              </select>
            </div>
            {form.action === "force_status" && (
              <div style={{ marginBottom: 12 }}>
                <label className="label">New status</label>
                <select className="input" value={form.new_status} onChange={(e) => setForm({ ...form, new_status: e.target.value })}>
                  <option value="draft">Draft</option><option value="active">Active</option><option value="editing">Editing</option><option value="review">Review</option><option value="delivered">Delivered</option>
                </select>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label className="label">CEO note (required)</label>
              <textarea className="input" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} data-testid="override-note" />
            </div>
            <button className="btn-primary" style={{ width: "100%" }} disabled={!form.note} onClick={apply} data-testid="override-submit">Apply override</button>
            <button className="btn-ghost" style={{ width: "100%", marginTop: 6 }} onClick={() => setOverride(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Pricing ───
function Pricing({ showToast }) {
  const [pricing, setPricing] = useState(null);
  useEffect(() => { api.get("/pricing").then((r) => setPricing(r.data.pricing)); }, []);
  if (!pricing) return <div className="spinner" />;
  const save = async (plan) => {
    await api.put("/ceo/pricing", { plan, monthly: pricing[plan].monthly, yearly: pricing[plan].yearly });
    showToast(`${plan} pricing saved`);
  };
  const syncStripe = async () => { await api.post("/ceo/pricing/sync-stripe"); showToast("Stripe pricing synced"); };
  return (
    <div data-testid="ceo-pricing-panel">
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {["solo", "creator", "studio"].map((plan) => (
          <div key={plan} className="card" data-testid={`ceo-price-${plan}`}>
            <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--text-dim)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>{plan}</div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Monthly ($)</label>
              <input className="input" type="number" value={pricing[plan].monthly} onChange={(e) => setPricing({ ...pricing, [plan]: { ...pricing[plan], monthly: parseFloat(e.target.value) || 0 } })} data-testid={`ceo-price-${plan}-monthly`} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Yearly ($)</label>
              <input className="input" type="number" value={pricing[plan].yearly} onChange={(e) => setPricing({ ...pricing, [plan]: { ...pricing[plan], yearly: parseFloat(e.target.value) || 0 } })} data-testid={`ceo-price-${plan}-yearly`} />
            </div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={() => save(plan)} data-testid={`ceo-save-${plan}`}><Save size={12} style={{ display: "inline", marginRight: 4 }} />Save</button>
          </div>
        ))}
      </div>
      <button className="btn-secondary" onClick={syncStripe} data-testid="ceo-sync-stripe">↻ Sync to Stripe (MOCKED)</button>
      <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8, fontFamily: "'DM Mono', monospace" }}>
        Live Stripe keys go in <code>backend/.env</code> at deployment. Sync button will then push real Product/Price IDs.
      </p>
    </div>
  );
}

// ─── Waitlist / Founders ───
function Waitlist() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/ceo/waitlist").then((r) => setRows(r.data.waitlist)); }, []);
  return (
    <div className="card" style={{ padding: 0 }} data-testid="ceo-waitlist-panel">
      <div style={{ padding: "14px 18px", borderBottom: ".5px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
        <strong style={{ fontSize: 13 }}>Waitlist signups ({rows.length})</strong>
        <a href="#" onClick={(e) => { e.preventDefault(); const csv = "email,source,joined_at\n" + rows.map((r) => `${r.email},${r.source},${r.joined_at}`).join("\n"); const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "waitlist.csv"; a.click(); }} style={{ fontSize: 11, color: "var(--purple-light)" }} data-testid="export-waitlist">↓ Export CSV</a>
      </div>
      <table className="data-table">
        <thead><tr><th style={{ paddingTop: 14, paddingLeft: 18 }}>Email</th><th>Source</th><th>Joined</th></tr></thead>
        <tbody>
          {rows.map((r) => <tr key={r.id} data-testid={`waitlist-row-${r.id}`}><td style={{ paddingLeft: 18 }}>{r.email}</td><td><span className="pill pill-purple">{r.source}</span></td><td style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{new Date(r.joined_at).toLocaleString()}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", padding: 28, color: "var(--text-sec)" }}>No signups yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Founders() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/ceo/founders").then((r) => setRows(r.data.founders)); }, []);
  return (
    <div className="card" style={{ padding: 0 }} data-testid="ceo-founders-panel">
      <div style={{ padding: "14px 18px", borderBottom: ".5px solid var(--border)" }}><strong style={{ fontSize: 13 }}>Founder Circle applications ({rows.length})</strong></div>
      <table className="data-table">
        <thead><tr><th style={{ paddingTop: 14, paddingLeft: 18 }}>Name</th><th>Email</th><th>Type</th><th>Handle</th><th>Applied</th></tr></thead>
        <tbody>
          {rows.map((r) => <tr key={r.id} data-testid={`founder-row-${r.id}`}><td style={{ paddingLeft: 18 }}><strong>{r.name}</strong></td><td>{r.email}</td><td><span className="pill pill-amber">{r.creator_type || "—"}</span></td><td>{r.handle || "—"}</td><td style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{new Date(r.joined_at).toLocaleDateString()}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 28, color: "var(--text-sec)" }}>No applications yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ─── Dummy data ───
function DummyData({ showToast }) {
  const seed = async () => { const { data } = await api.post("/ceo/dummy-data/seed"); showToast(`Seeded ${data.created} items into your account`); };
  const clear = async () => { if (!window.confirm("Clear all demo data?")) return; const { data } = await api.delete("/ceo/dummy-data"); showToast(`Removed ${data.clients_removed + data.projects_removed} items`); };
  return (
    <div className="card" data-testid="ceo-dummy-panel">
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Dummy Data Manager</h3>
      <p style={{ color: "var(--text-sec)", fontSize: 13, marginBottom: 18 }}>Seed demo clients + projects for new users to explore the app, or clear them. Demo items are flagged in the DB so they're safe to remove.</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-primary" onClick={seed} data-testid="dummy-seed"><Plus size={12} style={{ display: "inline", marginRight: 4 }} />Seed demo data</button>
        <button className="btn-secondary" onClick={clear} style={{ color: "var(--coral)", borderColor: "rgba(196,75,42,.3)" }} data-testid="dummy-clear"><Trash2 size={12} style={{ display: "inline", marginRight: 4 }} />Clear demo data</button>
      </div>
    </div>
  );
}

// ─── FAQ Editor ───
function FAQEditor({ showToast }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category: "", question: "", answer: "", keywords: [] });
  const load = () => api.get("/ceo/faq").then((r) => setItems(r.data.faq));
  useEffect(() => { load(); }, []);
  const save = async () => {
    const payload = { ...form, keywords: typeof form.keywords === "string" ? form.keywords.split(",").map((k) => k.trim()).filter(Boolean) : form.keywords };
    if (editing === "new") await api.post("/ceo/faq", payload);
    else await api.patch(`/ceo/faq/${editing}`, payload);
    setEditing(null); showToast("FAQ saved"); load();
  };
  const del = async (id) => { if (!window.confirm("Delete this FAQ?")) return; await api.delete(`/ceo/faq/${id}`); showToast("FAQ removed"); load(); };
  const startEdit = (item) => { setEditing(item.id); setForm({ category: item.category, question: item.question, answer: item.answer, keywords: (item.keywords || []).join(", ") }); };
  return (
    <div data-testid="ceo-faq-panel">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button className="btn-primary" onClick={() => { setEditing("new"); setForm({ category: "", question: "", answer: "", keywords: "" }); }} data-testid="faq-new"><Plus size={12} style={{ display: "inline", marginRight: 4 }} />Add FAQ</button>
      </div>
      {editing && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--purple-border)" }} data-testid="faq-edit-form">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <strong style={{ fontSize: 13 }}>{editing === "new" ? "New FAQ" : "Edit FAQ"}</strong>
            <button className="row-btn" onClick={() => setEditing(null)}><X size={12} /></button>
          </div>
          <div className="grid-2" style={{ marginBottom: 10 }}>
            <div><label className="label">Category</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="faq-category" /></div>
            <div><label className="label">Keywords (comma separated)</label><input className="input" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} data-testid="faq-keywords" /></div>
          </div>
          <div style={{ marginBottom: 10 }}><label className="label">Question</label><input className="input" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} data-testid="faq-question" /></div>
          <div style={{ marginBottom: 14 }}><label className="label">Answer</label><textarea className="input" rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} data-testid="faq-answer" /></div>
          <button className="btn-primary" onClick={save} disabled={!form.question || !form.answer} data-testid="faq-save"><Save size={12} style={{ display: "inline", marginRight: 4 }} />Save</button>
        </div>
      )}
      {items.map((it) => (
        <div key={it.id} className="card" style={{ marginBottom: 8 }} data-testid={`faq-item-${it.id}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <span className="pill pill-purple" style={{ marginBottom: 8 }}>{it.category}</span>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 6 }}>{it.question}</div>
              <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 6, lineHeight: 1.5 }}>{it.answer}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="row-btn" onClick={() => startEdit(it)} data-testid={`faq-edit-${it.id}`}><Edit3 size={11} /></button>
              <button className="row-btn danger" onClick={() => del(it.id)} data-testid={`faq-delete-${it.id}`}><Trash2 size={11} /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Email Templates ───
function EmailTemplates({ showToast }) {
  const [templates, setTemplates] = useState({});
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ subject: "", body: "" });
  const load = () => api.get("/ceo/email-templates").then((r) => setTemplates(r.data.templates));
  useEffect(() => { load(); }, []);
  const startEdit = (k) => { setEditing(k); setForm(templates[k]); };
  const save = async () => { await api.put("/ceo/email-templates", { key: editing, subject: form.subject, body: form.body }); showToast("Template saved"); setEditing(null); load(); };
  return (
    <div data-testid="ceo-emails-panel">
      <p style={{ fontSize: 13, color: "var(--text-sec)", marginBottom: 18 }}>Edit transactional email copy. Variables like <code style={{ background: "var(--surface2)", padding: "1px 5px", borderRadius: 4 }}>{"{{name}}"}</code>, <code style={{ background: "var(--surface2)", padding: "1px 5px", borderRadius: 4 }}>{"{{amount}}"}</code> are replaced at send time.</p>
      {Object.entries(templates).map(([k, t]) => (
        <div key={k} className="card" style={{ marginBottom: 10 }} data-testid={`email-${k}`}>
          {editing === k ? (
            <>
              <strong style={{ fontSize: 13, marginBottom: 10, display: "block" }}>{k}</strong>
              <div style={{ marginBottom: 10 }}><label className="label">Subject</label><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid={`email-${k}-subject`} /></div>
              <div style={{ marginBottom: 12 }}><label className="label">Body</label><textarea className="input" rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} data-testid={`email-${k}-body`} /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" onClick={save} data-testid={`email-${k}-save`}><Save size={12} style={{ display: "inline", marginRight: 4 }} />Save</button>
                <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <span className="pill pill-purple">{k}</span>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>{t.subject}</div>
                <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 6, whiteSpace: "pre-wrap" }}>{(t.body || "").slice(0, 140)}…</div>
              </div>
              <button className="row-btn" onClick={() => startEdit(k)} data-testid={`email-edit-${k}`}><Edit3 size={11} /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Affiliates ───
function Affiliates({ showToast }) {
  const [users, setUsers] = useState([]);
  const load = () => api.get("/ceo/users").then((r) => setUsers(r.data.users));
  useEffect(() => { load(); }, []);
  const setBadge = async (id, badge) => { await api.patch("/ceo/users", { user_id: id, badge }); showToast("Badge updated"); load(); };
  const blueCount = users.filter((u) => u.badge === "blue").length;
  const goldCount = users.filter((u) => u.badge === "gold").length;
  return (
    <div data-testid="ceo-affiliates-panel">
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="metric-card"><div className="metric-label">Studio Verified (Blue)</div><div className="metric-val">{blueCount}</div></div>
        <div className="metric-card"><div className="metric-label">Gold Affiliates</div><div className="metric-val">{goldCount}</div></div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: ".5px solid var(--border)", fontSize: 13, fontWeight: 500 }}>Assign badges</div>
        <table className="data-table">
          <thead><tr><th style={{ paddingTop: 14, paddingLeft: 18 }}>User</th><th>Current</th><th>Assign</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ paddingLeft: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar user={u} size={26} /><div>{u.display_name} <Badge type={u.badge} /></div></div></td>
                <td><span className={`pill ${u.badge === "blue" ? "pill-purple" : u.badge === "gold" ? "pill-amber" : "pill-gray"}`}>{u.badge}</span></td>
                <td>
                  <select className="input" style={{ maxWidth: 140, padding: "5px 8px", fontSize: 11 }} value={u.badge} onChange={(e) => setBadge(u.id, e.target.value)} data-testid={`affiliate-badge-${u.id}`}>
                    <option value="none">None</option><option value="blue">Blue (Studio)</option><option value="gold">Gold (Affiliate)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Moderation ───
function Moderation({ showToast }) {
  const [flags, setFlags] = useState([]);
  const load = () => api.get("/ceo/moderation").then((r) => setFlags(r.data.flags));
  useEffect(() => { load(); }, []);
  const resolve = async (id, action) => { await api.post(`/ceo/moderation/${id}/resolve`, { action, note: "" }); showToast(`Resolved: ${action}`); load(); };
  return (
    <div data-testid="ceo-moderation-panel">
      {flags.length === 0 && <div className="card" style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div><strong>All clear</strong><p style={{ color: "var(--text-sec)", fontSize: 13, marginTop: 6 }}>No content flagged for review.</p></div>}
      {flags.map((f) => (
        <div key={f.id} className="card" style={{ marginBottom: 8 }} data-testid={`flag-${f.id}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className={`pill ${f.status === "resolved" ? "pill-teal" : "pill-coral"}`}>{f.status}</span>
              <div style={{ fontSize: 13, marginTop: 8 }}><strong>{f.target_type}</strong> — {f.reason}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Reported {new Date(f.created_at).toLocaleString()}</div>
            </div>
            {f.status === "open" && (
              <div style={{ display: "flex", gap: 6 }}>
                <button className="row-btn" onClick={() => resolve(f.id, "dismiss")}>Dismiss</button>
                <button className="row-btn" onClick={() => resolve(f.id, "warn")}>Warn</button>
                <button className="row-btn danger" onClick={() => resolve(f.id, "remove")}>Remove</button>
                <button className="row-btn danger" onClick={() => resolve(f.id, "suspend")}>Suspend</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Settings ───
const SETTING_DESC = {
  new_signups: ["Allow new signups", "Disable to prevent new account creation."],
  maintenance: ["Maintenance mode", "Show a maintenance banner to all users. App stays usable for CEO."],
  community: ["Community enabled", "Posts, comments, and stars across the platform."],
  affiliates: ["Affiliate program", "Allow CEO to grant gold affiliate badges."],
  dummy_data: ["Demo data seeding", "Show demo seed button in onboarding."],
  email_notifications: ["Email notifications", "Send transactional emails (welcome, paid invoice, delivery)."],
};
function Settings({ showToast }) {
  const [settings, setSettings] = useState(null);
  useEffect(() => { api.get("/ceo/settings").then((r) => setSettings(r.data.settings)); }, []);
  const toggle = async (key) => {
    const newVal = !settings[key];
    setSettings({ ...settings, [key]: newVal });
    await api.put("/ceo/settings", { key, value: newVal });
    showToast(`${SETTING_DESC[key]?.[0] || key} ${newVal ? "enabled" : "disabled"}`);
  };
  if (!settings) return <div className="spinner" />;
  return (
    <div className="card" data-testid="ceo-settings-panel">
      <h3 style={{ fontSize: 15, marginBottom: 4 }}>Platform-wide toggles</h3>
      <p style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 18 }}>Changes apply instantly. Saved on the server.</p>
      {Object.entries(settings).map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: ".5px solid var(--border)" }} data-testid={`setting-${k}`}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text)" }}>{SETTING_DESC[k]?.[0] || k}</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{SETTING_DESC[k]?.[1] || ""}</div>
          </div>
          <div className={`mini-toggle ${v ? "on" : ""}`} onClick={() => toggle(k)} data-testid={`toggle-${k}`} />
        </div>
      ))}
    </div>
  );
}


// ─── A/B Test (Founder Checkout) ───
function ABTest() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/ceo/ab-test/founder-checkout").then((r) => setData(r.data));
  }, []);
  if (!data) return <div className="spinner" />;
  const [a, b] = data.variants;
  const winner = a.conversion_rate === b.conversion_rate
    ? "tie"
    : (a.conversion_rate > b.conversion_rate ? "a" : "b");

  const variantCopy = {
    a: { line1: "One dollar.", line2: "Founder status.", line3: "First month free." },
    b: { line1: "One dollar today.", line2: "Yours for life.", line3: "First month free." },
  };

  return (
    <div data-testid="ceo-abtest-panel">
      <div className="card" style={{ marginBottom: 16, padding: 18 }}>
        <div style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.6 }}>
          50/50 split on <code>/founder-checkout</code>. Each unique visit fires one impression; conversions are paid <code>founder_circle</code> transactions tagged with the same variant.
          Total impressions: <strong>{data.total_impressions}</strong> · Tracked conversions: <strong>{data.total_conversions}</strong> · Untracked (legacy): <strong>{data.untracked_conversions}</strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[a, b].map((row) => {
          const isWinner = winner === row.variant && (row.impressions > 0 || row.conversions > 0);
          const copy = variantCopy[row.variant];
          return (
            <div key={row.variant} className="card" style={{ padding: 22, border: isWinner ? "1.5px solid var(--teal)" : "1px solid var(--border)" }} data-testid={`abtest-variant-${row.variant}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-dim)" }}>Variant {row.variant.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, lineHeight: 1.2, marginTop: 6 }}>
                    {copy.line1}<br /><em style={{ color: "var(--purple-light)" }}>{copy.line2}</em><br />{copy.line3}
                  </div>
                </div>
                {isWinner && <span className="pill pill-teal" style={{ fontSize: 10 }}>LEADING</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: ".1em" }}>Impressions</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text)" }} data-testid={`abtest-${row.variant}-imps`}>{row.impressions}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: ".1em" }}>Conversions</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text)" }} data-testid={`abtest-${row.variant}-conv`}>{row.conversions}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: ".1em" }}>Conversion rate</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: isWinner ? "var(--teal)" : "var(--text)" }} data-testid={`abtest-${row.variant}-rate`}>{row.conversion_rate}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: ".1em" }}>Revenue</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: "var(--teal)" }} data-testid={`abtest-${row.variant}-rev`}>${row.revenue.toFixed(2)}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 8 }}>By referral code</div>
                {Object.keys(row.by_referral_code).length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>No conversions yet.</div>
                ) : (
                  <table className="data-table" style={{ width: "100%" }}>
                    <thead><tr><th style={{ paddingLeft: 0 }}>Code</th><th style={{ textAlign: "right" }}>Conv.</th><th style={{ textAlign: "right" }}>Revenue</th></tr></thead>
                    <tbody>
                      {Object.entries(row.by_referral_code).sort((x, y) => y[1].revenue - x[1].revenue).map(([code, agg]) => (
                        <tr key={code} data-testid={`abtest-${row.variant}-ref-${code}`}>
                          <td style={{ paddingLeft: 0, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{code}</td>
                          <td style={{ textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{agg.count}</td>
                          <td style={{ textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--teal)" }}>${agg.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 16, padding: 14, fontSize: 12, color: "var(--text-sec)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--text)" }}>How to QA a variant:</strong> append <code>?v=a</code> or <code>?v=b</code> to <code>/founder-checkout</code> to force-load that variant. Add <code>?ref=YOURCODE</code> to also attach a referrer.
      </div>
    </div>
  );
}
