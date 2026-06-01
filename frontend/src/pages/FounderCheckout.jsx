import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatErr } from "../lib/api";

// ─── A/B test variants for the hero headline.
// Edit copy here; the system handles assignment + tracking automatically.
const AB_VARIANTS = {
  a: {
    label: "Variant A (control)",
    line1: "One dollar.",
    line2: "Founder status.",
    line3: "First month free.",
    sub: "This isn't a subscription trap. It's a handshake. Pay $1 to lock in your Founder membership and get your first full month of Creator — a $49 value — completely on us.",
    cta: "🔒 Pay $1.00 · Claim Founder Status",
  },
  b: {
    label: "Variant B",
    line1: "One dollar today.",
    line2: "Yours for life.",
    line3: "First month free.",
    sub: "Lock in Founder pricing forever for the price of a coffee. We mean it — $1 today, your first month of Creator is on us, and the rate you pay never moves.",
    cta: "🔒 Claim Founder · $1 Today",
  },
};

function pickVariant() {
  try {
    const raw = localStorage.getItem("rl_ab_founder");
    if (raw) {
      const v = JSON.parse(raw);
      if (v && (v.variant === "a" || v.variant === "b")) return v.variant;
    }
  } catch { /* noop */ }
  const v = Math.random() < 0.5 ? "a" : "b";
  try {
    localStorage.setItem("rl_ab_founder", JSON.stringify({ variant: v, ts: Date.now() }));
  } catch { /* noop */ }
  return v;
}

