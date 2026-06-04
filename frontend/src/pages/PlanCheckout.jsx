import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatErr } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Check, Shield, Tag, ArrowRight, Loader2 } from "lucide-react";

const PLANS = {
  solo: { name: "Solo", tagline: "For beginners & casual creators just getting started." },
  creator: { name: "Creator", tagline: "For serious creators ready to scale." },
  studio: { name: "Studio", tagline: "For agencies, labels, and teams." },
};

export default function PlanCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plan = (PLANS[params.get("plan")] ? params.get("plan") : "creator");
  const billing = params.get("billing") === "yearly" ? "yearly" : "monthly";

  const [pricing, setPricing] = useState(null);
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState({ status: "idle", info: null, error: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    api.get("/pricing").then(({ data }) => setPricing(data.pricing)).catch(() => setPricing({
      solo: { monthly: 19, yearly: 180 },
      creator: { monthly: 49, yearly: 468 },
      studio: { monthly: 199, yearly: 1908 },
    }));
  }, [user, navigate]);

  const basePrice = useMemo(() => {
    if (!pricing) return 0;
    return billing === "yearly" ? pricing[plan].yearly : pricing[plan].monthly;
  }, [pricing, plan, billing]);

  const discounted = useMemo(() => {
    if (couponState.status !== "valid" || !couponState.info) return basePrice;
    const c = couponState.info;
    if (c.discount_type === "free") return 0;
    return Math.max(0, Math.round((basePrice * (1 - (c.discount_value || 0) / 100)) * 100) / 100);
  }, [basePrice, couponState]);

  const validate = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponState({ status: "idle", info: null, error: "" });
      return;
    }
    setCouponState({ status: "checking", info: null, error: "" });
    try {
      const { data } = await api.post("/coupons/validate", { code, plan, email: user?.email });
      if (!data.valid) {
        setCouponState({ status: "invalid", info: null, error: data.reason || "Coupon not valid." });
      } else {
        setCouponState({ status: "valid", info: data, error: "" });
      }
    } catch (e) {
      setCouponState({ status: "invalid", info: null, error: formatErr(e.response?.data?.detail) || "Couldn't check coupon." });
    }
  };

  const proceed = async () => {
    setErr("");
    setBusy(true);
    try {
      const packageId = `${plan}_${billing}`;
      const { data } = await api.post("/payments/checkout", {
        package_id: packageId,
        origin_url: window.location.origin,
        name: ((user.first_name || "") + " " + (user.last_name || "")).trim() || user.display_name,
        email: user.email,
        coupon_code: couponState.status === "valid" ? couponState.info.code : "",
      });
      if (data.free) {
        navigate(`/dashboard?welcome=free&plan=${plan}`);
        return;
      }
      if (data.mocked) {
        await api.post(`/payments/mock-complete/${data.session_id}`);
        navigate(`/dashboard?welcome=paid&plan=${plan}`);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setErr(formatErr(e.response?.data?.detail) || "Checkout failed. Please try again.");
      setBusy(false);
    }
  };

  if (!user || !pricing) {
    return (
      <div className="landing-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="spin" size={20} style={{ color: "var(--text-sec)" }} />
      </div>
    );
  }

  const planInfo = PLANS[plan];
  const couponHint = {
    idle: "",
    checking: "Checking…",
    valid: couponState.info?.discount_type === "free"
      ? `✓ ${couponState.info.code} — 100% off, full access`
      : `✓ ${couponState.info.code} — ${couponState.info?.discount_value}% off ${planInfo.name}`,
    invalid: couponState.error || "Coupon not valid.",
  }[couponState.status];

  return (
    <div className="landing-page" data-testid="plan-checkout-page">
      <nav className="landing-nav">
        <Link to="/" className="rl-logo">
          <div className="rl-logo-mark">✦</div>
          <span className="rl-logo-text">Reel<span>Lab</span></span>
        </Link>
        <Link to="/pricing" style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }} data-testid="plan-back">← Back to pricing</Link>
      </nav>

      <div style={{ paddingTop: 100, paddingBottom: 60, position: "relative" }}>
        <div className="orb orb-1"></div><div className="orb orb-2"></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 460px", gap: 40, maxWidth: 1040, margin: "0 auto", padding: "0 2rem", alignItems: "start", position: "relative", zIndex: 1 }}>

          {/* LEFT — plan summary */}
          <div className="fade-in">
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 12 }} data-testid="plan-eyebrow">Checkout · {planInfo.name} · {billing === "yearly" ? "Annual" : "Monthly"}</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 16, color: "var(--text)" }} data-testid="plan-headline">
              You're upgrading to<br /><em style={{ color: "var(--purple-light)" }}>{planInfo.name}.</em>
            </h1>
            <p style={{ fontSize: 15, color: "var(--text-sec)", fontWeight: 300, lineHeight: 1.75, marginBottom: 28, maxWidth: 420 }}>{planInfo.tagline}</p>

            <div className="card" style={{ padding: 24, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 14 }}>Order summary</div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 14, color: "var(--text)" }} data-testid="plan-line-name">{planInfo.name} · {billing === "yearly" ? "Annual" : "Monthly"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{billing === "yearly" ? "Billed yearly · save up to 21%" : "Billed monthly · cancel anytime"}</div>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: "var(--text)" }} data-testid="plan-base-price">${basePrice.toLocaleString()}</div>
              </div>

              {couponState.status === "valid" && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--border)" }} data-testid="plan-discount-row">
                  <div>
                    <div style={{ fontSize: 14, color: "var(--teal)" }}>Coupon · {couponState.info.code}</div>
                    {couponState.info.label && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{couponState.info.label}</div>}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: "var(--teal)" }}>
                    {couponState.info.discount_type === "free" ? "−$" + basePrice.toFixed(2) : `−${couponState.info.discount_value}%`}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Due today</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace", marginTop: 3 }}>
                    {discounted === 0 ? "Access granted immediately — no card required" : (billing === "yearly" ? "Then renews yearly. Cancel anytime." : "Then renews monthly. Cancel anytime.")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "var(--text)" }} data-testid="plan-due-today">${discounted.toFixed(2)}</div>
                  {discounted !== basePrice && <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace", textDecoration: "line-through" }}>${basePrice.toFixed(2)}</div>}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={13} /> Secure checkout — Stripe handles all card data. We never touch it.
            </div>
          </div>

          {/* RIGHT — coupon + pay */}
          <div className="card fade-in" style={{ padding: 28 }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4, color: "var(--text)" }}>Apply a coupon</div>
              <div style={{ fontSize: 12, color: "var(--text-sec)", lineHeight: 1.6 }}>Have a code from our team? Enter it below to unlock your discount or free access.</div>
            </div>

            <label className="label">Coupon code</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input
                className="input"
                placeholder="e.g. FOUNDER50"
                value={coupon}
                onChange={(e) => { setCoupon(e.target.value.toUpperCase()); if (couponState.status !== "idle") setCouponState({ status: "idle", info: null, error: "" }); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); validate(); } }}
                style={{ flex: 1, fontFamily: "'DM Mono', monospace", letterSpacing: ".05em" }}
                data-testid="coupon-input"
              />
              <button
                className="btn-secondary"
                onClick={validate}
                disabled={!coupon.trim() || couponState.status === "checking"}
                style={{ padding: "0 16px", fontSize: 12 }}
                data-testid="coupon-apply"
              >
                {couponState.status === "checking" ? <Loader2 className="spin" size={14} /> : <Tag size={13} style={{ display: "inline", marginRight: 4 }} />}
                {couponState.status === "checking" ? "" : "Apply"}
              </button>
            </div>
            {couponHint && (
              <div
                data-testid="coupon-hint"
                style={{
                  fontSize: 12,
                  color: couponState.status === "valid" ? "var(--teal)" : couponState.status === "invalid" ? "var(--coral)" : "var(--text-dim)",
                  marginBottom: 18,
                  lineHeight: 1.5,
                }}
              >
                {couponHint}
              </div>
            )}

            <div style={{ height: 1, background: "var(--border)", margin: "8px 0 18px" }} />

            <div style={{ marginBottom: 16, padding: 14, background: "var(--surface2)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 10 }}>Billing to</div>
              <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{((user.first_name || "") + " " + (user.last_name || "")).trim() || user.display_name}</div>
              <div style={{ fontSize: 12, color: "var(--text-sec)", fontFamily: "'DM Mono', monospace" }}>{user.email}</div>
            </div>

            {err && <p style={{ fontSize: 12, color: "var(--coral)", marginBottom: 12, textAlign: "center" }} data-testid="plan-error">{err}</p>}

            <button className="btn-primary" onClick={proceed} disabled={busy} style={{ width: "100%", padding: 14, fontSize: 14 }} data-testid="plan-pay">
              {busy ? "Processing…" : discounted === 0
                ? <><Check size={14} style={{ display: "inline", marginRight: 6 }} /> Activate free access</>
                : <>🔒 Continue to Stripe · ${discounted.toFixed(2)} <ArrowRight size={14} style={{ display: "inline", marginLeft: 6 }} /></>}
            </button>
            <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "center", marginTop: 10, fontFamily: "'DM Mono', monospace", letterSpacing: ".04em" }}>
              256-bit SSL · Powered by Stripe
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
