import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import ConnectorsModal from "../components/ConnectorsModal";
import { Calendar as CalIcon, Plus, Trash2, Sparkles, Instagram, Music2, Youtube, Twitter, Facebook, X as XIcon, Image as ImageIcon, Plug } from "lucide-react";

const PLATFORMS = [
  { key: "instagram", label: "Instagram", Icon: Instagram, color: "#E1306C" },
  { key: "tiktok", label: "TikTok", Icon: Music2, color: "#FE2C55" },
  { key: "youtube", label: "YouTube", Icon: Youtube, color: "#FF0000" },
  { key: "x", label: "X", Icon: Twitter, color: "#1D9BF0" },
  { key: "facebook", label: "Facebook", Icon: Facebook, color: "#1877F2" },
];
const platformOf = (k) => PLATFORMS.find((p) => p.key === k) || PLATFORMS[0];

const fmtMonth = (d) => d.toLocaleString("en-US", { month: "long", year: "numeric" });
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfWeek = (d) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0,0,0,0); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export default function ContentStudio() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState("month"); // 'month' | 'week'
  const [cursor, setCursor] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [modal, setModal] = useState(null); // post being created/edited
  const [genOpen, setGenOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get("/content/posts");
    setPosts(data.posts || []);
  };
  useEffect(() => { load(); }, []);

  // Deep-link from AI Editor: ?clip_url=...&platform=...&title=...
  useEffect(() => {
    const clipUrl = searchParams.get("clip_url");
    const platform = searchParams.get("platform");
    const title = searchParams.get("title");
    if (!clipUrl && !platform && !title) return;
    const validPlatform = ["instagram", "tiktok", "youtube", "x", "facebook"].includes(platform) ? platform : "instagram";
    const dt = new Date();
    dt.setHours(12, 0, 0, 0);
    dt.setDate(dt.getDate() + 1);
    setModal({
      title: title || "Reel from AI Editor",
      caption: "",
      platform: validPlatform,
      scheduled_for: dt.toISOString(),
      media_url: clipUrl || "",
      status: "scheduled",
      notes: "",
    });
    // Clear params so refresh doesn't re-open the modal
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const grouped = useMemo(() => {
    const map = {};
    for (const p of posts) {
      const k = (p.scheduled_for || "").slice(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(p);
    }
    return map;
  }, [posts]);

  const days = useMemo(() => {
    if (view === "month") {
      const first = startOfMonth(cursor);
      const last = endOfMonth(cursor);
      const start = startOfWeek(first);
      const end = new Date(last); end.setDate(end.getDate() + (6 - last.getDay()));
      const out = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d));
      return out;
    }
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(start); x.setDate(x.getDate() + i); return x; });
  }, [view, cursor]);

  const shift = (dir) => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + 7 * dir);
    setCursor(d);
  };

  const openNew = (dateStr) => {
    const dt = new Date(dateStr || Date.now());
    dt.setHours(12, 0, 0, 0);
    setModal({ title: "", caption: "", platform: "instagram", scheduled_for: dt.toISOString(), media_url: "", status: "scheduled", notes: "" });
  };

  const savePost = async () => {
    if (!modal.title.trim()) return;
    setBusy(true);
    try {
      if (modal.id) {
        await api.patch(`/content/posts/${modal.id}`, modal);
      } else {
        await api.post("/content/posts", modal);
      }
      setModal(null);
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to save");
    }
    setBusy(false);
  };

  const removePost = async (id) => {
    if (!window.confirm("Delete this scheduled post?")) return;
    await api.delete(`/content/posts/${id}`);
    await load();
  };

  return (
    <div className="page-shell" data-testid="content-studio-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 className="page-title">Content Studio</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => setConnectorsOpen(true)} data-testid="open-connectors" style={{ padding: "8px 14px" }}>
            <Plug size={14} style={{ display: "inline", marginRight: 6 }} /> Connectors
          </button>
          <button className="btn-secondary" onClick={() => setGenOpen(true)} data-testid="open-caption-gen" style={{ padding: "8px 14px" }}>
            <Sparkles size={14} style={{ display: "inline", marginRight: 6 }} /> Caption AI
          </button>
          <button className="btn-primary" onClick={() => openNew()} data-testid="new-post-btn" style={{ padding: "8px 14px" }}>
            <Plus size={14} style={{ display: "inline", marginRight: 6 }} /> Schedule post
          </button>
        </div>
      </div>
      <p className="page-sub">Plan your content across every platform, generate scroll-stopping captions, and ship on time.</p>

      <div className="card" style={{ padding: 0, marginTop: 18, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "0.5px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn-ghost" onClick={() => shift(-1)} data-testid="cal-prev" style={{ padding: "6px 10px" }}>‹</button>
            <strong style={{ fontSize: 15, minWidth: 160, textAlign: "center", color: "var(--text)" }} data-testid="cal-label">
              {view === "month" ? fmtMonth(cursor) : `Week of ${startOfWeek(cursor).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </strong>
            <button className="btn-ghost" onClick={() => shift(1)} data-testid="cal-next" style={{ padding: "6px 10px" }}>›</button>
            <button className="btn-ghost" onClick={() => setCursor(new Date())} data-testid="cal-today" style={{ padding: "6px 10px", fontSize: 12 }}>Today</button>
          </div>
          <div style={{ display: "flex", gap: 6, background: "var(--surface2)", padding: 4, borderRadius: 8 }}>
            {["month", "week"].map((v) => (
              <button key={v} onClick={() => setView(v)} data-testid={`cal-view-${v}`}
                style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer",
                  background: view === v ? "var(--purple)" : "transparent",
                  color: view === v ? "#fff" : "var(--text-sec)",
                }}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "0.5px solid var(--border)" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} style={{ padding: "8px 6px", fontSize: 10, fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-dim)", textAlign: "center" }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: view === "week" ? "180px" : "120px" }}>
          {days.map((d) => {
            const key = ymd(d);
            const inMonth = view === "week" || d.getMonth() === cursor.getMonth();
            const isToday = ymd(new Date()) === key;
            const dayPosts = grouped[key] || [];
            return (
              <div key={key}
                style={{
                  border: "0.5px solid var(--border)", padding: 6, position: "relative", cursor: "pointer",
                  background: isToday ? "var(--purple-glow)" : "transparent",
                  opacity: inMonth ? 1 : 0.45,
                }}
                onClick={() => openNew(key + "T12:00:00")}
                data-testid={`cal-day-${key}`}
              >
                <div style={{ fontSize: 11, fontFamily: "DM Mono, monospace", color: isToday ? "var(--purple-light)" : "var(--text-sec)", fontWeight: 600 }}>{d.getDate()}</div>
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                  {dayPosts.slice(0, view === "week" ? 5 : 3).map((p) => {
                    const pf = platformOf(p.platform);
                    return (
                      <div key={p.id} onClick={(e) => { e.stopPropagation(); setModal({ ...p }); }}
                        data-testid={`cal-post-${p.id}`}
                        style={{
                          fontSize: 11, padding: "3px 6px", borderRadius: 4, background: "var(--surface2)",
                          borderLeft: `3px solid ${pf.color}`, color: "var(--text)",
                          display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                        <pf.Icon size={11} style={{ color: pf.color, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</span>
                      </div>
                    );
                  })}
                  {dayPosts.length > (view === "week" ? 5 : 3) && (
                    <div style={{ fontSize: 10, color: "var(--text-dim)" }}>+{dayPosts.length - (view === "week" ? 5 : 3)} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <PostModal
          post={modal}
          onChange={setModal}
          onClose={() => setModal(null)}
          onSave={savePost}
          onDelete={() => { if (modal.id) removePost(modal.id); setModal(null); }}
          busy={busy}
        />
      )}

      {genOpen && (
        <CaptionGenerator
          onClose={() => setGenOpen(false)}
          onUse={(caption, platform) => {
            setGenOpen(false);
            const dt = new Date(); dt.setHours(12, 0, 0, 0);
            setModal({ title: caption.slice(0, 60), caption, platform, scheduled_for: dt.toISOString(), media_url: "", status: "scheduled", notes: "" });
          }}
        />
      )}

      {connectorsOpen && (
        <ConnectorsModal
          onClose={() => setConnectorsOpen(false)}
          plan={user?.plan || "free"}
          role={user?.role || "client"}
        />
      )}
    </div>
  );
}

// ─── Schedule / edit a post ──────────────────────────────────────────────
function PostModal({ post, onChange, onClose, onSave, onDelete, busy }) {
  const [genBusy, setGenBusy] = useState(false);
  const [options, setOptions] = useState([]);
  const [err, setErr] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgAspect, setImgAspect] = useState("1:1");
  const [imgOpen, setImgOpen] = useState(false);
  const [imgErr, setImgErr] = useState("");

  const set = (k, v) => onChange({ ...post, [k]: v });

  const generate = async () => {
    setErr("");
    if (!post.title.trim() && !post.caption.trim()) return setErr("Add a title or topic first.");
    setGenBusy(true);
    try {
      const { data } = await api.post("/content/caption/generate", {
        platform: post.platform,
        topic: post.caption || post.title,
        tone: "engaging",
      });
      setOptions(data.captions || []);
    } catch (e) {
      const d = e.response?.data?.detail;
      setErr(typeof d === "string" ? d : (d?.message || "Couldn't generate captions"));
    }
    setGenBusy(false);
  };

  const generateImage = async () => {
    setImgErr("");
    const prompt = (imgPrompt || post.caption || post.title || "").trim();
    if (prompt.length < 4) return setImgErr("Add a prompt (at least 4 characters).");
    setImgBusy(true);
    try {
      const { data } = await api.post("/ai/image/generate", { prompt, aspect: imgAspect });
      const url = data.image_url || data.image_data_url;
      if (url) set("media_url", url);
      else setImgErr("No image returned — try again.");
    } catch (e) {
      const d = e.response?.data?.detail;
      setImgErr(typeof d === "string" ? d : (d?.message || "Couldn't generate image."));
    }
    setImgBusy(false);
  };

  const dt = new Date(post.scheduled_for);
  const dateValue = isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
  const timeValue = isNaN(dt) ? "12:00" : dt.toTimeString().slice(0, 5);

  const updateDateTime = (date, time) => {
    const [Y, M, D] = (date || dateValue).split("-").map(Number);
    const [h, m] = (time || timeValue).split(":").map(Number);
    const d = new Date(Y, M - 1, D, h, m);
    set("scheduled_for", d.toISOString());
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="post-modal">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>{post.id ? "Edit post" : "Schedule a post"}</div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6 }} data-testid="post-modal-close"><XIcon size={16} /></button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {PLATFORMS.map((p) => (
            <button key={p.key} onClick={() => set("platform", p.key)} data-testid={`platform-${p.key}`}
              style={{
                padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
                border: `1px solid ${post.platform === p.key ? p.color : "var(--border)"}`,
                background: post.platform === p.key ? `${p.color}20` : "transparent",
                color: post.platform === p.key ? p.color : "var(--text-sec)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
              <p.Icon size={13} /> {p.label}
            </button>
          ))}
        </div>

        <label className="label">Title</label>
        <input className="input" value={post.title} onChange={(e) => set("title", e.target.value)} placeholder="Internal title (not posted)" data-testid="post-title" style={{ marginBottom: 12 }} />

        <label className="label">Caption</label>
        <textarea className="input" rows={5} value={post.caption} onChange={(e) => set("caption", e.target.value)} placeholder="Write your caption — or hit Generate to let AI draft 3 options." data-testid="post-caption" style={{ marginBottom: 8, resize: "vertical" }} />

        <button className="btn-secondary" onClick={generate} disabled={genBusy} data-testid="post-generate" style={{ padding: "6px 14px", fontSize: 12, marginBottom: 12 }}>
          <Sparkles size={12} style={{ display: "inline", marginRight: 4 }} /> {genBusy ? "Generating…" : "Generate 3 captions"}
        </button>
        {err && <div style={{ fontSize: 12, color: "var(--coral)", marginBottom: 10 }} data-testid="post-gen-error">{err}</div>}

        {options.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }} data-testid="caption-options">
            {options.map((opt, i) => (
              <div key={i} style={{ padding: 12, background: "var(--surface2)", borderRadius: 8, border: "0.5px solid var(--border)", fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
                <div style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>{opt}</div>
                <button className="btn-ghost" onClick={() => { set("caption", opt); setOptions([]); }} data-testid={`use-caption-${i}`}
                  style={{ padding: "4px 10px", fontSize: 11, marginTop: 6 }}>Use this</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={dateValue} onChange={(e) => updateDateTime(e.target.value, null)} data-testid="post-date" />
          </div>
          <div>
            <label className="label">Time</label>
            <input className="input" type="time" value={timeValue} onChange={(e) => updateDateTime(null, e.target.value)} data-testid="post-time" />
          </div>
        </div>

        <label className="label">Media URL (clip / image)</label>
        <input className="input" value={post.media_url || ""} onChange={(e) => set("media_url", e.target.value)} placeholder="https://… (optional)" data-testid="post-media" style={{ marginBottom: 8 }} />

        <button
          type="button"
          className="btn-secondary"
          onClick={() => { setImgOpen(!imgOpen); if (!imgOpen) setImgPrompt(post.caption || post.title || ""); }}
          data-testid="open-image-gen"
          style={{ padding: "6px 14px", fontSize: 12, marginBottom: imgOpen ? 10 : 16 }}
        >
          <ImageIcon size={12} style={{ display: "inline", marginRight: 4 }} /> {imgOpen ? "Hide cover art generator" : "Generate cover art (AI)"}
        </button>

        {imgOpen && (
          <div data-testid="image-gen-block" style={{ padding: 12, background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 8, marginBottom: 16 }}>
            <label className="label">Prompt</label>
            <textarea
              className="input"
              rows={2}
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              data-testid="image-gen-prompt"
              placeholder="e.g. 'cinematic neon-lit studio, creator at editing desk, dramatic purple lighting'"
              style={{ marginBottom: 10, resize: "vertical" }}
            />
            <label className="label">Aspect</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {["9:16", "1:1", "16:9", "4:5"].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setImgAspect(a)}
                  data-testid={`image-aspect-${a}`}
                  style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${imgAspect === a ? "var(--purple-light)" : "var(--border)"}`,
                    background: imgAspect === a ? "var(--purple-glow)" : "transparent",
                    color: imgAspect === a ? "var(--purple-light)" : "var(--text-sec)",
                  }}
                >{a}</button>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={generateImage}
              disabled={imgBusy}
              data-testid="image-gen-submit"
              style={{ width: "100%", padding: 10, fontSize: 12 }}
            >
              {imgBusy ? "Generating…" : <><ImageIcon size={12} style={{ display: "inline", marginRight: 6 }} /> Generate with Nano Banana</>}
            </button>
            {imgErr && <div style={{ fontSize: 12, color: "var(--coral)", marginTop: 8 }} data-testid="image-gen-error">{imgErr}</div>}
            {post.media_url && (
              <img
                src={post.media_url}
                alt="Generated cover"
                data-testid="image-gen-preview"
                style={{ marginTop: 10, width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 8, border: "0.5px solid var(--border)" }}
              />
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" onClick={onSave} disabled={busy} data-testid="post-save" style={{ flex: 1 }}>
            {busy ? "Saving…" : (post.id ? "Save changes" : "Schedule post")}
          </button>
          {post.id && (
            <button className="btn-ghost" onClick={onDelete} data-testid="post-delete" style={{ color: "var(--coral)" }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Standalone caption generator ────────────────────────────────────────
function CaptionGenerator({ onClose, onUse }) {
  const [platform, setPlatform] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState([]);
  const [err, setErr] = useState("");

  const generate = async () => {
    setErr("");
    if (topic.trim().length < 3) return setErr("Describe the content first (at least 3 chars).");
    setBusy(true);
    try {
      const { data } = await api.post("/content/caption/generate", { platform, topic, tone: "engaging" });
      setOptions(data.captions || []);
    } catch (e) {
      const d = e.response?.data?.detail;
      setErr(typeof d === "string" ? d : (d?.message || "Couldn't generate captions"));
    }
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="caption-gen-modal">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>
            <Sparkles size={16} style={{ display: "inline", marginRight: 6, color: "var(--purple-light)" }} /> AI Caption Generator
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6 }} data-testid="gen-close"><XIcon size={16} /></button>
        </div>

        <label className="label">Platform</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {PLATFORMS.map((p) => (
            <button key={p.key} onClick={() => setPlatform(p.key)} data-testid={`gen-platform-${p.key}`}
              style={{
                padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
                border: `1px solid ${platform === p.key ? p.color : "var(--border)"}`,
                background: platform === p.key ? `${p.color}20` : "transparent",
                color: platform === p.key ? p.color : "var(--text-sec)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
              <p.Icon size={13} /> {p.label}
            </button>
          ))}
        </div>

        <label className="label">What&apos;s the content about?</label>
        <textarea className="input" rows={4} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. 'A behind-the-scenes look at editing our latest music video — long hours, emotional moments, the final reveal.'" data-testid="gen-topic" style={{ marginBottom: 12, resize: "vertical" }} />

        <button className="btn-primary" onClick={generate} disabled={busy} data-testid="gen-submit" style={{ width: "100%", padding: 12, marginBottom: 14 }}>
          {busy ? "Generating…" : <><Sparkles size={13} style={{ display: "inline", marginRight: 6 }} /> Generate 3 captions</>}
        </button>
        {err && <div style={{ fontSize: 12, color: "var(--coral)", marginBottom: 10 }} data-testid="gen-error">{err}</div>}

        {options.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="gen-options">
            {options.map((opt, i) => (
              <div key={i} style={{ padding: 14, background: "var(--surface2)", borderRadius: 10, border: "0.5px solid var(--border)" }}>
                <div style={{ fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "var(--text)", marginBottom: 8 }}>{opt}</div>
                <button className="btn-secondary" onClick={() => onUse(opt, platform)} data-testid={`gen-use-${i}`} style={{ padding: "6px 12px", fontSize: 12 }}>
                  Use & schedule
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
