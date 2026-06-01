import { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Edit3, Trash2, Save, X, Copy, Shuffle } from "lucide-react";

const PLANS = ["solo", "creator", "studio"];

function genCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

const emptyForm = () => ({
  code: genCode(),
  label: "",
  discount_type: "percent",
  discount_value: 20,
  plan: "creator",
  assignment_type: "shareable",
  assigned_email: "",
  duration_type: "unlimited",
  duration_amount: 30,
  duration_unit: "days",
  end_date: "",
  usage_limit_type: "single",
  usage_limit: 1,
  active: true,
});

function describeDuration(c) {
  if (c.duration_type === "unlimited") return "Unlimited";
  if (c.duration_type === "end_date") return `Until ${c.end_date?.slice(0, 10) || "?"}`;
  return `${c.duration_amount} ${c.duration_unit}`;
}
function describeUses(c) {
  const used = c.usage_count || 0;
  if (c.usage_limit_type === "unlimited") return `${used} / ∞`;
  if (c.usage_limit_type === "single") return `${used} / 1`;
  return `${used} / ${c.usage_limit}`;
}

export default function AccessControl({ showToast }) {
  const [tab, setTab] = useState("create");
  const [coupons, setCoupons] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [savedCode, setSavedCode] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [c, r] = await Promise.all([api.get("/ceo/coupons"), api.get("/ceo/coupon-redemptions")]);
    setCoupons(c.data.coupons);
    setRedemptions(r.data.redemptions);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async () => {
    setBusy(true);
    try {
      if (editingId) {
        await api.patch(`/ceo/coupons/${editingId}`, form);
        showToast("Coupon updated");
      } else {
        const { data } = await api.post("/ceo/coupons", form);
        showToast(`Coupon ${data.coupon.code} created`);
        setSavedCode(data.coupon.code);
      }
      setForm(emptyForm());
      setEditingId(null);
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || "Save failed");
    }
    setBusy(false);
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({ ...emptyForm(), ...c });
    setTab("create");
    setSavedCode(null);
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm()); };
  const toggle = async (id) => { const { data } = await api.patch(`/ceo/coupons/${id}/toggle`); showToast(data.active ? "Activated" : "Deactivated"); load(); };
  const del = async (id) => { if (!window.confirm("Delete this coupon?")) return; await api.delete(`/ceo/coupons/${id}`); showToast("Coupon deleted"); load(); };
  const copyCode = (code) => { try { navigator.clipboard.writeText(code); showToast(`${code} copied`); } catch {} };

  return (
    <div data-testid="ceo-access-control-panel">
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
        {[
          ["create", editingId ? "Edit Coupon" : "Create Coupon"],
          ["list", `All Coupons (${coupons.length})`],
          ["log", `Redemption Log (${redemptions.length})`],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="row-btn"
            style={{
              padding: "8px 16px",
              background: tab === k ? "var(--purple-glow)" : "transparent",
              borderColor: tab === k ? "var(--purple-border)" : "var(--border2)",
              color: tab === k ? "var(--purple-light)" : "var(--text-sec)",
              fontSize: 12,
            }}
            data-testid={`ac-tab-${k}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* CREATE / EDIT */}
      {tab === "create" && (
        <div className="card" data-testid="ac-form">
          {savedCode && (
            <div style={{ background: "var(--teal-light)", border: "1px solid rgba(15,155,122,.3)", borderRadius: 10, padding: 14, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid="ac-saved-banner">
              <div><strong style={{ color: "var(--teal)" }}>✓ Created!</strong> Coupon code: <code style={{ fontSize: 15, marginLeft: 6 }}>{savedCode}</code></div>
              <button className="row-btn" onClick={() => copyCode(savedCode)}><Copy size={11} /> Copy</button>
            </div>
          )}

          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{editingId ? "Edit coupon" : "Create new coupon"}</h3>

          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div>
              <label className="label">Coupon Code</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} data-testid="ac-code" />
                <button className="row-btn" onClick={() => set("code", genCode())} title="Auto-generate" data-testid="ac-code-gen"><Shuffle size={12} /></button>
              </div>
            </div>
            <div>
              <label className="label">Label / Internal Note</label>
              <input className="input" value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Founder Circle - Shaliyah" data-testid="ac-label" />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div>
              <label className="label">Discount Type</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[["percent", "% Off"], ["free", "100% Free"]].map(([v, l]) => (
                  <button key={v} className="row-btn" onClick={() => set("discount_type", v)} style={{ flex: 1, background: form.discount_type === v ? "var(--purple)" : "transparent", color: form.discount_type === v ? "#fff" : "var(--text-sec)", borderColor: form.discount_type === v ? "var(--purple)" : "var(--border2)" }} data-testid={`ac-disc-${v}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Discount Value (%)</label>
              <input className="input" type="number" min={1} max={99} value={form.discount_value} onChange={(e) => set("discount_value", parseInt(e.target.value) || 0)} disabled={form.discount_type === "free"} data-testid="ac-value" />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div>
              <label className="label">Applies To Plan</label>
              <select className="input" value={form.plan} onChange={(e) => set("plan", e.target.value)} data-testid="ac-plan">
                {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assignment Type</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[["email", "Email"], ["shareable", "Shareable Code"]].map(([v, l]) => (
                  <button key={v} className="row-btn" onClick={() => set("assignment_type", v)} style={{ flex: 1, background: form.assignment_type === v ? "var(--purple)" : "transparent", color: form.assignment_type === v ? "#fff" : "var(--text-sec)", borderColor: form.assignment_type === v ? "var(--purple)" : "var(--border2)" }} data-testid={`ac-assign-${v}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {form.assignment_type === "email" && (
            <div style={{ marginBottom: 12 }}>
              <label className="label">Assigned Email</label>
              <input className="input" type="email" value={form.assigned_email} onChange={(e) => set("assigned_email", e.target.value)} placeholder="user@email.com" data-testid="ac-email" />
            </div>
          )}

          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div>
              <label className="label">Duration Type</label>
              <select className="input" value={form.duration_type} onChange={(e) => set("duration_type", e.target.value)} data-testid="ac-duration">
                <option value="fixed">Fixed Period</option>
                <option value="end_date">Specific End Date</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>
            <div>
              {form.duration_type === "fixed" && (
                <>
                  <label className="label">Duration</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="input" type="number" min={1} value={form.duration_amount} onChange={(e) => set("duration_amount", parseInt(e.target.value) || 0)} data-testid="ac-duration-amt" />
                    <select className="input" value={form.duration_unit} onChange={(e) => set("duration_unit", e.target.value)} style={{ maxWidth: 110 }} data-testid="ac-duration-unit">
                      <option value="days">Days</option><option value="months">Months</option>
                    </select>
                  </div>
                </>
              )}
              {form.duration_type === "end_date" && (
                <>
                  <label className="label">End Date</label>
                  <input className="input" type="date" value={form.end_date?.slice(0, 10) || ""} onChange={(e) => set("end_date", e.target.value)} data-testid="ac-end-date" />
                </>
              )}
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 18 }}>
            <div>
              <label className="label">Usage Limit</label>
              <select className="input" value={form.usage_limit_type} onChange={(e) => set("usage_limit_type", e.target.value)} data-testid="ac-usage-type">
                <option value="single">Single Use</option>
                <option value="limited">Limited</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>
            <div>
              {form.usage_limit_type === "limited" && (
                <>
                  <label className="label">Max Uses</label>
                  <input className="input" type="number" min={1} value={form.usage_limit} onChange={(e) => set("usage_limit", parseInt(e.target.value) || 1)} data-testid="ac-usage-limit" />
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: ".5px solid var(--border)" }}>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
              <div className={`mini-toggle ${form.active ? "on" : ""}`} onClick={() => set("active", !form.active)} data-testid="ac-active" />
              <span>Status: <strong>{form.active ? "Active" : "Inactive"}</strong></span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {editingId && <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>}
              <button className="btn-primary" onClick={submit} disabled={busy || !form.code} data-testid="ac-submit">
                <Save size={12} style={{ display: "inline", marginRight: 4 }} />
                {busy ? "Saving…" : (editingId ? "Update coupon" : "Create coupon")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIST */}
      {tab === "list" && (
        <div className="card" style={{ padding: 0 }} data-testid="ac-list">
          <table className="data-table">
            <thead><tr>
              <th style={{ paddingTop: 14, paddingLeft: 18 }}>Code</th><th>Label</th><th>Discount</th><th>Plan</th><th>Type</th><th>Duration</th><th>Uses</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} data-testid={`ac-row-${c.id}`}>
                  <td style={{ paddingLeft: 18 }}><code style={{ background: "var(--surface2)", padding: "2px 8px", borderRadius: 4 }}>{c.code}</code></td>
                  <td style={{ fontSize: 12 }}>{c.label || "—"}</td>
                  <td>{c.discount_type === "free" ? <span className="pill pill-teal">100% Free</span> : <span className="pill pill-purple">{c.discount_value}% off</span>}</td>
                  <td><span className="pill pill-amber">{c.plan}</span></td>
                  <td style={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{c.assignment_type === "email" ? `→ ${c.assigned_email?.slice(0, 18) || "?"}` : "Shareable"}</td>
                  <td style={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{describeDuration(c)}</td>
                  <td style={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{describeUses(c)}</td>
                  <td><button className={`pill ${c.active ? "pill-teal" : "pill-gray"}`} style={{ cursor: "pointer", border: "none" }} onClick={() => toggle(c.id)} data-testid={`ac-toggle-${c.id}`}>{c.active ? "Active" : "Inactive"}</button></td>
                  <td style={{ display: "flex", gap: 4 }}>
                    <button className="row-btn" onClick={() => copyCode(c.code)} title="Copy"><Copy size={11} /></button>
                    <button className="row-btn" onClick={() => startEdit(c)} title="Edit" data-testid={`ac-edit-${c.id}`}><Edit3 size={11} /></button>
                    <button className="row-btn danger" onClick={() => del(c.id)} title="Delete" data-testid={`ac-del-${c.id}`}><Trash2 size={11} /></button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>No coupons yet. Create your first one →</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* REDEMPTION LOG */}
      {tab === "log" && (
        <div className="card" style={{ padding: 0 }} data-testid="ac-log">
          <table className="data-table">
            <thead><tr>
              <th style={{ paddingTop: 14, paddingLeft: 18 }}>User Email</th><th>Coupon</th><th>Plan</th><th>Discount</th><th>Date</th><th>Access Expires</th>
            </tr></thead>
            <tbody>
              {redemptions.map((r) => (
                <tr key={r.id} data-testid={`ac-redemption-${r.id}`}>
                  <td style={{ paddingLeft: 18 }}>{r.user_email}</td>
                  <td><code style={{ background: "var(--surface2)", padding: "2px 8px", borderRadius: 4 }}>{r.coupon_code}</code></td>
                  <td><span className="pill pill-amber">{r.plan}</span></td>
                  <td>{r.discount_applied === "FREE" ? <span className="pill pill-teal">FREE</span> : r.discount_applied}</td>
                  <td style={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{new Date(r.redeemed_at).toLocaleString()}</td>
                  <td style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text-dim)" }}>{r.access_expires_at ? new Date(r.access_expires_at).toLocaleDateString() : "Never"}</td>
                </tr>
              ))}
              {redemptions.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>No redemptions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
