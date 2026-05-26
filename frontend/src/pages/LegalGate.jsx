import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatErr } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Logo } from "../components/Logo";

const DOCS = [
  {
    key: "terms",
    title: "Terms & Conditions",
    body: `By using ReelLab Studio you agree to use the platform for lawful video editing and client work. You retain all rights to your raw footage and final edited output. ReelLab provides AI-assisted moment detection as a productivity tool — the human creator is responsible for the final creative decision. Paid uploads are required for project processing. Two revision rounds are included per project; additional rounds may be billed.`,
  },
  {
    key: "code_of_conduct",
    title: "Code of Conduct",
    body: `Be kind. Be honest. Respect other creators in the community. Harassment, hate speech, impersonation, spam, or any infringement of intellectual property is prohibited. Reports are reviewed by the ReelLab team and can result in account suspension. Use stars to recognise great work — they reflect community appreciation.`,
  },
  {
    key: "tos",
    title: "Terms of Service",
    body: `ReelLab Studio is provided "as is". We strive for high uptime but make no guarantee of uninterrupted service. Stored content remains the property of the uploader. Payment processing is handled via Stripe (and is currently mocked in this preview environment). You may delete your account at any time; some data may be retained for legal compliance.`,
  },
];

export default function LegalGate() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState({ terms: false, code_of_conduct: false, tos: false });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const allChecked = checked.terms && checked.code_of_conduct && checked.tos;

  const onSubmit = async () => {
    setErr("");
    setLoading(true);
    try {
      await api.post("/auth/legal-accept", checked);
      await refresh();
      navigate("/dashboard");
    } catch (e) {
      setErr(formatErr(e.response?.data?.detail) || e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 20px" }} data-testid="legal-gate-page">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={36} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Before you continue</h1>
        <p style={{ color: "var(--text-sec)", fontSize: 14, marginBottom: 28 }}>
          Read and accept our policies. We log your acceptance with timestamp and IP for compliance.
        </p>

        {DOCS.map((d) => (
          <div key={d.key} className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>{d.title}</h3>
            <div style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.65, maxHeight: 150, overflowY: "auto", padding: "8px 12px", background: "var(--surface2)", borderRadius: 8, marginBottom: 12 }}>
              {d.body}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={checked[d.key]}
                onChange={(e) => setChecked({ ...checked, [d.key]: e.target.checked })}
                data-testid={`legal-${d.key}`}
                style={{ width: 16, height: 16, accentColor: "var(--purple)" }}
              />
              I have read and agree to the {d.title}.
            </label>
          </div>
        ))}

        {err && <div style={{ background: "var(--coral-light)", color: "var(--coral)", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{err}</div>}

        <button
          className="btn-primary"
          style={{ width: "100%", padding: 14, fontSize: 14 }}
          onClick={onSubmit}
          disabled={!allChecked || loading}
          data-testid="legal-continue"
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
