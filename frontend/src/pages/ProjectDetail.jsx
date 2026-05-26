import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { ArrowLeft, Send, Plus, Check, FileText, MessageSquare, ListChecks, Receipt, Users } from "lucide-react";

const TABS = [
  { key: "deliverables", label: "Deliverables", icon: FileText },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "checklist", label: "Checklist", icon: ListChecks },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "team", label: "Team", icon: Users },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [tab, setTab] = useState("deliverables");
  const [msg, setMsg] = useState("");
  const [newChk, setNewChk] = useState("");

  const load = async () => {
    const { data } = await api.get(`/projects/${id}`);
    setProject(data.project);
    setInvoices(data.invoices || []);
  };

  useEffect(() => { load(); }, [id]);

  const setStatus = async (status) => {
    await api.patch(`/projects/${id}/status`, { status });
    load();
  };

  const sendMessage = async () => {
    if (!msg.trim()) return;
    await api.post(`/projects/${id}/messages`, { body: msg });
    setMsg("");
    load();
  };

  const addChecklistItem = async () => {
    if (!newChk.trim()) return;
    await api.post(`/projects/${id}/checklist`, { text: newChk, done: false });
    setNewChk("");
    load();
  };

  const toggleChk = async (item) => {
    await api.patch(`/projects/${id}/checklist/${item.id}`, { text: item.text, done: !item.done });
    load();
  };

  if (!project) return <div className="page-shell">Loading…</div>;

  return (
    <div className="page-shell" data-testid="project-detail-page">
      <button className="btn-ghost" onClick={() => navigate("/projects")} style={{ marginBottom: 12 }} data-testid="back-to-projects">
        <ArrowLeft size={14} style={{ display: "inline", marginRight: 4 }} /> Projects
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <span className={`pill status-${project.status}`}>{project.status}</span>
          <h1 className="page-title" style={{ marginTop: 10, marginBottom: 4 }}>{project.name}</h1>
          <p style={{ color: "var(--text-sec)", fontSize: 14 }}>{project.client_name} · Due {project.due_date || "—"} · ${project.budget || 0}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {project.status === "draft" && <button className="btn-primary" onClick={() => setStatus("active")} data-testid="project-activate">Activate</button>}
          {project.status === "active" && <button className="btn-primary" onClick={() => setStatus("editing")} data-testid="project-to-editing">Move to Editing</button>}
          {project.status === "editing" && <button className="btn-primary" onClick={() => setStatus("review")} data-testid="project-to-review">Send for Review</button>}
          {project.status === "review" && <button className="btn-primary" onClick={() => setStatus("delivered")} data-testid="project-deliver">Mark Delivered</button>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "0.5px solid var(--border)", marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            data-testid={`tab-${key}`}
            style={{
              padding: "12px 18px", background: "none", border: "none",
              borderBottom: tab === key ? "2px solid var(--purple)" : "2px solid transparent",
              color: tab === key ? "var(--purple)" : "var(--text-sec)",
              fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "deliverables" && (
        <div data-testid="deliverables-panel">
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>Deliverables ({project.deliverables?.length || 0})</h3>
          {(project.deliverables || []).map((d, i) => (
            <div key={i} className="card" style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{d.title}</strong>
                <div style={{ fontSize: 12, color: "var(--text-sec)" }}>{d.format} · {d.duration}</div>
              </div>
              <button className="btn-secondary" onClick={() => navigate("/editor")} style={{ padding: "6px 14px", fontSize: 12 }}>Edit in AI Editor</button>
            </div>
          ))}
          <button className="btn-primary" onClick={() => navigate("/editor")} style={{ marginTop: 10 }} data-testid="open-editor">Open AI Editor</button>
        </div>
      )}

      {tab === "messages" && (
        <div data-testid="messages-panel">
          <div style={{ marginBottom: 20, maxHeight: 400, overflowY: "auto" }}>
            {(project.messages || []).length === 0 && <div style={{ color: "var(--text-sec)", fontSize: 13 }}>No messages yet.</div>}
            {(project.messages || []).map((m) => (
              <div key={m.id} style={{ background: "var(--surface2)", padding: 12, borderRadius: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 4 }}>{m.author_name} · {new Date(m.created_at).toLocaleString()}</div>
                <div style={{ fontSize: 14 }}>{m.body}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Write a message…" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} data-testid="message-input" />
            <button className="btn-primary" onClick={sendMessage} data-testid="message-send"><Send size={14} /></button>
          </div>
        </div>
      )}

      {tab === "checklist" && (
        <div data-testid="checklist-panel">
          {(project.checklist || []).map((c) => (
            <div key={c.id} onClick={() => toggleChk(c)} style={{ padding: 12, background: "var(--surface2)", borderRadius: 8, marginBottom: 6, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: "1px solid var(--border2)", background: c.done ? "var(--purple)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {c.done && <Check size={12} color="#fff" />}
              </div>
              <span style={{ textDecoration: c.done ? "line-through" : "none", color: c.done ? "var(--text-sec)" : "var(--text)", fontSize: 13 }}>{c.text}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input className="input" placeholder="Add checklist item…" value={newChk} onChange={(e) => setNewChk(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} data-testid="checklist-input" />
            <button className="btn-primary" onClick={addChecklistItem} data-testid="checklist-add"><Plus size={14} /></button>
          </div>
        </div>
      )}

      {tab === "invoices" && (
        <div data-testid="invoices-panel">
          {invoices.length === 0 ? (
            <div style={{ color: "var(--text-sec)", fontSize: 13, marginBottom: 14 }}>No invoices for this project yet.</div>
          ) : invoices.map((inv) => (
            <div key={inv.id} className="card" style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{inv.number}</strong>
                <div style={{ fontSize: 12, color: "var(--text-sec)" }}>${inv.total} · {inv.client_name}</div>
              </div>
              <span className={`pill status-${inv.status}`}>{inv.status}</span>
            </div>
          ))}
          <button className="btn-primary" onClick={() => navigate("/invoices/new", { state: { project_id: id, client_name: project.client_name } })} data-testid="create-invoice-btn">+ Create invoice</button>
        </div>
      )}

      {tab === "team" && (
        <div data-testid="team-panel">
          <div style={{ color: "var(--text-sec)", fontSize: 13, marginBottom: 14 }}>Team management coming soon. You'll be able to invite Editors and Viewers per project.</div>
          {(project.team || []).map((t) => (
            <div key={t.email} className="card" style={{ marginBottom: 8 }}>{t.email} · {t.role}</div>
          ))}
        </div>
      )}
    </div>
  );
}
