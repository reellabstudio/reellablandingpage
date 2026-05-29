import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { Copy, Share2, TrendingUp, Users, DollarSign, Star } from "lucide-react";

export default function AffiliateHub() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [toast, setToast] = useState(null);
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2200); };

  useEffect(() => {
    api.get("/affiliate/me").then((r) => setData(r.data));
  }, []);

  const copy = (val, label) => { navigator.clipboard.writeText(val); showToast(`${label} copied`); };

  if (!data) return <div className="page-shell"><div className="spinner" /></div>;

  const periodMap = { monthly: data.mtd, quarterly: data.qtd, annual: data.ytd };
  const periodLabel = { monthly: "Month-to-date", quarterly: "Quarter-to-date", annual: "Year-to-date" };
  const maxMonthly = Math.max(...data.monthly_series.map((m) => m.amount), 50);

  return (
    <div className="page-shell" data-testid="affiliate-hub-page">
      {toast && <div className="toast">{toast}</div>}

      <h1 className="page-title" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>
        Your <em style={{ color: "var(--purple-light)" }}>Constellation</em>
      </h1>
      <p className="page-sub">
        Every creator you bring into ReelLab is a <strong>Spark</strong>. Earn <strong>15% recurring</strong> on every Creator subscription, <strong>30%</strong> on Studio.
        Keep the commission as long as your Spark stays subscribed.
      </p>

      {/* Referral link card */}
      <div className="card" style={{ marginBottom: 24, background: "linear-gradient(135deg, var(--surface) 0%, rgba(123,79,212,.05) 100%)", border: "1px solid var(--purple-border)" }} data-testid="referral-link-card">
        <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--purple-light)", marginBottom: 12 }}>Your referral link</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input className="input" readOnly value={data.referral_link} style={{ flex: 1, minWidth: 280, fontFamily: "'DM Mono', monospace" }} data-testid="referral-link" />
          <button className="btn-primary" onClick={() => copy(data.referral_link, "Link")} data-testid="copy-link"><Copy size={13} style={{ display: "inline", marginRight: 4 }} />Copy link</button>
          <button className="btn-secondary" onClick={() => copy(data.referral_code, "Code")} data-testid="copy-code"><Share2 size={13} style={{ display: "inline", marginRight: 4 }} />Copy code {data.referral_code}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card" data-testid="stat-total-earned">
          <div className="stat-label"><DollarSign size={11} style={{ display: "inline", marginRight: 4 }} />Total earned</div>
          <div className="stat-num" style={{ color: "var(--teal)" }}>${data.total_earned.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "var(--text-sec)", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>Lifetime</div>
        </div>
        <div className="stat-card" data-testid="stat-active-sparks">
          <div className="stat-label"><Star size={11} style={{ display: "inline", marginRight: 4 }} />Active Sparks</div>
          <div className="stat-num">{data.active_sparks}</div>
          <div style={{ fontSize: 11, color: "var(--text-sec)", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{data.cancelled_sparks} cancelled</div>
        </div>
        <div className="stat-card" data-testid="stat-mtd">
          <div className="stat-label"><TrendingUp size={11} style={{ display: "inline", marginRight: 4 }} />This month</div>
          <div className="stat-num">${data.mtd.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "var(--text-sec)", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>MTD</div>
        </div>
        <div className="stat-card" data-testid="stat-ytd">
          <div className="stat-label">Year to date</div>
          <div className="stat-num">${data.ytd.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "var(--text-sec)", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>YTD</div>
        </div>
      </div>

      {/* Period toggle + chart */}
      <div className="card" style={{ marginBottom: 24 }} data-testid="commission-chart-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 4 }}>{periodLabel[period]}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: "var(--teal)" }}>${(periodMap[period] || 0).toFixed(2)}</div>
          </div>
          <div style={{ display: "flex", gap: 4, background: "var(--surface2)", borderRadius: 8, padding: 4 }}>
            {["monthly", "quarterly", "annual"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className="row-btn" style={{ background: period === p ? "var(--purple)" : "transparent", color: period === p ? "#fff" : "var(--text-sec)", border: "none", padding: "5px 14px", fontSize: 11, textTransform: "capitalize" }} data-testid={`period-${p}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Simple bar chart, last 12 months */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "0 4px" }}>
          {data.monthly_series.map((m) => (
            <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }} title={`${m.month}: $${m.amount.toFixed(2)}`}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%",
                  height: `${Math.max((m.amount / maxMonthly) * 100, 2)}%`,
                  background: m.amount > 0 ? "linear-gradient(180deg, var(--purple-mid), var(--purple))" : "var(--surface3)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.4s",
                }} />
              </div>
              <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>{m.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sparks list */}
      <div className="card" style={{ padding: 0 }} data-testid="sparks-list">
        <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
          <strong style={{ fontSize: 13 }}>Your Sparks ({data.sparks.length})</strong>
          <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}>15% Creator · 30% Studio</span>
        </div>
        {data.sparks.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Users size={32} color="var(--text-dim)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>No Sparks yet</h3>
            <p style={{ fontSize: 13, color: "var(--text-sec)", maxWidth: 380, margin: "0 auto" }}>Share your referral link with creators. When they upgrade to Creator or Studio, you start earning commission automatically.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th style={{ paddingTop: 14, paddingLeft: 18 }}>Spark</th><th>Email</th><th>Plan</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>
              {data.sparks.map((s) => (
                <tr key={s.id} data-testid={`spark-${s.id}`}>
                  <td style={{ paddingLeft: 18 }}><strong>{s.referred_name || "—"}</strong></td>
                  <td>{s.referred_email}</td>
                  <td><span className={`pill ${s.plan_type === "studio" ? "pill-amber" : "pill-purple"}`}>{s.plan_type}</span></td>
                  <td><span className={`pill ${s.status === "active" ? "pill-teal" : "pill-coral"}`}>{s.status}</span></td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--text-sec)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text)" }}>How commission works:</strong> When someone signs up using your link and subscribes to Creator ($49/mo) you earn 15% (≈ $7.35/mo). Studio ($199/mo) earns 30% (≈ $59.70/mo). You earn for as long as your Spark stays subscribed — if they cancel, that commission stops the following month. Payouts go out monthly via Stripe Connect once you cross $25. Questions? <a href="mailto:sales@reellabstudio.com" style={{ color: "var(--purple-light)" }}>sales@reellabstudio.com</a>
      </div>
    </div>
  );
}
