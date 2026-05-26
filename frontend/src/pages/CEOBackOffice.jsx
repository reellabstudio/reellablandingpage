import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { Badge, Avatar } from "../components/Logo";
import { Users, Briefcase, Receipt, MessageSquare, Shield, AlertTriangle } from "lucide-react";

export default function CEOBackOffice() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activity, setActivity] = useState([]);
  const [override, setOverride] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ action: "cancel", note: "", new_status: "" });
  const [toast, setToast] = useState(null);

  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    if (!user || user.role !== "ceo") return;
    const [ov, us, pr, ac] = await Promise.all([
      api.get("/ceo/overview"),
      api.get("/ceo/users"),
      api.get("/ceo/projects"),
      api.get("/ceo/activity"),
    ]);
    setOverview(ov.data);
    setUsers(us.data.users);
    setProjects(pr.data.projects);
    setActivity(ac.data.activity);
  };

  useEffect(() => { load(); }, [user]);

  const setBadge = async (userId, badge) => {
    await api.post("/ceo/badge", { user_id: userId, badge });
    showToast(`Badge updated`);
    load();
  };

  const doOverride = async () => {
    if (!override) return;
    await api.post("/ceo/override", {
      project_id: override.id,
      action: overrideForm.action,
      note: overrideForm.note,
      new_status: overrideForm.new_status || null,
    });
    setOverride(null);
    setOverrideForm({ action: "cancel", note: "", new_status: "" });
    showToast("Override applied");
    load();
  };

  if (!user) return <div className="page-shell">Loading…</div>;
  if (user.role !== "ceo") return <div className="page-shell" style={{ textAlign: "center", padding: 80 }}><Shield size={36} color="var(--coral)" /><h2 style={{ marginTop: 12 }}>Access denied</h2><p style={{ color: "var(--text-sec)" }}>CEO Back Office is restricted.</p></div>;

  return (
    <div className="page-shell" data-testid="ceo-page">
      {toast && <div className="toast">{toast}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Shield size={26} color="var(--purple)" />
        <h1 className="page-title" style={{ margin: 0 }}>CEO Back Office</h1>
      </div>
      <p className="page-sub">Platform-wide controls. Every override is logged.</p>

      <div style={{ display: "flex", gap: 4, borderBottom: "0.5px solid var(--border)", marginBottom: 24, overflowX: "auto" }}>
        {[
          { key: "overview", label: "Overview", icon: Briefcase },
          { key: "users", label: "Users", icon: Users },
          { key: "projects", label: "Projects", icon: Receipt },
          { key: "activity", label: "Activity Log", icon: MessageSquare },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "12px 18px", background: "none", border: "none",
              borderBottom: tab === key ? "2px solid var(--purple)" : "2px solid transparent",
              color: tab === key ? "var(--purple)" : "var(--text-sec)",
              fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}
            data-testid={`ceo-tab-${key}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "overview" && overview && (
        <div className="grid-3" data-testid="ceo-overview-panel">
          <div className="stat-card"><div className="stat-label">Total users</div><div className="stat-num">{overview.users}</div></div>
          <div className="stat-card"><div className="stat-label">Total projects</div><div className="stat-num">{overview.projects}</div></div>
          <div className="stat-card"><div className="stat-label">Paid invoices</div><div className="stat-num">{overview.paid_invoices} / {overview.invoices}</div></div>
          <div className="stat-card"><div className="stat-label">Community posts</div><div className="stat-num">{overview.community_posts}</div></div>
        </div>
      )}

      {tab === "users" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }} data-testid="ceo-users-panel">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--surface2)" }}>
              <tr style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-dim)", fontFamily: "DM Mono, monospace" }}>
                <th style={{ padding: "12px 16px" }}>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Badge</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: "0.5px solid var(--border)", fontSize: 13 }} data-testid={`ceo-user-${u.id}`}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar user={u} size={28} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{u.display_name} <Badge type={u.badge} /></div>
                        <div style={{ fontSize: 11, color: "var(--text-sec)" }}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td><span className="pill pill-purple">{u.role}</span></td>
                  <td>{u.badge}</td>
                  <td>
                    <select className="input" style={{ maxWidth: 130, padding: "5px 8px", fontSize: 11 }} value={u.badge} onChange={(e) => setBadge(u.id, e.target.value)} data-testid={`ceo-badge-${u.id}`}>
                      <option value="none">None</option>
                      <option value="blue">Blue (Studio)</option>
                      <option value="gold">Gold (Affiliate)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "projects" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }} data-testid="ceo-projects-panel">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--surface2)" }}>
              <tr style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-dim)", fontFamily: "DM Mono, monospace" }}>
                <th style={{ padding: "12px 16px" }}>Project</th>
                <th>Client</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} style={{ borderTop: "0.5px solid var(--border)", fontSize: 13 }} data-testid={`ceo-project-${p.id}`}>
                  <td style={{ padding: "14px 16px" }}><strong>{p.name}</strong></td>
                  <td>{p.client_name || "—"}</td>
                  <td><span className={`pill status-${p.status}`}>{p.status}</span></td>
                  <td><button className="btn-secondary" style={{ padding: "5px 12px", fontSize: 11, color: "var(--coral)", borderColor: "var(--coral)" }} onClick={() => setOverride(p)} data-testid={`ceo-override-${p.id}`}><AlertTriangle size={11} style={{ display: "inline", marginRight: 3 }} /> Override</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "activity" && (
        <div data-testid="ceo-activity-panel">
          {activity.length === 0 && <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>No activity yet.</div>}
          {activity.map((a) => (
            <div key={a.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{a.action.toUpperCase()}</strong>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{new Date(a.at).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-sec)" }}>Project: {a.project_id}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>{a.note}</div>
            </div>
          ))}
        </div>
      )}

      {override && (
        <div className="modal-overlay" data-testid="ceo-override-modal">
          <div className="modal">
            <div className="modal-title">Override "{override.name}"</div>
            <div className="modal-sub">This action is logged with your CEO note and timestamp.</div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Action</label>
              <select className="input" value={overrideForm.action} onChange={(e) => setOverrideForm({ ...overrideForm, action: e.target.value })} data-testid="override-action">
                <option value="cancel">Cancel project</option>
                <option value="reject">Reject project</option>
                <option value="force_status">Force status</option>
              </select>
            </div>
            {overrideForm.action === "force_status" && (
              <div style={{ marginBottom: 14 }}>
                <label className="label">New status</label>
                <select className="input" value={overrideForm.new_status} onChange={(e) => setOverrideForm({ ...overrideForm, new_status: e.target.value })} data-testid="override-status">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="editing">Editing</option>
                  <option value="review">Review</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            )}
            <div style={{ marginBottom: 18 }}>
              <label className="label">CEO note (required)</label>
              <textarea className="input" rows={3} value={overrideForm.note} onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })} data-testid="override-note" />
            </div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={doOverride} disabled={!overrideForm.note} data-testid="override-submit">Apply override</button>
            <button className="btn-ghost" style={{ width: "100%", marginTop: 6 }} onClick={() => setOverride(null)} data-testid="override-cancel">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
