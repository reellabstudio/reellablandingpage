import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="landing-page" data-testid="not-found-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
      <div className="orb orb-1"></div><div className="orb orb-2"></div>
      <div style={{ textAlign: "center", maxWidth: 520, position: "relative", zIndex: 1 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--purple-light)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 18 }}>✦ Error 404</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(3rem, 7vw, 5rem)", fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 18, color: "var(--text)" }}>
          This page<br /><em style={{ color: "var(--purple-light)" }}>doesn't exist.</em>
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-sec)", fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
          The link may be broken, the page may have moved, or it might never have existed. Either way — let's get you back on track.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" className="btn-primary" style={{ padding: "12px 26px" }} data-testid="404-home">Take me home</Link>
          <Link to="/pricing" className="btn-secondary" style={{ padding: "12px 26px" }} data-testid="404-pricing">View pricing</Link>
          <a href="mailto:support@reellabstudio.com" className="btn-secondary" style={{ padding: "12px 26px" }} data-testid="404-support">Email support</a>
        </div>
      </div>
    </div>
  );
}
