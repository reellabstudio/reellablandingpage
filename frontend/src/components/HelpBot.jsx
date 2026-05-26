import { useState } from "react";
import { X, HelpCircle, Send } from "lucide-react";
import api from "../lib/api";

export default function HelpBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm the ReelLab help bot. Ask me about projects, AI editing, invoices, stars — anything." },
  ]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!q.trim()) return;
    const userMsg = { role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setQ("");
    setLoading(true);
    try {
      const { data } = await api.post("/help/query", { query: q });
      if (data.match) {
        setMessages((m) => [...m, { role: "bot", text: data.answer, helpful: true }]);
      } else {
        setMessages((m) => [...m, {
          role: "bot",
          text: `${data.suggestion}`,
          showSupport: true,
        }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I couldn't process that. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button className="help-bubble" onClick={() => setOpen(!open)} title="Help" data-testid="help-bubble">
        {open ? <X color="#fff" size={24} /> : (
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="12" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="3" fill="rgba(255,255,255,0.6)" />
            <circle cx="7" cy="24" r="3" fill="rgba(255,255,255,0.4)" />
            <circle cx="41" cy="24" r="3" fill="rgba(255,255,255,0.4)" />
            <circle cx="24" cy="7" r="3" fill="rgba(255,255,255,0.4)" />
            <circle cx="24" cy="41" r="3" fill="rgba(255,255,255,0.4)" />
            <text x="24" y="30" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">?</text>
          </svg>
        )}
      </button>
      {open && (
        <div className="help-panel fade-in" data-testid="help-panel">
          <div className="help-panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HelpCircle size={18} color="var(--purple)" />
              <strong style={{ fontSize: 14 }}>ReelLab Help</strong>
            </div>
            <button onClick={() => setOpen(false)} className="icon-btn" data-testid="help-close"><X size={16} /></button>
          </div>
          <div className="help-panel-body">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={`help-msg ${m.role}`}>{m.text}</div>
                {m.showSupport && (
                  <a
                    href={`mailto:support@reellabstudio.com?subject=Help%20request&body=My%20question%3A%20${encodeURIComponent(q || messages[messages.length - 2]?.text || "")}`}
                    style={{ fontSize: 12, color: "var(--purple)", display: "inline-block", marginBottom: 10 }}
                    data-testid="help-email-support"
                  >
                    Email support@reellabstudio.com →
                  </a>
                )}
              </div>
            ))}
            {loading && <div className="help-msg bot">…</div>}
          </div>
          <div className="help-panel-input">
            <input
              className="input"
              placeholder="Ask a question…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              data-testid="help-input"
            />
            <button className="btn-primary" onClick={send} style={{ padding: "8px 14px" }} data-testid="help-send"><Send size={14} /></button>
          </div>
        </div>
      )}
    </>
  );
}
