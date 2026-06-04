import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Scissors, Zap, Square, Palette, Sparkles, Type, ArrowLeftRight, Music, Bot, Plus, Trash2, Upload, Play, Pause, CalendarPlus, Check } from "lucide-react";

const CLIP_COLORS = {
  highlight: "#534AB7",
  quote: "#0F6E56",
  reaction: "#BA7517",
  broll: "#4E4A5C",
};

const PROCESSING_STAGES = [
  "Initializing AI engine",
  "Analyzing audio energy",
  "Detecting visual motion",
  "Scanning scene changes",
  "Identifying face & speakers",
  "Surfacing top moments",
  "Building suggestions",
];

export default function AIEditor() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("upload"); // upload | processing | edit
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState(PROCESSING_STAGES[0]);
  const [showPayment, setShowPayment] = useState(false);
  const [videoProject, setVideoProject] = useState(null);
  const [clips, setClips] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [tool, setTool] = useState("trim");
  const [aspect, setAspect] = useState("16:9");
  const [playing, setPlaying] = useState(false);
  const [tc, setTc] = useState(0);
  const [propTab, setPropTab] = useState("clip");
  const [filename, setFilename] = useState("");
  const [toast, setToast] = useState(null);
  const [exportReady, setExportReady] = useState(null); // { url, suggestedPlatform } | null
  const fileInput = useRef(null);

  // Load existing video projects on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/ai/projects");
        const ready = (data.video_projects || []).find((v) => v.status === "ready");
        if (ready) {
          setVideoProject(ready);
          setClips(ready.ai_clips || []);
          setTimeline(ready.timeline || []);
          setStage("edit");
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Playhead animation
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setTc((v) => (v + 1) % 120), 1000);
    return () => clearInterval(t);
  }, [playing]);

  const formatTc = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const onFilePicked = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    setShowPayment(true);
  };

  const confirmPayment = async () => {
    setShowPayment(false);
    setStage("processing");
    setProgress(0);

    // Create upload record
    const { data } = await api.post("/ai/upload", {
      filename: filename || "raw_footage.mp4",
      duration_seconds: 180,
    });
    const vp = data.video_project;

    // Simulate processing
    let p = 0;
    let idx = 0;
    const tick = setInterval(() => {
      p += 14;
      idx = Math.min(idx + 1, PROCESSING_STAGES.length - 1);
      setProgress(Math.min(p, 100));
      setStageLabel(PROCESSING_STAGES[idx]);
      if (p >= 100) {
        clearInterval(tick);
        finishProcessing(vp.id);
      }
    }, 700);
  };

  const finishProcessing = async (vpid) => {
    const { data } = await api.post(`/ai/process/${vpid}`);
    const { data: full } = await api.get(`/ai/projects/${vpid}`);
    setVideoProject(full.video_project);
    setClips(data.clips);
    setTimeline([]);
    setStage("edit");
    showToast("✦ AI ready — 8 moments detected");
  };

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 3500);
  };

  const addClipToTimeline = (clip) => {
    const totalDur = timeline.reduce((s, c) => s + c.duration, 0);
    const newClip = { ...clip, tl_start: totalDur, track: "video" };
    const next = [...timeline, newClip];
    setTimeline(next);
    setClips(clips.map((c) => c.id === clip.id ? { ...c, accepted: true } : c));
    saveTimeline(next);
    showToast(`Added "${clip.label}" to timeline`);
  };

  const skipClip = (clip) => {
    setClips(clips.filter((c) => c.id !== clip.id));
  };

  const removeFromTimeline = (id) => {
    const next = timeline.filter((c) => c.id !== id);
    setTimeline(next);
    saveTimeline(next);
  };

  const saveTimeline = async (tl) => {
    if (!videoProject) return;
    try { await api.patch(`/ai/projects/${videoProject.id}/timeline`, { timeline: tl }); } catch { /* ignore */ }
  };

  const autoEdit = async () => {
    if (!videoProject) return;
    const { data } = await api.post(`/ai/projects/${videoProject.id}/auto-edit`, { target: "tiktok", duration: 60 });
    setTimeline(data.timeline);
    showToast(`✦ AI assembled a ${data.total_duration}s ${data.target} cut`);
  };

  const addAllClips = () => {
    const unaccepted = clips.filter((c) => !c.accepted);
    let cursor = timeline.reduce((s, c) => s + c.duration, 0);
    const newOnes = unaccepted.map((c) => ({ ...c, tl_start: (cursor += c.duration) - c.duration, track: "video" }));
    const next = [...timeline, ...newOnes];
    setTimeline(next);
    setClips(clips.map((c) => ({ ...c, accepted: true })));
    saveTimeline(next);
    showToast(`Added ${newOnes.length} clips`);
  };

  const clearTimeline = () => {
    setTimeline([]);
    setClips(clips.map((c) => ({ ...c, accepted: false })));
    saveTimeline([]);
  };

  const suggestPlatform = (ratio) => {
    if (ratio === "9:16") return "tiktok";
    if (ratio === "1:1") return "instagram";
    return "youtube";
  };

  const exportVideo = () => {
    const exportUrl = (videoProject?.public_url || videoProject?.url || `https://reellabstudio.com/clips/${videoProject?.id || "preview"}.mp4`);
    setExportReady({ url: exportUrl, suggestedPlatform: suggestPlatform(aspect) });
    showToast("✦ Export started — share it below");
  };

  const scheduleThisClip = () => {
    if (!exportReady) return;
    const params = new URLSearchParams({
      clip_url: exportReady.url,
      platform: exportReady.suggestedPlatform,
      title: filename || "Reel from AI Editor",
    });
    navigate(`/content-studio?${params.toString()}`);
  };

  const startNew = () => {
    setStage("upload");
    setProgress(0);
    setClips([]);
    setTimeline([]);
    setVideoProject(null);
    setFilename("");
  };

  return (
    <div className="editor-page" data-testid="ai-editor-page">
      {toast && <div className="toast" data-testid="editor-toast">{toast}</div>}

      <div className="editor-app">
        {/* LEFT - AI clips */}
        <div className="panel-left">
          <div className="panel-header">
            <span className="panel-title">AI Clips</span>
            <button className="panel-action" onClick={addAllClips} disabled={clips.every((c) => c.accepted) || stage !== "edit"} data-testid="add-all-clips">Add all</button>
          </div>
          <div className="clips-list">
            {stage !== "edit" && (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-dim)", fontSize: 12 }}>
                Upload footage to see AI-detected moments.
              </div>
            )}
            {clips.map((c) => (
              <div key={c.id} className={`clip-card ${c.accepted ? "active" : ""}`} data-testid={`ai-clip-${c.id}`}>
                <div className="clip-thumb" style={{ background: `${CLIP_COLORS[c.category]}18` }}>
                  <div style={{ fontSize: 28, opacity: 0.4 }}>
                    {c.category === "highlight" ? "✦" : c.category === "quote" ? "❝" : c.category === "reaction" ? "◉" : "▣"}
                  </div>
                  <div className="clip-thumb-overlay">
                    <span className="clip-duration">{c.duration}s</span>
                  </div>
                </div>
                <div className="clip-info">
                  <div className="clip-label">{c.label}</div>
                  <div className="clip-meta">
                    <span className="clip-score">{Math.round(c.confidence * 100)}%</span>
                    <span className="clip-cat">{c.category}</span>
                  </div>
                </div>
                <div className="clip-actions">
                  <button className="ca-btn add" onClick={() => addClipToTimeline(c)} disabled={c.accepted} data-testid={`clip-add-${c.id}`}>{c.accepted ? "Added" : "+ Add"}</button>
                  <button className="ca-btn skip" onClick={() => skipClip(c)} data-testid={`clip-skip-${c.id}`}>Skip</button>
                </div>
              </div>
            ))}
          </div>
          {clips.length > 0 && (
            <div className="ai-badge">
              <Sparkles size={12} /> {clips.length} moments · {Math.round((clips.reduce((s, c) => s + c.confidence, 0) / clips.length) * 100)}% avg confidence
            </div>
          )}
        </div>

        {/* CENTER */}
        <div className="editor-center">
          {stage === "upload" && (
            <div className="upload-state">
              <div className="upload-zone" onClick={() => fileInput.current?.click()} data-testid="upload-zone">
                <Upload size={44} color="var(--text-sec)" style={{ marginBottom: 14, opacity: 0.6 }} />
                <div className="upload-title">Upload your footage</div>
                <div className="upload-sub">Drop your raw video here.<br />AI will find your best moments automatically.</div>
                <button className="btn-primary" onClick={(e) => { e.stopPropagation(); fileInput.current?.click(); }} data-testid="upload-choose-file">Choose file</button>
                <input ref={fileInput} type="file" accept="video/*" style={{ display: "none" }} onChange={onFilePicked} data-testid="upload-input" />
                <div className="upload-formats">MP4 · MOV · MKV · AVI · up to 4GB</div>
              </div>
            </div>
          )}

          {stage === "processing" && (
            <div className="upload-state">
              <div className="processing-state">
                <div style={{ fontSize: 18, fontWeight: 500 }}>Analyzing footage…</div>
                <div className="proc-bar-wrap"><div className="proc-bar" style={{ width: `${progress}%` }} data-testid="processing-bar" /></div>
                <div className="proc-label" data-testid="processing-label">{progress}%</div>
                <div className="proc-stage">{stageLabel}</div>
              </div>
            </div>
          )}

          {stage === "edit" && (
            <>
              <div className="preview-area">
                <div className="preview-canvas" style={{
                  aspectRatio: aspect === "9:16" ? "9/16" : aspect === "1:1" ? "1/1" : aspect === "4:5" ? "4/5" : aspect === "21:9" ? "21/9" : "16/9",
                  maxWidth: aspect === "9:16" ? "300px" : "720px",
                }}>
                  <div className="preview-video-mock">
                    <svg width="80" height="80" viewBox="0 0 80 80" opacity="0.18">
                      <circle cx="40" cy="40" r="38" stroke="#534AB7" strokeWidth="2" fill="none" />
                      <circle cx="40" cy="40" r="20" stroke="#534AB7" strokeWidth="2" fill="none" />
                      <circle cx="40" cy="40" r="4" fill="#534AB7" />
                      {[[12,40],[68,40],[40,12],[40,68],[20,20],[60,60],[60,20],[20,60]].map(([x,y],i) =>
                        <circle key={i} cx={x} cy={y} r="5" fill="#534AB7" />
                      )}
                    </svg>
                  </div>
                  <div className="play-overlay" onClick={() => setPlaying(!playing)} data-testid="preview-play">
                    <div className="play-circle">{playing ? <Pause size={26} /> : <Play size={26} fill="#fff" />}</div>
                  </div>
                  <div className="preview-label">PREVIEW</div>
                  <div className="timecode-display">{formatTc(tc)}</div>
                  <div className="aspect-badge">{aspect}</div>
                </div>
              </div>

              <div className="toolbar" data-testid="editor-toolbar">
                <div className="tool-group">
                  <button className={`tool-btn ${tool === "trim" ? "active" : ""}`} onClick={() => setTool("trim")} data-testid="tool-trim"><Scissors className="tool-icon" size={16} /><span className="tool-label">Trim</span></button>
                  <button className={`tool-btn ${tool === "speed" ? "active" : ""}`} onClick={() => setTool("speed")} data-testid="tool-speed"><Zap className="tool-icon" size={16} /><span className="tool-label">Speed</span></button>
                </div>
                <div className="tool-group">
                  <button className={`tool-btn ${tool === "resize" ? "active" : ""}`} onClick={() => setTool("resize")} data-testid="tool-resize"><Square className="tool-icon" size={16} /><span className="tool-label">Resize</span></button>
                  <button className={`tool-btn ${tool === "filters" ? "active" : ""}`} onClick={() => setTool("filters")} data-testid="tool-filters"><Palette className="tool-icon" size={16} /><span className="tool-label">Filters</span></button>
                  <button className={`tool-btn ${tool === "fx" ? "active" : ""}`} onClick={() => setTool("fx")} data-testid="tool-fx"><Sparkles className="tool-icon" size={16} /><span className="tool-label">FX</span></button>
                </div>
                <div className="tool-group">
                  <button className={`tool-btn ${tool === "text" ? "active" : ""}`} onClick={() => setTool("text")} data-testid="tool-text"><Type className="tool-icon" size={16} /><span className="tool-label">Text</span></button>
                  <button className={`tool-btn ${tool === "trans" ? "active" : ""}`} onClick={() => setTool("trans")} data-testid="tool-transitions"><ArrowLeftRight className="tool-icon" size={16} /><span className="tool-label">Trans.</span></button>
                  <button className={`tool-btn ${tool === "audio" ? "active" : ""}`} onClick={() => setTool("audio")} data-testid="tool-audio"><Music className="tool-icon" size={16} /><span className="tool-label">Audio</span></button>
                </div>
                <div className="tool-group">
                  <button className="tool-btn" style={{ background: "rgba(83,74,183,0.12)" }} onClick={autoEdit} data-testid="tool-ai-edit">
                    <Bot className="tool-icon" size={16} color="var(--purple)" />
                    <span className="tool-label" style={{ color: "var(--purple)" }}>AI Edit</span>
                  </button>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, paddingRight: 8 }}>
                  <button className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={startNew} data-testid="editor-new">New upload</button>
                  <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={exportVideo} data-testid="editor-export">Export ↓</button>
                </div>
              </div>

              <div className="timeline-area">
                <div className="tl-header">
                  <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "DM Mono, monospace" }}>TIMELINE</span>
                  <div className="tl-zoom">
                    <button>−</button><span>1x</span><button>+</button>
                  </div>
                  <button style={{ marginLeft: "auto", fontSize: 11, color: "var(--coral)", background: "none", border: "none" }} onClick={clearTimeline} data-testid="timeline-clear">Clear all</button>
                </div>
                <div className="tl-tracks">
                  {["VIDEO", "AUDIO", "TEXT"].map((lane) => (
                    <div key={lane} className="tl-track">
                      <div className="tl-track-label">{lane}</div>
                      <div className="tl-track-lane">
                        {lane === "VIDEO" && timeline.map((c, i) => {
                          const left = timeline.slice(0, i).reduce((s, t) => s + t.duration, 0) * 8;
                          return (
                            <div
                              key={c.id + i}
                              className="tl-clip"
                              style={{ left, width: c.duration * 8, background: CLIP_COLORS[c.category] }}
                              onClick={() => removeFromTimeline(c.id)}
                              data-testid={`timeline-clip-${c.id}`}
                              title={`${c.label} · click to remove`}
                            >
                              {c.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="tl-playhead" style={{ left: 70 + tc * 8 }} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT - properties */}
        <div className="panel-right">
          <div className="prop-tabs">
            <button className={`prop-tab ${propTab === "clip" ? "active" : ""}`} onClick={() => setPropTab("clip")} data-testid="prop-tab-clip">Clip</button>
            <button className={`prop-tab ${propTab === "export" ? "active" : ""}`} onClick={() => setPropTab("export")} data-testid="prop-tab-export">Export</button>
          </div>
          <div className="prop-body">
            {propTab === "clip" && (
              <>
                <div className="prop-section">
                  <div className="prop-label">Aspect ratio</div>
                  <div className="aspect-grid">
                    {["16:9", "9:16", "1:1", "4:5", "21:9"].map((a) => (
                      <button key={a} className={`ar-opt ${aspect === a ? "active" : ""}`} onClick={() => setAspect(a)} data-testid={`aspect-${a}`}>
                        <div style={{ fontSize: 14, marginBottom: 2 }}>▭</div>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="prop-section">
                  <div className="prop-label">Trim ({timeline.length} clip{timeline.length !== 1 ? "s" : ""} on timeline)</div>
                  <div style={{ fontSize: 11, color: "var(--text-sec)", marginBottom: 6 }}>In point</div>
                  <input type="range" className="prop-slider" min={0} max={100} defaultValue={0} />
                  <div style={{ fontSize: 11, color: "var(--text-sec)", margin: "8px 0 6px" }}>Out point</div>
                  <input type="range" className="prop-slider" min={0} max={100} defaultValue={100} />
                </div>

                <div className="prop-section">
                  <div className="prop-label">Speed</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["0.5x", "1x", "1.5x", "2x", "4x"].map((s) => (
                      <button key={s} className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11, fontFamily: "DM Mono, monospace" }} data-testid={`speed-${s}`}>{s}</button>
                    ))}
                  </div>
                </div>

                <div className="prop-section">
                  <div className="prop-label">Actions</div>
                  <button className="btn-primary" style={{ width: "100%", padding: 8, fontSize: 12 }} onClick={autoEdit} data-testid="props-ai-auto-edit">
                    <Bot size={12} style={{ display: "inline", marginRight: 4 }} /> AI Auto-Edit (60s TikTok)
                  </button>
                </div>
              </>
            )}
            {propTab === "export" && (
              <>
                <div className="prop-section">
                  <div className="prop-label">Format</div>
                  <select className="input">
                    <option>MP4 (H.264)</option>
                    <option>MOV</option>
                    <option>WebM</option>
                  </select>
                </div>
                <div className="prop-section">
                  <div className="prop-label">Quality</div>
                  <select className="input">
                    <option>1080p (Full HD)</option>
                    <option>4K</option>
                    <option>720p</option>
                  </select>
                </div>
                <button className="btn-primary" style={{ width: "100%", padding: 10 }} onClick={exportVideo} data-testid="export-now">Export now</button>

                {exportReady && (
                  <div style={{ marginTop: 16, padding: 14, background: "var(--purple-glow)", border: "1px solid var(--purple-border)", borderRadius: 10 }} data-testid="export-ready-panel">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Check size={14} style={{ color: "var(--teal)" }} />
                      <strong style={{ fontSize: 13, color: "var(--text)" }}>Reel ready</strong>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-sec)", lineHeight: 1.55, marginBottom: 10 }}>
                      Suggested platform: <strong style={{ color: "var(--purple-light)", textTransform: "capitalize" }}>{exportReady.suggestedPlatform}</strong>. Schedule this clip directly to your content calendar.
                    </div>
                    <button className="btn-secondary" style={{ width: "100%", padding: 10, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={scheduleThisClip} data-testid="schedule-this-clip">
                      <CalendarPlus size={14} /> Schedule this
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showPayment && (
        <div className="modal-overlay" data-testid="payment-modal">
          <div className="modal">
            <div className="modal-title">Complete payment</div>
            <div className="modal-sub">Pay $19 to process this upload. Secure checkout via Stripe.</div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-sec)" }}>File</span>
              <span style={{ fontSize: 13 }}>{filename || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-sec)" }}>AI processing</span>
              <span style={{ fontSize: 13 }}>$19.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 22px" }}>
              <strong>Total</strong>
              <strong style={{ color: "var(--purple)" }}>$19.00</strong>
            </div>
            <button className="btn-primary" style={{ width: "100%", padding: 12 }} onClick={confirmPayment} data-testid="confirm-payment">Pay $19 & process</button>
            <button className="btn-ghost" style={{ width: "100%", padding: 10, marginTop: 6, fontSize: 12 }} onClick={() => setShowPayment(false)} data-testid="cancel-payment">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
