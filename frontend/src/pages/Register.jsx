import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Logo } from "../components/Logo";
import { LOGO_WORDMARK_WHITE, formatErr } from "../lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", username: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.first_name.trim()) return setErr("First name is required.");
    if (!form.last_name.trim()) return setErr("Last name is required.");
    setLoading(true);
    try {
      await register(form);
      navigate("/legal");
    } catch (e2) {
      setErr(formatErr(e2.response?.data?.detail) || e2.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-shell" data-theme="dark" data-testid="register-page">
      <div className="auth-hero">
        <img src={LOGO_WORDMARK_WHITE} alt="ReelLab" style={{ height: 44, alignSelf: "flex-start" }} />
        <div>
          <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 16 }}>
            Start your studio<br />in 60 seconds.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 460, lineHeight: 1.6 }}>
            Free to create your workspace. AI editing, client portal, invoices, community — all in one place.
          </p>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>© 2026 ReelLab Studio</div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-card">
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Create your account</h2>
          <p style={{ color: "var(--text-sec)", fontSize: 14, marginBottom: 28 }}>Welcome to ReelLab Studio.</p>

          <form onSubmit={onSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label className="label">First name<span style={{ color: "var(--coral)" }}> *</span></label>
                <input className="input" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required data-testid="register-first-name" />
              </div>
              <div>
                <label className="label">Last name<span style={{ color: "var(--coral)" }}> *</span></label>
                <input className="input" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required data-testid="register-last-name" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Username</label>
              <input className="input" value={form.username} onChange={(e) => set("username", e.target.value.replace(/[^a-z0-9_]/gi, ""))} required data-testid="register-username" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required data-testid="register-email" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Password (min 6 chars)</label>
              <input className="input" type="password" minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} required data-testid="register-password" />
            </div>
            {err && <div style={{ background: "var(--coral-light)", color: "var(--coral)", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 16 }} data-testid="register-error">{err}</div>}
            <button type="submit" className="btn-primary" style={{ width: "100%", padding: 12 }} disabled={loading} data-testid="register-submit">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--text-sec)" }}>
            Already have an account? <Link to="/login" style={{ color: "var(--purple)", fontWeight: 500 }} data-testid="register-to-login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
