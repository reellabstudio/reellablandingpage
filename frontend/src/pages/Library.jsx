import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Search, Grid, List as ListIcon, Filter, Trash2, Copy, Download, Calendar as CalIcon } from "lucide-react";

const PLATFORMS = [
  { key: "all", label: "All" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "x", label: "X" },
  { key: "facebook", label: "Facebook" },
];

export default function Library() {
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState("grid");
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");

  const load = async () => {
    const { data } = await api.get("/content/posts");
    setPosts(data.posts || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = posts.filter((p) =>
    (platform === "all" || p.platform === platform) &&
    (status === "all" || p.status === status) &&
    (!q || (p.title || "").toLowerCase().includes(q.toLowerCase()))
  );

  const dup = async (p) => {
    await api.post("/content/posts", { ...p, id: undefined, title: `${p.title} (copy)`, status: "draft" });
    load();
  };
  const del = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    await api.delete(`/content/posts/${id}`);
    load();
  };

  return (
    <div className="page-shell" data-testid="library-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <h1 className="page-title">Library</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/content-studio" className="btn-secondary" style={{ padding: "10px 18px" }}><CalIcon size={14} style={{ display: "inline", marginRight: 6 }} /> Calendar view</Link>
          <Link to="/editor" className="btn-primary" style={{ padding: "10px 18px" }}>Upload new</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: "flex", gap: 12, padding: 14, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 220 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 36 }} data-testid="library-search" />
        </div>
        <select className="input" style={{ width: "auto" }} value={platform} onChange={(e) => setPlatform(e.target.value)} data-testid="library-platform">
          {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)} data-testid="library-status">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
        <div style={{ display: "flex", gap: 4, background: "var(--surface2)", padding: 4, borderRadius: 100 }}>
          <button onClick={() => setView("grid")} className="btn-ghost" style={{ background: view === "grid" ? "var(--purple)" : "transparent", color: view === "grid" ? "#fff" : "var(--text-sec)", padding: "6px 12px" }} data-testid="library-view-grid"><Grid size={14} /></button>
          <button onClick={() => setView("list")} className="btn-ghost" style={{ background: view === "list" ? "var(--purple)" : "transparent", color: view === "list" ? "#fff" : "var(--text-sec)", padding: "6px 12px" }} data-testid="library-view-list"><ListIcon size={14} /></button>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }} data-testid="library-empty">
          <div className="display-md" style={{ color: "var(--text)", marginBottom: 8 }}>No items yet</div>
          <div style={{ color: "var(--text-sec)", fontSize: 14 }}>Upload a clip or schedule a post from the Editor or Content Studio.</div>
        </div>
      ) : view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {filtered.map((p) => (
            <div key={p.id} className="card" style={{ padding: 14 }} data-testid={`lib-item-${p.id}`}>
              <div style={{ aspectRatio: "9/16", background: "var(--surface3)", borderRadius: 10, marginBottom: 10, overflow: "hidden", position: "relative" }}>
                {p.media_url ? <video src={p.media_url} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)", fontSize: 12 }}>No clip</div>}
                <div style={{ position: "absolute", top: 6, right: 6, fontSize: 9, fontFamily: "DM Mono, monospace", padding: "2px 7px", borderRadius: 100, background: "rgba(0,0,0,0.7)", color: "#fff", textTransform: "uppercase" }}>{p.platform}</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-dim)", fontFamily: "DM Mono, monospace" }}>
                <span className={`pill status-${p.status}`} style={{ fontSize: 9 }}>{p.status}</span>
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 10, justifyContent: "flex-end" }}>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => dup(p)} title="Duplicate"><Copy size={13} /></button>
                {p.media_url && <a href={p.media_url} download target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: 6 }} title="Download"><Download size={13} /></a>}
                <button className="btn-ghost" style={{ padding: 6, color: "var(--coral)" }} onClick={() => del(p.id)} title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--surface2)" }}>
              <tr style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-dim)", fontFamily: "DM Mono, monospace" }}>
                <th style={{ padding: "12px 16px" }}>Title</th><th>Platform</th><th>Status</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--border)", fontSize: 13 }}>
                  <td style={{ padding: "14px 16px", color: "var(--text)" }}>{p.title}</td>
                  <td style={{ color: "var(--text-sec)", textTransform: "capitalize" }}>{p.platform}</td>
                  <td><span className={`pill status-${p.status}`}>{p.status}</span></td>
                  <td style={{ color: "var(--text-sec)" }}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right", paddingRight: 16 }}>
                    <button className="btn-ghost" style={{ padding: 6 }} onClick={() => dup(p)}><Copy size={13} /></button>
                    <button className="btn-ghost" style={{ padding: 6, color: "var(--coral)" }} onClick={() => del(p.id)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
