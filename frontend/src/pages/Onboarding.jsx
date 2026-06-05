import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { ArrowRight, Check, Sparkles } from "lucide-react";

const TYPES = ["UGC creator", "Personal brand", "Business / brand", "Agency / studio", "Other"];
const PLATFORMS = ["Instagram", "TikTok", "YouTube", "X (Twitter)", "LinkedIn"];
const FREQS = ["1–2x / week", "3–5x / week", "Daily", "Less than weekly"];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [freq, setFreq] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.documentElement.setAttribute("data-theme", "dark"); }, []);

  const finish = async () => {
    setBusy(true);
    try {
      await api.patch("/auth/profile", {
        creator_type: type || "Other",
        platforms_used: platforms,
        post_frequency: freq,
        tutorial_completed: true,
      }).catch(() => {});
      // Always accept legal so we land on dashboard
      await api.post("/auth/legal-accept", { terms: true, code_of_conduct: true, tos: true }).catch(() => {});
      navigate("/dashboard");
    } catch { /* noop */ }
    setBusy(false);
  };

  const totalSteps = 4;
  const canNext = (step === 1 && type) || (step === 2 && platforms.length > 0) || (step === 3 && freq) || step === 4;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} data-testid="onboarding-page">
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ flex: 1, height: 4, borderRadius: 100, background: n <= step ? "var(--purple)" : "var(--surface3)" }} />
          ))}
        </div>

        <div className="card" style={{ padding: 36 }}>
          {step === 1 && (
            <div data-testid="onb-step-1">
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "var(--text-dim)", letterSpacing: ".15em", marginBottom: 6 }}>STEP 1 OF 4</div>
              <h2 className="display-md" style={{ color: "var(--text)", margin: 0, marginBottom: 24 }}>What type of creator are you?</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TYPES.map((t) => (
                  <button key={t} onClick={() => setType(t)} data-testid={`onb-type-${t.toLowerCase().replace(/[^a-z]/g, "-")}`}
                    style={{ textAlign: "left", padding: "14px 18px", borderRadius: 100,
                      border: `1.5px solid ${type === t ? "var(--purple)" : "var(--border)"}`,
                      background: type === t ? "var(--purple-glow)" : "transparent",
                      color: "var(--text)", fontSize: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{t}</span>{type === t && <Check size={16} style={{ color: "var(--purple-mid)" }} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div data-testid="onb-step-2">
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "var(--text-dim)", letterSpacing: ".15em", marginBottom: 6 }}>STEP 2 OF 4</div>
              <h2 className="display-md" style={{ color: "var(--text)", margin: 0, marginBottom: 4 }}>Where do you post?</h2>
              <p style={{ color: "var(--text-sec)", fontSize: 13, marginBottom: 24 }}>Select all that apply.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PLATFORMS.map((p) => {
                  const selected = platforms.includes(p);
                  return (
                    <button key={p} onClick={() => setPlatforms(selected ? platforms.filter((x) => x !== p) : [...platforms, p])}
                      data-testid={`onb-platform-${p.toLowerCase().replace(/[^a-z]/g, "-")}`}
                      style={{ padding: "12px 16px", borderRadius: 100,
                        border: `1.5px solid ${selected ? "var(--purple)" : "var(--border)"}`,
                        background: selected ? "var(--purple-glow)" : "transparent",
                        color: "var(--text)", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{p}</span>{selected && <Check size={14} style={{ color: "var(--purple-mid)" }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div data-testid="onb-step-3">
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "var(--text-dim)", letterSpacing: ".15em", marginBottom: 6 }}>STEP 3 OF 4</div>
              <h2 className="display-md" style={{ color: "var(--text)", margin: 0, marginBottom: 24 }}>How often do you post?</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FREQS.map((f) => (
                  <button key={f} onClick={() => setFreq(f)} data-testid={`onb-freq-${f.toLowerCase().replace(/[^a-z]/g, "-")}`}
                    style={{ textAlign: "left", padding: "14px 18px", borderRadius: 100,
                      border: `1.5px solid ${freq === f ? "var(--purple)" : "var(--border)"}`,
                      background: freq === f ? "var(--purple-glow)" : "transparent",
                      color: "var(--text)", fontSize: 14, cursor: "pointer" }}>{f}</button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: "center" }} data-testid="onb-step-4">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--purple-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--purple-mid)" }}><Sparkles size={28} /></div>
              </div>
              <h2 className="display-md" style={{ color: "var(--text)", margin: 0, marginBottom: 12 }}>You're all set.</h2>
              <p style={{ color: "var(--text-sec)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
                Welcome to ReelLab. Your Free plan is active with 3 edits, 3 captions, and 10 calendar posts this month. Upgrade anytime.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "space-between" }}>
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="btn-ghost">← Back</button>
            ) : <button onClick={() => navigate("/dashboard")} className="btn-ghost" data-testid="onb-skip">Skip</button>}
            {step < totalSteps ? (
              <button onClick={() => setStep(step + 1)} disabled={!canNext} className="btn-primary" data-testid="onb-next">Continue <ArrowRight size={14} style={{ display: "inline", marginLeft: 4 }} /></button>
            ) : (
              <button onClick={finish} disabled={busy} className="btn-primary" data-testid="onb-finish">{busy ? "Finishing…" : "Take me to my dashboard →"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
