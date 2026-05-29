import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatErr } from "../lib/api";
import HelpBotPublic from "../components/HelpBotPublic";

const PAINS = [
  "Spending 6 hours editing a 3-minute reel",
  "Posting less because editing is a full-time job",
  "Losing your best moments buried in footage",
  "Re-editing the same clip for 6 different platforms",
  "AI tools that strip out everything that makes you, you",
  "No time to plan, schedule, or track what's working",
];

const FEATURES = [
  { num: "01", icon: "🧠", title: "AI Moment Intelligence", body: "Detects emotional spikes, hook moments, crowd reactions, beat drops, punchlines, and storytelling pivots. Outputs ranked clips by category: Viral, Emotional, Controversial, Inspirational, Best Hooks.", tag: "✦ Flagship feature" },
  { num: "02", icon: "🎨", title: "Style DNA Learning", body: "The platform learns your pacing, transitions, captions, zoom style, color grading, and music preferences over time. Tell it: \"Edit this like a luxury fashion campaign.\" It delivers.", tag: "✦ The moat" },
  { num: "03", icon: "🎬", title: "AI Director Mode", body: "Type a creative direction: \"Make this feel like an A24 trailer\" or \"Edit this like cinematic NYC.\" AI changes pacing, sound, transitions, grading, captions, and framing to match.", tag: "✦ Industry first" },
  { num: "04", icon: "📱", title: "One Upload → Every Platform", body: "Automatically generates optimized versions for TikTok, Reels, YouTube Shorts, X, LinkedIn, Spotify Clips, Fashion Ads, and Podcast Shorts — each formatted and captioned for that platform's algorithm." },
  { num: "05", icon: "✏️", title: "Transcript + Timeline Editor", body: "Edit by transcript, drag clips traditionally, or use AI commands. \"Shorten pauses.\" \"Make this more intense.\" \"Add dramatic captions.\" Descript's power with CapCut's simplicity in one interface." },
  { num: "06", icon: "📊", title: "Publishing & Growth Engine", body: "AI recommends best posting times, titles, hooks, thumbnails, hashtags, and caption styles based on your niche, previous performance, and platform trends. This is where the platform gets sticky.", tag: "✦ Studio tier" },
];

const PLATFORMS = [
  { icon: "🎵", name: "TikTok", sub: "Vertical · fast cuts" },
  { icon: "📸", name: "Instagram Reels", sub: "Caption-heavy aesthetic" },
  { icon: "▶️", name: "YouTube Shorts", sub: "Retention optimized" },
  { icon: "𝕏", name: "X / Twitter", sub: "Punchline snippets" },
  { icon: "💼", name: "LinkedIn", sub: "Clean & professional" },
  { icon: "🎙", name: "Podcast Shorts", sub: "Speaker-focused clips" },
  { icon: "👗", name: "Fashion / Brand Ads", sub: "Cinematic edits" },
  { icon: "🎵", name: "Spotify Clips", sub: "Artist promos" },
];

const AUDIENCES = [
  { icon: "🎙️", title: "Podcasters", body: "Turn hours of audio-video into a week of clips. ReelLab finds the moments your audience will share before you even finish listening back." },
  { icon: "🎬", title: "YouTubers", body: "Your long-form content is a clip machine. One upload generates Shorts, Reels, TikToks, and X clips — already optimized for each algorithm." },
  { icon: "✨", title: "Creators & Personal Brands", body: "Your voice, your style, your creative direction. ReelLab learns your DNA and applies it — you stay in control of every final cut." },
  { icon: "🏢", title: "Agencies & Studios", body: "Team workspaces, client portals, approval workflows, brand libraries, and bulk processing. Run your entire client roster from one dashboard." },
];

function WaitlistForm({ tag, btnText = "Join Waitlist" }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Please enter a valid email.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/waitlist", { email, source: tag });
      setDone(true);
    } catch (e2) {
      setErr(formatErr(e2.response?.data?.detail) || "Something went wrong.");
    }
    setBusy(false);
  };

  if (done) {
    return (
      <div className="waitlist-success" data-testid={`waitlist-success-${tag}`}>
        <div className="check">✦</div>
        <strong>You're on the list.</strong>
        <p style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 4 }}>We'll be in touch. Something real is coming.</p>
      </div>
    );
  }
  return (
    <>
      <form className="waitlist-form" onSubmit={submit} data-testid={`waitlist-form-${tag}`}>
        <input type="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required data-testid={`waitlist-email-${tag}`} />
        <button type="submit" className="waitlist-btn" disabled={busy} data-testid={`waitlist-submit-${tag}`}>
          {busy ? "Joining…" : btnText}
        </button>
      </form>
      <p className="waitlist-note">No spam. Just updates when we're ready for you.</p>
      {err && <p style={{ fontSize: 12, color: "#E07070", marginTop: 8 }} data-testid={`waitlist-error-${tag}`}>{err}</p>}
    </>
  );
}

function FounderForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", creator_type: "", handle: "" });
  const submit = () => {
    // Push selection into checkout via query params + localStorage
    sessionStorage.setItem("rl_founder_prefill", JSON.stringify(form));
    const refData = localStorage.getItem("rl_ref");
    const ref = refData ? JSON.parse(refData).code : "";
    navigate(`/founder-checkout${ref ? `?ref=${ref}` : ""}`);
  };

  return (
    <div className="founder-form-card" data-testid="founder-form">
      <h3>Claim your spot</h3>
      <p className="sub">$1 today · First month of Creator free · Lifetime Founder status.</p>
      <div style={{ marginBottom: 12 }}>
        <label className="label">First Name</label>
        <input className="input" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="founder-name" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="label">Email Address</label>
        <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="founder-email" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="label">Creator Type</label>
        <select className="input" value={form.creator_type} onChange={(e) => setForm({ ...form, creator_type: e.target.value })} data-testid="founder-type">
          <option value="">Select your category…</option>
          <option>Podcaster</option><option>YouTuber</option><option>TikTok / Reels Creator</option>
          <option>Musician / Artist</option><option>Brand / Agency</option><option>Freelance Editor</option><option>Other</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label className="label">@ Handle (optional)</label>
        <input className="input" placeholder="@yourusername" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} data-testid="founder-handle" />
      </div>
      <button onClick={submit} style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: "linear-gradient(135deg, var(--purple), var(--purple-mid))", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" }} data-testid="founder-submit">
        Continue to checkout · $1 →
      </button>
      <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 10, textAlign: "center" }}>Secured by Stripe · 256-bit SSL</p>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const founderRef = useRef(null);
  const featuresRef = useRef(null);
  const waitlistRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const scrollTo = (ref) => ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="landing-page" data-testid="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="rl-logo" data-testid="nav-logo">
          <div className="rl-logo-mark">✦</div>
          <span className="rl-logo-text">Reel<span>Lab</span></span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => scrollTo(featuresRef)} style={{ background: "none", border: "none", color: "var(--text-sec)", fontSize: 13, cursor: "pointer" }} data-testid="nav-features">Features</button>
          <Link to="/pricing" style={{ color: "var(--text-sec)", fontSize: 13 }} data-testid="nav-pricing">Pricing</Link>
          <button onClick={() => scrollTo(founderRef)} style={{ background: "none", border: "none", color: "var(--text-sec)", fontSize: 13, cursor: "pointer" }} data-testid="nav-founder">Founder Circle</button>
          <Link to="/login" style={{ color: "var(--text-sec)", fontSize: 13 }} data-testid="nav-signin">Sign in</Link>
          <div className="landing-nav-pill"><div className="landing-nav-dot" />Coming Soon</div>
          <button className="waitlist-btn" onClick={() => scrollTo(waitlistRef)} data-testid="nav-cta">Get Early Access</button>
        </div>
      </nav>

      <section className="hero">
        <div className="orb orb-1"></div><div className="orb orb-2"></div><div className="orb orb-3"></div>
        <p className="hero-eyebrow">✦ Your AI Creative Operating System</p>
        <h1 className="hero-headline">Upload once.<br /><em>Build an entire</em><br />content ecosystem.</h1>
        <p className="hero-sub">ReelLab combines AI moment intelligence, style learning, and multi-platform publishing into one creative operating system. Your footage. Every format. Every platform. Automatically.</p>
        <p className="hero-subline">Opus' intelligence · Descript's workflow · CapCut's simplicity · <span>Your creative DNA</span></p>
        <div className="waitlist-wrap">
          <WaitlistForm tag="hero" />
        </div>
        <div className="hero-features">
          <span className="hero-feat"><span className="hero-feat-dot" />AI Moment Detection</span>
          <span className="hero-feat"><span className="hero-feat-dot" />Style DNA Learning</span>
          <span className="hero-feat"><span className="hero-feat-dot" />Multi-Platform Export</span>
          <span className="hero-feat"><span className="hero-feat-dot" />AI Director Mode</span>
          <span className="hero-feat"><span className="hero-feat-dot" />Publishing & Analytics</span>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stats-inner">
          <div><div className="stat-val"><em>10×</em></div><div className="stat-bar-label">Faster than manual editing</div></div>
          <div><div className="stat-val">8+</div><div className="stat-bar-label">Platforms per upload</div></div>
          <div><div className="stat-val"><em>∞</em></div><div className="stat-bar-label">Content formats</div></div>
          <div><div className="stat-val">0</div><div className="stat-bar-label">Creative compromises</div></div>
        </div>
      </div>

      <div className="pain-section">
        <div className="pain-inner">
          <h2>Sound familiar? <strong>It doesn't have to.</strong></h2>
          <div className="pain-list">
            {PAINS.map((p) => <span key={p} className="pain-tag">{p}</span>)}
          </div>
        </div>
      </div>

      <section className="landing-section" ref={featuresRef} id="features">
        <div className="landing-section-inner">
          <p className="section-label">The Platform</p>
          <h2 className="section-title">Not just an editor.<br /><em>An AI creative operator.</em></h2>
          <p className="section-body">Most tools make one thing faster. ReelLab eliminates the entire workflow — from raw footage to published, optimized, analytics-tracked content across every platform.</p>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.num} className="feat-cell" data-testid={`feature-${f.num}`}>
                <div className="feat-num">{f.num}</div>
                <span className="feat-icon">{f.icon}</span>
                <div className="feat-title">{f.title}</div>
                <div className="feat-body">{f.body}</div>
                {f.tag && <span className="feat-tag">{f.tag}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-section-inner">
          <p className="section-label">Multi-Platform Output</p>
          <h2 className="section-title">One upload.<br /><em>Eight platforms. Automatic.</em></h2>
          <div className="platform-grid">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="platform-card" data-testid={`platform-${p.name.replace(/\s/g, "-")}`}>
                <span className="platform-icon-svg">{p.icon}</span>
                <div className="platform-info"><h4>{p.name}</h4><p>{p.sub}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-section-inner">
          <p className="section-label">Who it's for</p>
          <h2 className="section-title">Made for creators who<br /><em>refuse to compromise.</em></h2>
          <p className="section-body">Whether you're a solo creator, a podcaster, a brand, or an agency — ReelLab is your entire content team.</p>
          <div className="for-grid">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="for-card" data-testid={`audience-${a.title.replace(/\s/g, "-")}`}>
                <div className="for-icon">{a.icon}</div>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div style={{ padding: "0 2rem" }}>
          <div className="survey-card">
            <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1 }}>
              <div className="survey-icon-wrap">📋</div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 5 }}>Help us build something you'll actually use.</h3>
                <p style={{ fontSize: 13, color: "var(--text-sec)", fontWeight: 300, lineHeight: 1.55 }}>Got 2 minutes? Tell us about your content workflow. Your answers shape what ReelLab becomes — and move you to the front of the line.</p>
              </div>
            </div>
            <a href="https://reellabcreatorsurvey.netlify.app" target="_blank" rel="noopener noreferrer" className="survey-btn" data-testid="survey-link">
              Take the Survey →
            </a>
          </div>
        </div>
      </section>

      <section className="landing-section" id="founder" ref={founderRef}>
        <div style={{ padding: "0 2rem" }}>
          <div className="founder-card">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="founder-badge"><div className="founder-badge-dot" />Founder Circle</div>
              <h2>Be part of<br /><em>what we're building.</em></h2>
              <p>We're building ReelLab with the creators who need it most. Join the Founder Circle for early access, founding-member pricing locked for life, and a direct line to the roadmap.</p>
              <ul className="perks-list">
                {[
                  "Early access — first through the door at launch",
                  "Founding member pricing, locked in for life",
                  "Direct line to the team — your feedback shapes the product",
                  "Exclusive updates before anyone else sees them",
                  "Priority onboarding & white-glove support at launch",
                ].map((p) => <li key={p}><div className="perk-check">✦</div>{p}</li>)}
              </ul>
            </div>
            <FounderForm />
          </div>
        </div>
      </section>

      <section className="landing-section" ref={waitlistRef}>
        <div className="bottom-cta-inner">
          <div className="mark">✦</div>
          <h2>Stop thinking about content.<br /><em>Start creating it.</em></h2>
          <p>Join creators on the waitlist. We'll reach out personally when it's your turn.</p>
          <div className="waitlist-wrap" style={{ opacity: 1, animation: "none" }}>
            <WaitlistForm tag="bottom" btnText="Get Early Access" />
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="rl-logo">
          <div className="rl-logo-mark" style={{ width: 24, height: 24, fontSize: 11 }}>✦</div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--text-sec)" }}>ReelLab</span>
        </Link>
        <div style={{ display: "flex", gap: 20 }}>
          <Link to="/pricing" className="landing-footer-link" data-testid="footer-pricing">Pricing</Link>
          <a href="https://reellabcreatorsurvey.netlify.app" target="_blank" rel="noopener noreferrer" className="landing-footer-link">Survey</a>
          <Link to="/login" className="landing-footer-link" data-testid="footer-signin">Sign In</Link>
          <a href="mailto:hello@reellabstudio.com" className="landing-footer-link" data-testid="footer-contact">Contact</a>
        </div>
        <p>© 2026 ReelLab Studio. All rights reserved.</p>
      </footer>

      <HelpBotPublic />
    </div>
  );
}
