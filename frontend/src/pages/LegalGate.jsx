import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { formatErr } from "../lib/api";
import { useAuth } from "../lib/auth";

const DOCS = [
  {
    key: "tc",
    backendKey: "terms",
    title: "Terms & Conditions",
    sub: "Your rights, our rights, the rules.",
    body: `By using ReelLab Studio you agree to use the platform for lawful video editing and creative work. You retain full ownership of your raw footage and final outputs. ReelLab provides AI-assisted moment detection as a productivity tool — the human creator is always responsible for the final creative decision and any commercial use.\n\nPaid uploads are required for AI processing on the Solo plan. Creator and Studio tiers include AI quotas. Two revision rounds are included per project unless your client agreement specifies otherwise.\n\nReelLab may evolve, change pricing, or sunset features with reasonable notice. You may export your data at any time.`,
  },
  {
    key: "coc",
    backendKey: "code_of_conduct",
    title: "Code of Conduct",
    sub: "Be kind. Be honest. Stay creative.",
    body: `Respect every member of the ReelLab community. Harassment, hate speech, impersonation, spam, or infringement of intellectual property is prohibited.\n\nReports are reviewed by the ReelLab moderation team and can result in warnings, suspension, or removal. Stars are a form of recognition — use them to encourage great work.\n\nClient relationships are sacred: never publicly disclose unreleased client work without permission. Affiliates and Studio members must transparently disclose paid partnerships.`,
  },
  {
    key: "tos",
    backendKey: "tos",
    title: "Terms of Service",
    sub: "How the platform itself operates.",
    body: `ReelLab Studio is provided "as is". We strive for high uptime but make no guarantee of uninterrupted service. Stored content remains the property of the uploader.\n\nPayment processing is handled via Stripe. Subscription cancellations take effect at the next billing cycle; you retain access until then.\n\nYou may delete your account at any time. Some data (legal acceptances, paid invoices) may be retained for compliance. We will never sell your data.`,
  },
];

export default function LegalGate() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  const [open, setOpen] = useState({ tc: false, coc: false, tos: false });
  const [checked, setChecked] = useState({ tc: false, coc: false, tos: false });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const allChecked = checked.tc && checked.coc && checked.tos;

  const submit = async () => {
    if (!allChecked) return;
    setErr(""); setLoading(true);
    try {
      await api.post("/auth/legal-accept", { terms: true, code_of_conduct: true, tos: true });
      await refresh();
      navigate(next || "/dashboard");
    } catch (e) {
      setErr(formatErr(e.response?.data?.detail) || e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} data-theme="dark" data-testid="legal-gate-page">
      <div className="legal-card fade-in">
        <div className="legal-card-header">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div className="rl-logo-mark">✦</div>
            <span className="rl-logo-text" style={{ fontSize: 16, fontFamily: "'DM Mono', monospace" }}>Reel<span style={{ color: "var(--purple-mid)" }}>Lab</span></span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, lineHeight: 1.25, marginBottom: 6 }}>Before you create.</h2>
          <p style={{ fontSize: 13, color: "var(--text-sec)", fontWeight: 300, lineHeight: 1.5 }}>
            We log your acceptance with timestamp & IP for compliance. Read and check all three to continue.
          </p>
        </div>
        <div style={{ padding: "20px 32px 24px" }}>
          {DOCS.map((d) => (
            <div key={d.key} className="legal-doc" data-testid={`legal-doc-${d.key}`}>
              <div className="legal-doc-header" onClick={() => setOpen({ ...open, [d.key]: !open[d.key] })}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{d.sub}</div>
                </div>
                <span style={{ fontSize: 18, color: "var(--text-dim)", transform: open[d.key] ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
              </div>
              <div className={`legal-doc-body ${open[d.key] ? "open" : ""}`} data-testid={`legal-body-${d.key}`}>
                {d.body.split("\n\n").map((p, i) => <p key={i} style={{ marginBottom: 10 }}>{p}</p>)}
              </div>
              <div style={{ borderTop: ".5px solid var(--border)", padding: "0 14px" }}>
                <label className="legal-check">
                  <div className={`legal-checkbox ${checked[d.key] ? "checked" : ""}`} onClick={(e) => { e.preventDefault(); setChecked({ ...checked, [d.key]: !checked[d.key] }); }} data-testid={`legal-cb-${d.key === "coc" ? "conduct" : d.key === "tc" ? "terms" : d.key}`}>
                    {checked[d.key] && "✓"}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-sec)" }}>I have read and agree to the {d.title}.</span>
                </label>
              </div>
            </div>
          ))}

          {err && <div style={{ background: "rgba(196,75,42,.1)", border: "1px solid rgba(196,75,42,.25)", color: "var(--coral)", padding: 10, borderRadius: 8, fontSize: 12, marginTop: 14, marginBottom: 4 }} data-testid="legal-error">{err}</div>}

          <button
            className={`btn-primary legal-cta ${allChecked ? "ready" : ""}`}
            style={{ width: "100%", padding: 14, fontSize: 14, marginTop: 16 }}
            disabled={!allChecked || loading}
            onClick={submit}
            data-testid="legal-accept"
          >
            {loading ? "Saving…" : allChecked ? "Continue →" : "Accept all three to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
