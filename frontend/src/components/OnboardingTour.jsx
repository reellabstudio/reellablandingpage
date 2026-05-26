import { useState } from "react";
import api from "../lib/api";

const STEPS = [
  { title: "Welcome to ReelLab Studio", body: "An AI co-pilot for solo creators, freelance editors, and small studios. Let's take a quick tour." },
  { title: "Dashboard", body: "Your home base — see active projects, next actions, and recent activity in one glance." },
  { title: "Create Projects", body: "Use the 5-step wizard to spin up a project: pick a client, define deliverables, set scope, and confirm." },
  { title: "AI Editor", body: "Upload raw footage. AI detects your best moments — opening hooks, key quotes, reactions. You stay in control of every cut." },
  { title: "Invoices & Payments", body: "Send Stripe-powered invoice links. Track status. Two revision rounds are included per project." },
  { title: "Community & Stars", body: "Connect with other creators. Send one star per user per day — each star = 10 points." },
  { title: "You're all set!", body: "Need help anytime? Click the help bubble in the bottom-right." },
];

export default function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);

  const finish = async () => {
    try {
      await api.patch("/auth/profile", { tutorial_completed: true });
    } catch { /* ignore */ }
    onClose();
  };

  const s = STEPS[step];
  return (
    <div className="tour-overlay" data-testid="onboarding-tour" onClick={finish}>
      <div className="tour-card" onClick={(e) => e.stopPropagation()}>
        <div className="tour-step">STEP {step + 1} OF {STEPS.length}</div>
        <div className="tour-title">{s.title}</div>
        <div className="tour-body">{s.body}</div>
        <div className="tour-actions">
          <div className="tour-dots">
            {STEPS.map((_, i) => <div key={i} className={`tour-dot ${i === step ? "active" : ""}`} />)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={finish} data-testid="tour-skip">Skip</button>
            {step > 0 && (
              <button className="btn-ghost" onClick={() => setStep(step - 1)} data-testid="tour-prev">← Back</button>
            )}
            {step < STEPS.length - 1 ? (
              <button className="btn-primary" onClick={() => setStep(step + 1)} data-testid="tour-next">Next →</button>
            ) : (
              <button className="btn-primary" onClick={finish} data-testid="tour-finish">Get started</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
