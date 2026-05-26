import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { LOGO_WORDMARK_WHITE } from "../lib/api";
import { Sparkles, Wand2, Users, ArrowRight } from "lucide-react";
import { useEffect } from "react";

export default function Landing() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return (
    <div className="landing" data-testid="landing-page">
      <nav className="landing-nav">
        <img src={LOGO_WORDMARK_WHITE} alt="ReelLab" style={{ height: 36 }} data-testid="landing-logo" />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link to="/login" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }} data-testid="landing-signin">Sign in</Link>
          <Link to="/register" className="btn-primary" data-testid="landing-cta-primary">Get started</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div>
          <div className="landing-eyebrow">
            <Sparkles size={14} /> AI co-pilot for video creators
          </div>
          <h1 className="landing-title">Edit faster. Stay in control.</h1>
          <p className="landing-sub">
            ReelLab Studio is the operating system for solo creators, freelance editors, and small studios.
            Upload raw footage, let AI surface your best moments, then craft the perfect cut — without ever leaving the platform.
          </p>
          <div className="landing-cta">
            <Link to="/register" className="btn-primary" style={{ padding: "14px 28px", fontSize: 14 }} data-testid="hero-cta-register">
              Start your studio <ArrowRight size={16} style={{ marginLeft: 6, display: "inline" }} />
            </Link>
            <Link to="/login" className="btn-secondary" style={{ padding: "14px 28px", fontSize: 14, background: "rgba(255,255,255,0.05)", color: "#fff", border: "0.5px solid rgba(255,255,255,0.2)" }} data-testid="hero-cta-signin">
              Sign in
            </Link>
          </div>
        </div>
        <div className="landing-mock">
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: "#ff5f56" }} />
            <span style={{ width: 10, height: 10, borderRadius: 5, background: "#ffbd2e" }} />
            <span style={{ width: 10, height: 10, borderRadius: 5, background: "#27c93f" }} />
          </div>
          <div style={{ background: "rgba(83,74,183,0.08)", border: "0.5px solid rgba(83,74,183,0.3)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#C7C0FF", marginBottom: 6 }}>✦ AI DETECTING MOMENTS</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>8 highlights found · 94% avg confidence</div>
          </div>
          {["Opening hook · 97%", "Key quote · 94%", "Product reveal · 96%"].map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
              <span>{s.split("·")[0]}</span>
              <span style={{ fontFamily: "DM Mono, monospace", color: "#5fd9b0" }}>{s.split("·")[1]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-features">
        <div className="lf-card">
          <div className="lf-icon"><Wand2 size={20} color="#C7C0FF" /></div>
          <h3 className="lf-title">AI moment detection</h3>
          <p className="lf-text">Speech energy, motion, scene changes, audio peaks. Your best clips, surfaced and ranked.</p>
        </div>
        <div className="lf-card">
          <div className="lf-icon"><Sparkles size={20} color="#C7C0FF" /></div>
          <h3 className="lf-title">Full editing suite</h3>
          <p className="lf-text">Trim, split, speed ramp, captions, transitions, royalty-free music. CapCut-style controls, studio-grade output.</p>
        </div>
        <div className="lf-card">
          <div className="lf-icon"><Users size={20} color="#C7C0FF" /></div>
          <h3 className="lf-title">Clients, invoices, community</h3>
          <p className="lf-text">Run your whole business in one place. Client portal, Stripe-ready invoicing, and a creator community.</p>
        </div>
      </section>

      <footer style={{ padding: "40px 48px", borderTop: "0.5px solid rgba(255,255,255,0.06)", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
        © 2026 ReelLab Studio · support@reellabstudio.com
      </footer>
    </div>
  );
}
