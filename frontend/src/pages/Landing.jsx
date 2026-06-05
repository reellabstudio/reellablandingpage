import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Scissors, Sparkles, Calendar, Send, Star, Check, ChevronDown } from "lucide-react";
import api from "../lib/api";

const FEATURES_TABLE = [
  ["Video edits / mo", "3", "15", "Unlimited"],
  ["AI Auto-Edits / mo", "0", "5 (+$12/ea)", "Unlimited"],
  ["AI captions / mo", "3", "30", "Unlimited"],
  ["Calendar posts", "10", "Unlimited", "Unlimited"],
  ["Export package", "✓", "✓", "✓"],
  ["Direct publishing", "—", "—", "IG / TikTok / YT"],
  ["Brand voice training", "—", "—", "✓"],
  ["Client delivery + invoicing", "—", "—", "✓"],
];

const TESTIMONIALS = [
  { name: "Jordan M.", role: "UGC creator · 42K", quote: "Cut my post turnaround from 90 min to 6. The auto-edit alone is worth it.", initials: "JM" },
  { name: "Taylor S.", role: "Fitness · Studio plan", quote: "I run an entire content team out of ReelLab now. Brand voice + client delivery in one place.", initials: "TS" },
];

const FAQS = [
  { q: "Do I need editing experience?", a: "Nope. ReelLab is built for creators who hate editing. Upload your raw clip — AI Auto-Edit handles trim, framing, captions, and platform formatting. You just pick what gets posted." },
  { q: "Is the Free plan really free?", a: "Yes — no card, no trial countdown. 3 edits, 3 captions, and 10 calendar posts per month, forever. Upgrade only when you need more." },
  { q: "What's the $12 add-on for?", a: "If you're on Creator and burn through your 5 monthly AI Auto-Edits, you can buy more à la carte: $12 for 1, $30 for 3, $50 for 5. No subscription change required." },
  { q: "Creator vs Studio — which one's for me?", a: "Creator is for solo creators who want unlimited tools but post mainly themselves. Studio adds direct publishing to IG/TikTok/YT, brand voice training, client invoicing, and a private review queue with our team. If you're an agency or post for clients, you want Studio." },
  { q: "What's the Founder's Circle?", a: "First 100 paying members lock $49/mo Creator pricing for life with a $50 one-time entry. After 100, the offer closes and pricing goes to $89/mo." },
];

