import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import HelpBotPublic from "../components/HelpBotPublic";

const PLAN_FEATURES = {
  solo: [
    "10 AI exports / month",
    "AI clip detection",
    "Auto captions",
    "Basic templates",
    "Mobile editing",
    "1080p exports",
    "No watermark",
    "Basic analytics",
  ],
  creator: [
    "Unlimited AI clips",
    "AI Director Mode",
    "Style DNA learning",
    "Multi-platform exports (all 8)",
    "Brand presets",
    "AI scheduling tools + calendar",
    "Advanced analytics",
    "Music sync tools",
    "4K exports + priority rendering",
  ],
  studio: [
    "Everything in Creator",
    "Team collaboration (up to 10 seats)",
    "Client dashboards & portals",
    "Approval workflows",
    "Unlimited storage",
    "AI producer assistant",
    "Brand libraries",
    "Bulk processing",
    "API access + custom AI training",
    "Blue verified badge ✓",
    "Commercial licensing",
  ],
};

const ADDONS = [
  { icon: "⚡", name: "AI Credits", desc: "Extra renders & export minutes" },
  { icon: "🎨", name: "Style Marketplace", desc: "LUTs, caption packs, transitions" },
  { icon: "🎤", name: "AI Voiceovers", desc: "Built-in voice generation" },
  { icon: "🎵", name: "Music Library", desc: "Royalty-free subscription" },
  { icon: "✂️", name: "Done-For-You Editing", desc: "Human editors in the ecosystem" },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [pricing, setPricing] = useState({
    solo: { monthly: 19, yearly: 180 },
    creator: { monthly: 49, yearly: 468 },
    studio: { monthly: 199, yearly: 1908 },
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    (async () => {
      try {
        const { data } = await api.get("/pricing");
        setPricing(data.pricing);
      } catch { /* ignore */ }
    })();
  }, []);

  const savings = (m, y) => Math.round((1 - y / (m * 12)) * 100);

  const planCard = (key, name, tagline, featured = false) => {
    const p = pricing[key];
    const monthly = yearly ? Math.round(p.yearly / 12) : p.monthly;
    return (
      <div className={`plan-card ${featured ? "featured" : ""}`} data-testid={`plan-${key}`}>
        {featured && <div className="plan-most-popular" data-testid="plan-most-popular">Most Popular</div>}
        <div className="plan-name">{name}</div>
        <div className="plan-tagline">{tagline}</div>
        <div className="plan-amount"><sup>$</sup>{monthly}</div>
        <div className="plan-period">/ month</div>
        <div className="plan-yearly-note">{yearly ? `$${p.yearly.toLocaleString()}/year · Save ${savings(p.monthly, p.yearly)}%` : ""}</div>
        <div className="plan-divider"></div>
        <ul className="plan-features">
          {PLAN_FEATURES[key].map((f) => (
            <li key={f} className="plan-feat"><div className="feat-check">✓</div>{f}</li>
          ))}
        </ul>
        <Link to="/register" className="plan-btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }} data-testid={`plan-${key}-cta`}>
          Get Early Access →
        </Link>
      </div>
    );
  };

  return (
    <div className="landing-page" data-testid="pricing-page">
      <nav className="landing-nav">
        <Link to="/" className="rl-logo" data-testid="pricing-nav-logo">
          <div className="rl-logo-mark">✦</div>
          <span className="rl-logo-text">Reel<span>Lab</span></span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/" style={{ color: "var(--text-sec)", fontSize: 13 }}>Home</Link>
          <Link to="/pricing" style={{ color: "var(--purple-light)", fontSize: 13 }}>Pricing</Link>
          <Link to="/login" style={{ color: "var(--text-sec)", fontSize: 13 }}>Sign in</Link>
          <Link to="/register" className="waitlist-btn">Get Early Access</Link>
        </div>
      </nav>

      <div className="pricing-hero">
        <p className="section-label" style={{ justifyContent: "center", marginBottom: 16 }}>Pricing</p>
        <h2 className="section-title">Simple pricing.<br /><em>Serious results.</em></h2>
        <p className="section-body" style={{ margin: "0 auto", textAlign: "center" }}>
          Start free. Scale when you're ready. Every plan includes AI editing, multi-platform export, and your first content ecosystem.
        </p>
        <div className="pricing-toggle-wrap">
          <span className={`toggle-label ${!yearly ? "active" : ""}`}>Monthly</span>
          <div className={`toggle-switch ${yearly ? "yearly" : ""}`} onClick={() => setYearly(!yearly)} data-testid="billing-toggle">
            <div className="toggle-knob"></div>
          </div>
          <span className={`toggle-label ${yearly ? "active" : ""}`}>Yearly</span>
          <span className="yearly-badge">Save up to 21%</span>
        </div>
      </div>

      <div className="pricing-grid">
        {planCard("solo", "Solo", "For beginners & casual creators just getting started.")}
        {planCard("creator", "Creator", "For serious creators & artists ready to scale their output.", true)}
        {planCard("studio", "Studio", "For agencies, labels, and teams that run content at scale.")}
      </div>

      <div className="addons-section">
        <div className="addons-title">Add-ons & Extras</div>
        <div className="addons-grid">
          {ADDONS.map((a) => (
            <div key={a.name} className="addon-card" data-testid={`addon-${a.name.replace(/\s/g, "-")}`}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div>
                <div className="addon-name">{a.name}</div>
                <div className="addon-desc">{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="landing-footer">
        <Link to="/" className="rl-logo">
          <div className="rl-logo-mark" style={{ width: 24, height: 24, fontSize: 11 }}>✦</div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--text-sec)" }}>ReelLab</span>
        </Link>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="mailto:hello@reellabstudio.com" className="landing-footer-link">Contact</a>
        </div>
        <p>© 2026 ReelLab Studio. All rights reserved.</p>
      </footer>

      <HelpBotPublic />
    </div>
  );
}
