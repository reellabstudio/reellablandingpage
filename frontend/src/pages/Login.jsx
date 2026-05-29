import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Logo } from "../components/Logo";
import { LOGO_WORDMARK_WHITE } from "../lib/api";
import { formatErr } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await login(email, password);
      if (u.role === "ceo") navigate("/ceo");
      else if (!u.legal_accepted) navigate("/legal");
      else navigate("/dashboard");
    } catch (e2) {
      setErr(formatErr(e2.response?.data?.detail) || e2.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-shell" data-theme="dark" data-testid="login-page">
      <div className="auth-hero">
        <img src={LOGO_WORDMARK_WHITE} alt="ReelLab" style={{ height: 44, alignSelf: "flex-start" }} />
        <div>
          <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 16 }}>
            Your studio,<br />in your pocket.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 460, lineHeight: 1.6 }}>
            Welcome back. Pick up where you left off — projects, clients, the AI editor, your community.
          </p>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>© 2026 ReelLab Studio</div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-card">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }} className="rl-mobile-logo">
            <Logo />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Sign in</h2>
          <p style={{ color: "var(--text-sec)", fontSize: 14, marginBottom: 28 }}>Welcome back to ReelLab Studio.</p>

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password" />
            </div>
            {err && <div style={{ background: "var(--coral-light)", color: "var(--coral)", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 16 }} data-testid="login-error">{err}</div>}
            <button type="submit" className="btn-primary" style={{ width: "100%", padding: 12 }} disabled={loading} data-testid="login-submit">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--text-sec)" }}>
            <Link to="/forgot-password" style={{ color: "var(--purple-light)", fontSize: 12 }} data-testid="login-forgot">Forgot your password?</Link>
            <div style={{ marginTop: 10 }}>
              New to ReelLab? <Link to="/register" style={{ color: "var(--purple)", fontWeight: 500 }} data-testid="login-to-register">Create an account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