export default function Landing() {
  const [yearly, setYearly] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [founder, setFounder] = useState({ available: true, spots_left: 67, cap: 100 });
  const [signup, setSignup] = useState({ name: "", email: "", password: "" });
  const [signupErr, setSignupErr] = useState("");
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupOk, setSignupOk] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    api.get("/pricing").then(({ data }) => { if (data.founder) setFounder(data.founder); }).catch(() => {});
  }, []);

  const submitSignup = async (e) => {
    e.preventDefault();
    setSignupErr("");
    if (!signup.email || !signup.password) {
      setSignupErr("Email and password are required.");
      return;
    }
    setSignupBusy(true);
    try {
      const [first, ...rest] = signup.name.trim().split(/\s+/);
      const last = rest.join(" ") || "User";
      const username = (signup.email.split("@")[0] || "user").replace(/[^a-z0-9_]/gi, "").slice(0, 20) || `u${Date.now() % 100000}`;
      await api.post("/auth/register", {
        email: signup.email,
        password: signup.password,
        first_name: first || "Creator",
        last_name: last,
        username,
      });
      setSignupOk(true);
      setTimeout(() => { window.location.href = "/onboarding"; }, 800);
    } catch (err) {
      setSignupErr(err.response?.data?.detail || "Couldn't create account.");
    }
    setSignupBusy(false);
  };

  const planPrice = (plan) => {
    if (plan === "free") return { price: 0, period: "/forever", note: "No card needed" };
    if (plan === "creator") return yearly
      ? { price: 75, period: "/mo", note: "Billed annually · $900/yr" }
      : { price: 89, period: "/mo", note: "Billed monthly · cancel anytime" };
    if (plan === "studio") return yearly
      ? { price: 175, period: "/mo", note: "Billed annually · $2,100/yr" }
      : { price: 199, period: "/mo", note: "Billed monthly · cancel anytime" };
  };

  return (
    <div data-testid="landing-v9" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* NAV */}
      <Nav />

      {/* HERO */}
      <section style={{ position: "relative", padding: "140px 24px 80px", textAlign: "center", overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: "50%", top: "20%", transform: "translate(-50%, -50%)",
          width: 900, height: 900, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,92,191,0.35) 0%, rgba(124,92,191,0) 60%)",
          filter: "blur(60px)", pointerEvents: "none", zIndex: 0,
        }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto" }}>
          <span style={{
            display: "inline-block", padding: "6px 14px", borderRadius: 100,
            background: "var(--purple-glow)", border: "1px solid var(--purple-border)",
            color: "var(--purple-light)", fontSize: 12, letterSpacing: ".05em", marginBottom: 28,
            fontFamily: "DM Mono, monospace",
          }} data-testid="hero-eyebrow">The creator workflow OS</span>
          <h1 className="display-xl" style={{ margin: "0 0 22px", color: "var(--text)" }} data-testid="hero-h1">
            Film it. <span style={{ color: "var(--purple-mid)" }}>ReelLab it.</span> Post it.
          </h1>
          <p style={{ fontSize: 18, color: "var(--text-sec)", maxWidth: 640, margin: "0 auto 36px", lineHeight: 1.6 }}>
            Stop juggling five apps to get one post live. ReelLab handles your editing, captions, content calendar, and export — so all you have to do is upload.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
            <Link to="/register" className="btn-primary" data-testid="hero-cta-primary" style={{ padding: "16px 30px", fontSize: 15 }}>Start for free →</Link>
            <a href="#how" className="btn-secondary" data-testid="hero-cta-secondary" style={{ padding: "16px 30px", fontSize: 15 }}>See how it works</a>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "DM Mono, monospace" }}>Free plan available · No credit card required · Upgrade anytime</div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", padding: "40px 24px" }}>
          {[
            ["8 min", "avg. clip to upload-ready"],
            ["4 → 1", "tools replaced"],
            ["3 steps", "from filming to posted"],
          ].map(([num, label]) => (
            <div key={num} style={{ textAlign: "center" }}>
              <div className="display-lg" style={{ color: "var(--purple-mid)", margin: 0 }}>{num}</div>
              <div style={{ color: "var(--text-sec)", fontSize: 13, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="how" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 className="display-lg" style={{ color: "var(--text)", margin: 0 }}>The 4-step workflow</h2>
          <p style={{ color: "var(--text-sec)", fontSize: 15, marginTop: 10 }}>Designed to take you from raw footage to scheduled post in one sitting.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          {[
            { num: 1, Icon: Scissors, title: "Edit", desc: "AI Auto-Edit trims, frames, and adds burned subtitles in seconds.", color: "var(--purple-mid)" },
            { num: 2, Icon: Sparkles, title: "Caption", desc: "Three platform-tuned caption options per video, with hashtags and CTAs.", color: "var(--teal)" },
            { num: 3, Icon: Calendar, title: "Organize", desc: "Schedule across IG, TikTok, YT, X, Facebook from one calendar.", color: "#5BA4E8" },
            { num: 4, Icon: Send, title: "Upload", desc: "Studio: direct publish. Everyone else: one-tap export package.", color: "var(--amber)" },
          ].map(({ num, Icon, title, desc, color }) => (
            <div className="card" key={num} style={{ padding: 24 }}>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "var(--text-dim)", letterSpacing: ".15em" }}>STEP {String(num).padStart(2, "0")}</div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}22`, color, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 14 }}><Icon size={20} /></div>
              <div className="display-md" style={{ marginBottom: 6, color: "var(--text)" }}>{title}</div>
              <p style={{ color: "var(--text-sec)", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, textAlign: "center", padding: "14px 18px", background: "var(--surface2)", borderRadius: 100, display: "inline-flex", alignSelf: "center", color: "var(--text-sec)", fontSize: 13, marginLeft: "50%", transform: "translateX(-50%)" }}>
          Average time from raw clip to upload-ready: <strong style={{ color: "var(--purple-mid)", marginLeft: 6 }}>under 8 minutes.</strong>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 className="display-lg" style={{ color: "var(--text)", margin: 0 }}>Simple, fair pricing</h2>
          <p style={{ color: "var(--text-sec)", fontSize: 15, marginTop: 10 }}>Start free. Upgrade when you need more.</p>
        </div>
        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 100, padding: 4, display: "flex", gap: 4 }}>
            {[{ k: false, l: "Monthly" }, { k: true, l: "Annual · save 16%" }].map(({ k, l }) => (
              <button key={l} onClick={() => setYearly(k)} data-testid={k ? "pricing-toggle-annual" : "pricing-toggle-monthly"}
                style={{
                  padding: "8px 18px", borderRadius: 100, border: "none", cursor: "pointer",
                  background: yearly === k ? "var(--purple)" : "transparent",
                  color: yearly === k ? "#fff" : "var(--text-sec)", fontSize: 13, fontWeight: 500,
                }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, maxWidth: 1100, margin: "0 auto" }}>
          <PlanCard plan="free" name="Free" tag="For testing the waters." {...planPrice("free")}
            features={["3 video edits/mo", "3 AI captions/mo", "10-post calendar", "Export package", "Email support"]} />
          <PlanCard plan="creator" name="Creator" tag="For serious creators ready to scale." featured {...planPrice("creator")}
            features={["15 video edits/mo", "5 AI Auto-Edits/mo", "30 AI captions/mo", "Unlimited calendar + library", "All editing tools", "Priority email support"]}
            upsell="Extra AI edits: $12/edit · $30/3 · $50/5" />
          <PlanCard plan="studio" name="Studio" tag="For agencies, labels, teams." {...planPrice("studio")}
            features={["Unlimited everything", "Unlimited AI Auto-Edits", "Direct push to IG / TikTok / YT", "Brand voice training", "Client delivery + invoicing", "CEO project review queue"]} />
        </div>

        {/* Feature comparison table */}
        <div className="card" style={{ marginTop: 60, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)" }}>
            <div className="display-md" style={{ color: "var(--text)", margin: 0 }}>Full feature comparison</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", padding: "14px 28px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", fontFamily: "DM Mono, monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-dim)" }}>
            <div></div><div>Free</div><div style={{ color: "var(--purple-mid)" }}>Creator</div><div style={{ color: "var(--purple-light)" }}>Studio</div>
          </div>
          {FEATURES_TABLE.map((row) => (
            <div key={row[0]} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", padding: "12px 28px", borderBottom: "1px solid var(--border)", fontSize: 13.5 }}>
              <div style={{ color: "var(--text)" }}>{row[0]}</div>
              <div style={{ color: "var(--text-sec)" }}>{row[1]}</div>
              <div style={{ color: "var(--text-sec)" }}>{row[2]}</div>
              <div style={{ color: "var(--text-sec)" }}>{row[3]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER'S CIRCLE */}
      {founder.available && (
        <section id="founders" style={{ padding: "60px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div className="card" style={{ borderColor: "var(--amber)", padding: 36, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, alignItems: "center" }} data-testid="founders-card">
            <div>
              <div style={{ display: "inline-block", padding: "5px 12px", borderRadius: 100, background: "var(--amber-light)", color: "var(--amber)", fontSize: 11, fontFamily: "DM Mono, monospace", letterSpacing: ".1em", marginBottom: 18 }}>✦ FOUNDER'S CIRCLE</div>
              <h3 className="display-md" style={{ color: "var(--text)", marginTop: 0, marginBottom: 12 }}>Lock in your spot before they're gone.</h3>
              <p style={{ color: "var(--text-sec)", fontSize: 14, lineHeight: 1.65, marginBottom: 16 }}>
                $50 one-time, $49/mo Creator <strong style={{ color: "var(--text)" }}>locked for life</strong>, Silver badge in the community, voter panels on new features, and first-dibs on every new tool we ship.
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="display-lg" style={{ color: "var(--amber)", margin: 0 }} data-testid="founders-spots">{founder.spots_left}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "DM Mono, monospace", marginBottom: 18 }}>spots remaining of {founder.cap}</div>
              <Link to="/founder-checkout" className="btn-primary" data-testid="founders-cta" style={{ background: "var(--amber)", padding: "14px 26px" }}>Claim my spot →</Link>
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      <section style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 className="display-lg" style={{ color: "var(--text)", margin: 0 }}>Creators who switched</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>{[1,2,3,4,5].map((s) => <Star key={s} size={14} fill="var(--amber)" color="var(--amber)" />)}</div>
              <p style={{ color: "var(--text)", fontSize: 16, lineHeight: 1.6, margin: "0 0 22px" }}>"{t.quote}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{t.initials}</div>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--text)", fontSize: 14 }}>{t.name}</div>
                  <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SIGNUP */}
      <section style={{ padding: "100px 24px", background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <h2 className="display-lg" style={{ color: "var(--text)", margin: "0 0 18px" }}>Start free in 30 seconds.</h2>
            <p style={{ color: "var(--text-sec)", fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
              No credit card. No trial countdown. Just sign up and start editing.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {["3 video edits per month", "3 AI captions per month", "10-post calendar", "Export to any platform"].map((p) => (
                <li key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", color: "var(--text-sec)", fontSize: 14 }}>
                  <Check size={16} style={{ color: "var(--teal)" }} /> {p}
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={submitSignup} className="card" style={{ padding: 28 }} data-testid="landing-signup-form">
            {signupOk ? (
              <div style={{ textAlign: "center", padding: 30 }}><div style={{ color: "var(--teal)", fontSize: 16, marginBottom: 8 }}>✓ Welcome aboard.</div><div style={{ color: "var(--text-sec)", fontSize: 13 }}>Redirecting to onboarding…</div></div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label className="label">Name (optional)</label>
                  <input className="input" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} placeholder="Your full name" data-testid="signup-name" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="label">Email *</label>
                  <input className="input" type="email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} placeholder="you@email.com" required data-testid="signup-email" />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label className="label">Password *</label>
                  <input className="input" type="password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} placeholder="At least 6 characters" required minLength={6} data-testid="signup-password" />
                </div>
                {signupErr && <div style={{ color: "var(--coral)", fontSize: 12, marginBottom: 12 }}>{signupErr}</div>}
                <button type="submit" className="btn-primary" disabled={signupBusy} style={{ width: "100%", padding: 14 }} data-testid="signup-submit">
                  {signupBusy ? "Creating account…" : "Create my free account →"}
                </button>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
                  By signing up you agree to our <Link to="/legal" style={{ color: "var(--text-sec)", textDecoration: "underline" }}>Terms</Link>. Already have an account? <Link to="/login" style={{ color: "var(--purple-mid)" }}>Sign in</Link>.
                </div>
              </>
            )}
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "100px 24px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}><h2 className="display-lg" style={{ color: "var(--text)", margin: 0 }}>Questions, answered.</h2></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map((f, i) => (
            <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }} data-testid={`faq-${i}`}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: "100%", padding: "18px 22px", background: "transparent", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text)", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
                {f.q}
                <ChevronDown size={18} style={{ color: "var(--text-dim)", transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {openFaq === i && (
                <div style={{ padding: "0 22px 22px", color: "var(--text-sec)", fontSize: 14, lineHeight: 1.65 }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "60px 24px 40px", color: "var(--text-dim)", fontSize: 13 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.5fr repeat(3, 1fr)", gap: 40 }}>
          <div>
            <Link to="/" className="rl-logo"><div className="rl-logo-mark">✦</div><span className="rl-logo-text" style={{ fontFamily: "Sora, sans-serif", fontWeight: 600 }}>ReelLab</span></Link>
            <p style={{ marginTop: 14, color: "var(--text-sec)", maxWidth: 320, lineHeight: 1.5 }}>The creator workflow OS — edit, caption, organize, upload.</p>
          </div>
          <FooterCol title="Product" links={[["How it works", "#how"], ["Pricing", "#pricing"], ["Founder Circle", "#founders"]]} />
          <FooterCol title="Company" links={[["Login", "/login"], ["Sign up", "/register"], ["Contact", "mailto:hello@reellabstudio.com"]]} />
          <FooterCol title="Legal" links={[["Terms", "/legal"], ["Privacy", "/legal"], ["Refunds", "mailto:hello@reellabstudio.com"]]} />
        </div>
        <div style={{ maxWidth: 1200, margin: "40px auto 0", paddingTop: 20, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", color: "var(--text-dim)", fontSize: 12 }}>
          <div>© {new Date().getFullYear()} ReelLab Studio · reellabstudio.com</div>
          <div>Made for creators.</div>
        </div>
      </footer>
    </div>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50, padding: "16px 24px",
      background: scrolled ? "rgba(10,10,15,0.85)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      transition: "all 0.2s",
    }} data-testid="landing-nav">
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" className="rl-logo"><div className="rl-logo-mark">✦</div><span style={{ fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 16 }}>ReelLab</span></Link>
        <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
          {[["How it works", "#how"], ["Pricing", "#pricing"], ["Founders", "#founders"]].map(([l, h]) => (
            <a key={l} href={h} style={{ color: "var(--text-sec)", fontSize: 13.5, fontWeight: 400 }} className="nav-anchor">{l}</a>
          ))}
          <Link to="/login" style={{ color: "var(--text-sec)", fontSize: 13.5 }}>Sign in</Link>
          <Link to="/register" className="btn-primary" data-testid="nav-cta" style={{ padding: "9px 18px", fontSize: 13 }}>Start for free</Link>
        </div>
      </div>
    </nav>
  );
}

function PlanCard({ plan, name, tag, price, period, note, features, featured, upsell }) {
  return (
    <div className={`card ${featured ? "featured" : ""}`} style={{ padding: 28, position: "relative", display: "flex", flexDirection: "column" }} data-testid={`plan-${plan}`}>
      {featured && <div style={{ position: "absolute", top: -12, right: 22, padding: "4px 12px", borderRadius: 100, background: "var(--purple)", color: "#fff", fontSize: 10, fontFamily: "DM Mono, monospace", letterSpacing: ".1em", textTransform: "uppercase" }}>Most popular</div>}
      <div className="display-md" style={{ color: "var(--text)", marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 13, color: "var(--text-sec)", marginBottom: 22, minHeight: 38 }}>{tag}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
        <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 44, color: "var(--text)" }} data-testid={`plan-${plan}-price`}>${price}</span>
        <span style={{ color: "var(--text-dim)", fontSize: 14 }}>{period}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-dim)", fontFamily: "DM Mono, monospace", marginBottom: 22 }}>{note}</div>
      {upsell && (
        <div style={{ padding: "8px 12px", background: "var(--amber-light)", color: "var(--amber)", borderRadius: 100, fontSize: 11, marginBottom: 18, textAlign: "center", border: "1px solid rgba(186,117,23,.25)" }}>{upsell}</div>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 22, flex: 1 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", fontSize: 13.5, color: "var(--text-sec)" }}>
            <Check size={14} style={{ color: "var(--purple-mid)", flexShrink: 0, marginTop: 3 }} /> {f}
          </li>
        ))}
      </ul>
      <Link to={plan === "free" ? "/register" : `/plan-checkout?plan=${plan}&billing=monthly`} className="btn-primary" data-testid={`plan-${plan}-cta`} style={{ display: "block", textAlign: "center", textDecoration: "none", background: featured ? "var(--purple)" : "var(--surface3)", color: featured ? "#fff" : "var(--text)" }}>
        {plan === "free" ? "Start free →" : `Get ${name} →`}
      </Link>
    </div>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 14 }}>{title}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {links.map(([l, h]) => (
          <li key={l} style={{ marginBottom: 8 }}>
            <a href={h} style={{ color: "var(--text-sec)", fontSize: 13 }}>{l}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