export default function FounderCheckout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const refCode = params.get("ref") || "";
  const forceVariant = params.get("v"); // CEO QA: ?v=a or ?v=b
  const [variant, setVariant] = useState("a");
  const [referrer, setReferrer] = useState(null);
  const [paymentLive, setPaymentLive] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", creator_type: "", handle: "" });
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const impressionFired = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");

    // Variant assignment
    const v = (forceVariant === "a" || forceVariant === "b") ? forceVariant : pickVariant();
    setVariant(v);

    // Record impression once per page load (StrictMode-safe via useRef)
    if (!impressionFired.current) {
      impressionFired.current = true;
      api.post("/public/ab/impression", {
        page: "founder-checkout",
        variant: v,
        referral_code: refCode,
      }).catch(() => { /* non-blocking */ });
    }

    // Payment mode (live → hide card form, Stripe Checkout handles it)
    api.get("/public/payment-mode").then((r) => setPaymentLive(!!r.data?.stripe_live)).catch(() => {});

    if (refCode) {
      api.get(`/affiliate/lookup/${refCode}`).then((r) => {
        if (r.data.valid) setReferrer(r.data.referrer_name);
      }).catch(() => {});
    }
  }, [refCode, forceVariant]);

  const fmtCard = (v) => v.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").slice(0, 19);
  const fmtExp = (v) => { const x = v.replace(/\D/g, ""); return x.length >= 2 ? x.slice(0, 2) + " / " + x.slice(2, 4) : x; };

  const submit = async () => {
    setErr("");
    if (!form.name.trim()) return setErr("Please enter your first name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr("Please enter a valid email address.");
    // In mock mode we collect card client-side (decorative); in live mode Stripe collects it.
    if (!paymentLive) {
      if (card.number.replace(/\s/g, "").length < 15) return setErr("Please enter a valid card number.");
      if (card.exp.replace(/\s/g, "").length < 3) return setErr("Please enter your card expiry.");
      if (card.cvc.length < 3) return setErr("Please enter your CVC.");
    }

    setBusy(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        package_id: "founder_circle",
        origin_url: window.location.origin,
        name: form.name,
        email: form.email,
        creator_type: form.creator_type,
        handle: form.handle,
        referral_code: refCode,
        ab_variant: variant,
      });
      // Mocked path returns our /checkout/mock — simulate paid then show success
      if (data.mocked) {
        await api.post(`/payments/mock-complete/${data.session_id}`);
        const next = new Date(); next.setDate(next.getDate() + 30);
        setSuccess({
          name: form.name,
          confirm_code: `RL-FC-${data.session_id.slice(-6).toUpperCase()}`,
          next_billing: next.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        });
      } else {
        // Live: redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (e) {
      setErr(formatErr(e.response?.data?.detail) || "Payment failed. Please try again.");
    }
    setBusy(false);
  };

  if (success) {
    return (
      <div className="landing-page" data-testid="founder-checkout-success">
        <nav className="landing-nav">
          <Link to="/" className="rl-logo"><div className="rl-logo-mark">✦</div><span className="rl-logo-text">Reel<span>Lab</span></span></Link>
        </nav>
        <div className="page" style={{ paddingTop: 100, paddingBottom: 80, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card fade-in" style={{ maxWidth: 460, width: "100%", textAlign: "center", padding: 40 }}>
            <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, var(--purple), var(--purple-mid))", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff", margin: "0 auto 22px" }}>✦</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, lineHeight: 1.2, marginBottom: 14 }}>Welcome,<br /><em style={{ color: "var(--purple-light)" }}>Founder.</em></h2>
            <p style={{ fontSize: 14, color: "var(--text-sec)", fontWeight: 300, lineHeight: 1.7, marginBottom: 28 }}>Your membership is confirmed. Your first month of Creator is live. We'll be reaching out personally — this is just the beginning.</p>
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, textAlign: "left", marginBottom: 22 }}>
              {[
                ["Status", "Founder Member ✦"],
                ["Plan", "Creator (Month 1 free)"],
                ["Charged today", "$1.00"],
                ["Next billing", `${success.next_billing} · $49.00`],
                ["Confirmation", success.confirm_code],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-dim)" }}>{k}</span>
                  <span style={{ color: "var(--text)", fontFamily: "'DM Mono', monospace" }}>{v}</span>
                </div>
              ))}
            </div>
            <Link to="/login" className="btn-primary" style={{ display: "inline-block", padding: "12px 28px", marginRight: 8 }} data-testid="founder-success-login">Sign in to your studio</Link>
            <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 18 }}>Check your inbox for a welcome email. Questions? <a href="mailto:support@reellabstudio.com" style={{ color: "var(--purple-light)" }}>support@reellabstudio.com</a></p>
          </div>
        </div>
      </div>
    );
  }

  const v = AB_VARIANTS[variant] || AB_VARIANTS.a;

  return (
    <div className="landing-page" data-testid="founder-checkout-page" data-ab-variant={variant}>
      <nav className="landing-nav">
        <Link to="/" className="rl-logo"><div className="rl-logo-mark">✦</div><span className="rl-logo-text">Reel<span>Lab</span></span></Link>
        <Link to="/" style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }} data-testid="checkout-back">← Back to ReelLab</Link>
      </nav>

      <div style={{ paddingTop: 100, paddingBottom: 60, position: "relative" }}>
        <div className="orb orb-1"></div><div className="orb orb-2"></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 40, maxWidth: 1000, margin: "0 auto", padding: "0 2rem", alignItems: "start", position: "relative", zIndex: 1 }}>

          {/* LEFT: Offer */}
          <div className="fade-in">
            <div className="founder-badge"><div className="founder-badge-dot" />Founder Circle · Limited Spots</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 16 }} data-testid="founder-headline">
              <span data-testid="founder-headline-line1">{v.line1}</span><br />
              <em style={{ fontStyle: "italic", color: "var(--purple-light)" }} data-testid="founder-headline-line2">{v.line2}</em><br />
              <span data-testid="founder-headline-line3">{v.line3}</span>
            </h1>
            <p style={{ fontSize: 15, color: "var(--text-sec)", fontWeight: 300, lineHeight: 1.75, marginBottom: 32, maxWidth: 420 }} data-testid="founder-subhead">
              {v.sub}
            </p>

            {referrer && (
              <div style={{ background: "var(--teal-light)", border: "1px solid rgba(15,155,122,.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 22, fontSize: 13, color: "var(--teal)" }} data-testid="referrer-banner">
                ✦ Referred by <strong>{referrer}</strong>
              </div>
            )}

            <div className="card" style={{ marginBottom: 24, padding: 24 }}>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 16 }}>What you're paying for</div>
              {[
                { label: "Founder Circle Membership", sub: "Lifetime status · locked forever", amt: "$1.00", cls: "" },
                { label: "Creator Plan · Month 1", sub: "Full access · AI Director · unlimited exports", amt: "$49.00", cls: "strike" },
                { label: "Founder discount applied", sub: "", amt: "−$49.00", cls: "discount" },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div><div style={{ fontSize: 14, color: "var(--text-sec)" }}>{r.label}</div>{r.sub && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{r.sub}</div>}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: r.cls === "discount" ? "var(--teal)" : "var(--text)", textDecoration: r.cls === "strike" ? "line-through" : "none" }}>{r.amt}</div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, alignItems: "flex-start" }}>
                <div><div style={{ fontSize: 15, fontWeight: 500 }}>Due today</div><div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace", marginTop: 3 }}>Then $49/mo · Cancel anytime</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem" }}>$1</div><div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}>First month free</div></div>
              </div>
            </div>

            <div style={{ background: "linear-gradient(135deg, var(--surface) 0%, rgba(123,79,212,.05) 100%)", border: "1px solid var(--purple-border)", borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--purple-light)", marginBottom: 16 }}>✦ What Founders get forever</div>
              {[
                ["Founding Member status", "Your profile shows the Founder badge. It never expires."],
                ["Founding-era pricing, locked in", "Prices will rise as the platform grows. Yours won't."],
                ["First month of Creator, free", "Full AI editing, Style DNA, AI Director Mode, multi-platform exports, 4K."],
                ["Direct line to the roadmap", "Personal outreach when we build new features. Your feedback shapes the product."],
                ["White-glove onboarding", "A real human walks you through setup. You're not on your own from day one."],
              ].map(([t, d]) => (
                <div key={t} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: "var(--purple-glow)", border: "1px solid var(--purple-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--purple-light)", flexShrink: 0, marginTop: 1 }}>✦</div>
                  <div style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.55, fontWeight: 300 }}><strong style={{ color: "var(--text)", display: "block", marginBottom: 1, fontWeight: 500 }}>{t}</strong>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Checkout */}
          <div className="card fade-in" style={{ padding: 28 }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Complete your Founder membership</div>
              <div style={{ fontSize: 12, color: "var(--text-sec)", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)" }} />Secure checkout · Powered by Stripe
              </div>
            </div>

            <div style={{ marginBottom: 10 }}><label className="label">First name</label><input className="input" placeholder="Your first name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="checkout-name" /></div>
            <div style={{ marginBottom: 10 }}><label className="label">Email address</label><input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="checkout-email" /></div>
            <div style={{ marginBottom: 10 }}>
              <label className="label">Creator type</label>
              <select className="input" value={form.creator_type} onChange={(e) => setForm({ ...form, creator_type: e.target.value })} data-testid="checkout-type">
                <option value="">What best describes you?</option>
                <option>Podcaster</option><option>YouTuber</option><option>TikTok / Reels Creator</option>
                <option>Musician / Artist</option><option>Brand / Business</option><option>Agency / Studio</option><option>Freelance Editor</option><option>Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}><label className="label">@ Handle (optional)</label><input className="input" placeholder="@yourusername · used for your future affiliate link" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} data-testid="checkout-handle" /></div>

            {!paymentLive && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} /><div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--text-dim)", letterSpacing: ".08em", textTransform: "uppercase" }}>Payment · Stripe encrypted</div><div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
                <div style={{ marginBottom: 10 }}><label className="label">Card number</label><input className="input" placeholder="1234 1234 1234 1234" maxLength={19} value={card.number} onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })} data-testid="checkout-card" autoComplete="cc-number" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <div><label className="label">Expiry</label><input className="input" placeholder="MM / YY" maxLength={7} value={card.exp} onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })} data-testid="checkout-exp" autoComplete="cc-exp" /></div>
                  <div><label className="label">CVC</label><input className="input" type="password" placeholder="•••" maxLength={4} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} data-testid="checkout-cvc" autoComplete="cc-csc" /></div>
                </div>
              </>
            )}

            {paymentLive && (
              <div style={{ margin: "18px 0 18px", padding: 14, background: "var(--teal-light, rgba(15,155,122,.08))", border: "1px solid rgba(15,155,122,.3)", borderRadius: 10, fontSize: 12, color: "var(--text-sec)", lineHeight: 1.6 }} data-testid="checkout-stripe-redirect">
                <strong style={{ color: "var(--teal)" }}>Continue on Stripe →</strong><br />
                You'll be redirected to Stripe's secure checkout page to enter your card details. We never touch your card data directly.
              </div>
            )}

            {err && <p style={{ fontSize: 12, color: "#E07070", marginBottom: 12, textAlign: "center" }} data-testid="checkout-error">{err}</p>}

            <button className="btn-primary" style={{ width: "100%", padding: 14, fontSize: 14, marginBottom: 10 }} onClick={submit} disabled={busy} data-testid="checkout-pay">
              {busy ? "Processing…" : (paymentLive ? "🔒 Continue to Stripe · $1.00" : v.cta)}
            </button>
            <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "center", fontFamily: "'DM Mono', monospace", letterSpacing: ".04em" }}>
              256-bit SSL encryption · Powered by Stripe
            </div>

            {!paymentLive && (
              <div style={{ marginTop: 16, padding: 12, background: "var(--amber-light)", border: "1px solid rgba(196,137,26,.3)", borderRadius: 8, fontSize: 11, color: "var(--amber)" }} data-testid="checkout-mocked-banner">
                ⓘ Stripe charges are <strong>MOCKED</strong> in this preview. No real money will move.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
