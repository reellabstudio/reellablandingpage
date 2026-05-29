import { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatErr } from "../lib/api";
import { Logo } from "../components/Logo";
import { LOGO_WORDMARK_WHITE } from "../lib/api";

export default function PasswordResetRequest() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [devLink, setDevLink] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { data } = await api.post("/auth/password-reset/request", { email });
      setDone(true);
      if (data.dev_reset_link) setDevLink(data.dev_reset_link);
    } catch (e2) {
      setErr(formatErr(e2.response?.data?.detail) || e2.message);
    }
    setBusy(false);
  };

  return (
    <div className="auth-shell" data-theme="dark" data-testid="forgot-password-page">
      <div className="auth-hero">
        <img src={LOGO_WORDMARK_WHITE} alt="ReelLab" style={{ height: 44, alignSelf: "flex-start" }} />
        <div>
          <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 16 }}>Forgot your<br />password?</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 460, lineHeight: 1.6 }}>
            No worries. Enter your email and we'll send you a reset link valid for 30 minutes.
          </p>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>© 2026 ReelLab Studio</div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-card">
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Reset your password</h2>
          <p style={{ color: "var(--text-sec)", fontSize: 14, marginBottom: 28 }}>We'll email you a secure reset link.</p>
          {!done ? (
            <form onSubmit={submit}>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="forgot-email" />
              </div>
              {err && <div style={{ background: "var(--coral-light)", color: "var(--coral)", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{err}</div>}
              <button type="submit" className="btn-primary" style={{ width: "100%", padding: 12 }} disabled={busy} data-testid="forgot-submit">
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          ) : (
            <div data-testid="forgot-success">
              <div style={{ background: "var(--teal-light)", border: "1px solid rgba(15,155,122,.3)", padding: 16, borderRadius: 10, marginBottom: 16 }}>
                <strong style={{ color: "var(--teal)" }}>Check your inbox.</strong>
                <p style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 6 }}>If an account exists for <strong>{email}</strong>, you'll receive a reset link within a minute. The link expires in 30 minutes.</p>
              </div>
              {devLink && (
                <div style={{ background: "var(--amber-light)", border: "1px solid rgba(196,137,26,.3)", padding: 12, borderRadius: 8, fontSize: 11, color: "var(--amber)" }} data-testid="dev-reset-link">
                  <strong>DEV mode (no SMTP configured):</strong>
                  <div style={{ wordBreak: "break-all", marginTop: 6, fontFamily: "'DM Mono', monospace" }}><a href={devLink} style={{ color: "var(--amber)" }}>{devLink}</a></div>
                </div>
              )}
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--text-sec)" }}>
            Remembered it? <Link to="/login" style={{ color: "var(--purple-light)", fontWeight: 500 }} data-testid="forgot-to-login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
