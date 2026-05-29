import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api, { formatErr } from "../lib/api";
import { LOGO_WORDMARK_WHITE } from "../lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== pw2) return setErr("Passwords don't match.");
    if (!token) return setErr("Missing reset token. Please request a new reset link.");
    setBusy(true);
    try {
      await api.post("/auth/password-reset/confirm", { token, new_password: pw });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (e2) {
      setErr(formatErr(e2.response?.data?.detail) || e2.message);
    }
    setBusy(false);
  };

  return (
    <div className="auth-shell" data-theme="dark" data-testid="reset-password-page">
      <div className="auth-hero">
        <img src={LOGO_WORDMARK_WHITE} alt="ReelLab" style={{ height: 44, alignSelf: "flex-start" }} />
        <div>
          <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 16 }}>Set a new<br />password.</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 460, lineHeight: 1.6 }}>
            Choose something memorable but strong. At least 6 characters.
          </p>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>© 2026 ReelLab Studio</div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-card">
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>New password</h2>
          <p style={{ color: "var(--text-sec)", fontSize: 14, marginBottom: 28 }}>Almost there.</p>
          {done ? (
            <div style={{ background: "var(--teal-light)", border: "1px solid rgba(15,155,122,.3)", padding: 16, borderRadius: 10 }} data-testid="reset-success">
              <strong style={{ color: "var(--teal)" }}>Password updated ✓</strong>
              <p style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 6 }}>Redirecting you to sign in…</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div style={{ marginBottom: 14 }}><label className="label">New password</label><input className="input" type="password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required data-testid="reset-pw" /></div>
              <div style={{ marginBottom: 20 }}><label className="label">Confirm password</label><input className="input" type="password" minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} required data-testid="reset-pw2" /></div>
              {err && <div style={{ background: "var(--coral-light)", color: "var(--coral)", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 16 }} data-testid="reset-error">{err}</div>}
              <button type="submit" className="btn-primary" style={{ width: "100%", padding: 12 }} disabled={busy} data-testid="reset-submit">
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
          <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--text-sec)" }}>
            <Link to="/login" style={{ color: "var(--purple-light)", fontWeight: 500 }}>Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
