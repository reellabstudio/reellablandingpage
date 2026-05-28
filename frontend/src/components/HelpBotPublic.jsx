import { useState } from "react";
import { X } from "lucide-react";

const FAQ = {
  "ai editing": ["How does AI editing work?", "ReelLab's AI analyzes your raw footage for emotional spikes, hook moments, beat drops, punchlines, and audience retention signals. It surfaces ranked clip categories: Viral, Emotional, Inspirational, Best Hooks — then you stay in control of every final cut."],
  "style dna": ["What is Style DNA?", "Style DNA is ReelLab's learning engine. Over time it learns your pacing, transitions, caption style, color grading, and music preferences. You can also type a creative direction like \"Edit this like an A24 trailer\" and the AI adapts."],
  "founder": ["What is the Founder Circle?", "The Founder Circle is for early believers. You get early access, founding-member pricing locked for life, direct input on the roadmap, and white-glove onboarding when we launch. Spots are limited."],
  "plan": ["What plans are available?", "ReelLab launches with 3 plans: Solo ($19/mo) for casual creators, Creator ($49/mo) for serious creators with unlimited AI clips and AI Director Mode, and Studio ($199/mo) for agencies and teams. All plans have a yearly discount."],
  "pricing": ["What does ReelLab cost?", "Solo: $19/month ($180/year). Creator: $49/month ($468/year). Studio: $199/month ($1,908/year). All prices include a 21%+ discount when billed yearly. Add-ons available for AI credits, voiceovers, and music."],
  "launch": ["When does ReelLab launch?", "We're in active development. Join the waitlist or Founder Circle to be first in the door — Founders get personal outreach before public launch."],
  "platform": ["What platforms does ReelLab export to?", "TikTok, Instagram Reels, YouTube Shorts, X/Twitter, LinkedIn, Podcast Shorts, Spotify Clips, and Fashion/Brand Ads — all optimized automatically."],
  "director": ["What is AI Director Mode?", "AI Director Mode lets you type a creative direction — \"Make this feel like an A24 trailer\" — and the AI adjusts pacing, sound, transitions, grading, captions, and framing to match."],
};

const SUGS = ["How does AI editing work?", "Founder Circle?", "Pricing plans?", "When does it launch?"];

export default function HelpBotPublic() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hey! 👋 I'm the ReelLab assistant. Ask me anything about the platform, pricing, or how it works." },
  ]);
  const [showSugs, setShowSugs] = useState(true);
  const [q, setQ] = useState("");

  const find = (query) => {
    const lower = query.toLowerCase();
    for (const [k, v] of Object.entries(FAQ)) {
      if (lower.includes(k.split(" ")[0]) || lower.includes(k)) return v[1];
    }
    return null;
  };

  const ask = (query) => {
    setShowSugs(false);
    setMessages((m) => [...m, { role: "user", text: query }]);
    setTimeout(() => {
      const ans = find(query);
      if (ans) setMessages((m) => [...m, { role: "bot", text: ans }]);
      else setMessages((m) => [...m, { role: "bot", text: `I couldn't find a specific answer. Try rephrasing or email support@reellabstudio.com — we'll get back to you.`, support: query }]);
    }, 400);
  };

  const send = () => {
    if (!q.trim()) return;
    const query = q;
    setQ("");
    ask(query);
  };

  return (
    <>
      <button className="help-bubble" onClick={() => setOpen(!open)} data-testid="public-help-bubble">
        {open ? <X color="#fff" size={24} /> : (
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="21" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="11" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="3" fill="rgba(255,255,255,.5)" />
            <circle cx="6.5" cy="24" r="2.5" fill="rgba(255,255,255,.35)" />
            <circle cx="41.5" cy="24" r="2.5" fill="rgba(255,255,255,.35)" />
            <circle cx="24" cy="6.5" r="2.5" fill="rgba(255,255,255,.35)" />
            <circle cx="24" cy="41.5" r="2.5" fill="rgba(255,255,255,.35)" />
            <text x="24" y="30" textAnchor="middle" fill="white" fontSize="17" fontWeight="700">?</text>
          </svg>
        )}
      </button>
      {open && (
        <div className="help-panel" data-testid="public-help-panel">
          <div className="help-panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, var(--purple), var(--purple-mid))", display: "flex", alignItems: "center", justifyContent: "center" }}>✦</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>ReelLab Support</div>
                <div style={{ fontSize: 11, color: "var(--teal)", display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)" }} />Online · Replies instantly
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="topnav icon-btn" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          <div className="help-panel-body">
            {messages.map((m, i) => (
              <div key={i} className={`help-msg ${m.role}`}>
                {m.text}
                {m.support && (
                  <div style={{ marginTop: 8 }}>
                    <a href={`mailto:support@reellabstudio.com?subject=ReelLab Support — ${encodeURIComponent(m.support)}`} style={{ color: "var(--purple-light)", textDecoration: "underline" }} data-testid="public-help-email">Email support →</a>
                  </div>
                )}
              </div>
            ))}
          </div>
          {showSugs && (
            <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGS.map((s) => (
                <span key={s} onClick={() => ask(s)} style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 99, padding: "5px 12px", fontSize: 11, color: "var(--text-sec)", cursor: "pointer" }} data-testid={`public-help-sug-${s.slice(0, 12)}`}>{s}</span>
              ))}
            </div>
          )}
          <div className="help-panel-input">
            <input className="input" placeholder="Ask anything…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} data-testid="public-help-input" />
            <button onClick={send} className="btn-primary" style={{ padding: "8px 14px" }} data-testid="public-help-send">↑</button>
          </div>
        </div>
      )}
    </>
  );
}
