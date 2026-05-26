import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Plus, Search } from "lucide-react";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/projects");
      setProjects(data.projects);
    })();
  }, []);

  const filtered = projects.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-shell" data-testid="projects-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 className="page-title">Projects</h1>
        <button className="btn-primary" onClick={() => navigate("/projects/new")} data-testid="new-project-btn">
          <Plus size={14} style={{ display: "inline", marginRight: 4 }} /> New project
        </button>
      </div>
      <p className="page-sub">All your client work in one place.</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 12, color: "var(--text-dim)" }} />
          <input className="input" placeholder="Search projects…" style={{ paddingLeft: 32 }} value={search} onChange={(e) => setSearch(e.target.value)} data-testid="projects-search" />
        </div>
        <select className="input" style={{ maxWidth: 180 }} value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="projects-filter">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="editing">Editing</option>
          <option value="review">Review</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>No projects match</h3>
          <p style={{ color: "var(--text-sec)", fontSize: 13 }}>Try adjusting your filters or create a new project.</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((p) => (
            <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)} data-testid={`project-card-${p.id}`}>
              <span className={`pill status-${p.status || "draft"}`}>{p.status}</span>
              <h3 style={{ marginTop: 10 }}>{p.name}</h3>
              <div className="meta" style={{ marginBottom: 6 }}>{p.client_name || "—"}</div>
              {p.due_date && <div className="meta">Due: {p.due_date}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
