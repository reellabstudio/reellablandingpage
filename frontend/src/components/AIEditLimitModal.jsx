import { useState } from "react";
import api from "../lib/api";
import { Sparkles, ArrowRight, X } from "lucide-react";

const TIERS = [
  { key: "ai_edits_1", price: 12, count: 1, label: "1 edit" },
  { key: "ai_edits_3", price: 30, count: 3, label: "3 edits", best: true },
  { key: "ai_edits_5", price: 50, count: 5, label: "5 edits" },
];

export default function AIEditLimitModal({ open, onClose, message }) {
  const [pick, setPick] = useState("ai_edits_3");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const tier = TIERS.find((t) => t.key === pick);
  const buy = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        package_id: pick,
        origin_url: window.location.origin,
      });
      if (data.url) {
        window.location.href = data.url;
      } else if (data.session_id) {
        await api.post(`/payments/mock-complete/${data.session_id}`);
        onClose?.();
        window.location.reload();
      }
    } catch (e) {
      alert(e.response?.data?.detail || "Couldn't open checkout");
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="ai-edit-limit-modal">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, padding: 32 }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }} data-testid="ai-modal-close"><X size={18} /></button>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--purple-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--purple-mid)" }}><Sparkles size={24} /></div>
        </div>
        <h3 className="display-md" style={{ color: "var(--text)", textAlign: "center", margin: 0, marginBottom: 8 }}>
          {message ? "AI edit limit reached" : "You've used all your AI edits"}
        </h3>
        <p style={{ color: "var(--text-sec)", textAlign: "center", fontSize: 13.5, marginBottom: 24, lineHeight: 1.5 }}>
          {message || "Top up below or upgrade to keep editing."}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
          {TIERS.map((t) => (
            <button key={t.key} onClick={() => setPick(t.key)} data-testid={`ai-tier-${t.key}`}
              style={{
                padding: "16px 10px", borderRadius: 14, cursor: "pointer",
                border: `1.5px solid ${pick === t.key ? "var(--purple)" : "var(--border)"}`,
                background: pick === t.key ? "var(--purple-glow)" : "var(--surface2)",
                position: "relative", textAlign: "center",
              }}>
              {t.best && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", padding: "2px 10px", background: "var(--amber)", color: "#fff", borderRadius: 100, fontSize: 9, fontFamily: "DM Mono, monospace", letterSpacing: ".1em" }}>BEST VALUE</div>}
              <div className="display-md" style={{ color: "var(--text)", margin: 0 }}>${t.price}</div>
              <div style={{ fontSize: 11, color: "var(--text-sec)", fontFamily: "DM Mono, monospace", marginTop: 4 }}>{t.label}</div>
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={buy} disabled={busy} style={{ width: "100%", padding: 14 }} data-testid="ai-modal-buy">
          {busy ? "Opening checkout…" : `Add AI edits — $${tier.price}`}
        </button>
        <button onClick={onClose} className="btn-ghost" style={{ width: "100%", marginTop: 8 }} data-testid="ai-modal-decline">Not right now</button>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <a href="/plan-checkout?plan=studio&billing=monthly" style={{ color: "var(--purple-mid)", fontSize: 12, fontFamily: "DM Mono, monospace" }} data-testid="ai-modal-upgrade">Or upgrade to Studio for unlimited <ArrowRight size={11} style={{ display: "inline" }} /></a>
        </div>
      </div>
    </div>
  );
}
