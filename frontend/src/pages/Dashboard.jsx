import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { Plus, Video, FileText, Users, ArrowRight, Sparkles } from "lucide-react";
import OnboardingTour from "../components/OnboardingTour";

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tour, setTour] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, c, i] = await Promise.all([
          api.get("/projects"),
          api.get("/clients"),
          api.get("/invoices"),
        ]);
        setProjects(p.data.projects);
        setClients(c.data.clients);
        setInvoices(i.data.invoices);
      } catch (err) { console.warn("dashboard load failed", err); }
    })();
    if (user && !user.tutorial_completed && user.role !== "ceo") setTour(true);
  }, [user]);

  const closeTour = async () => { setTour(false); await refresh(); };

  const activeProjects = projects.filter((p) => !["delivered", "cancelled", "rejected"].includes(p.status));
  const pendingInvoices = invoices.filter((i) => i.status !== "paid");
  const revenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="page-shell" data-testid="dashboard-page">
      {tour && <OnboardingTour onClose={closeTour} />}
      <h1 className="page-title">Welcome back, {user?.display_name?.split(" ")[0] || "creator"}.</h1>
      <p className="page-sub">Your studio at a glance.</p>

      <div className="grid-3" style={{ marginBottom: 32 }}>
        <div className="stat-card" data-testid="stat-projects">
          <div className="stat-label">Active projects</div>
          <div className="stat-num">{activeProjects.length}</div>
          <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 6 }}>{projects.length} total</div>
        </div>
        <div className="stat-card" data-testid="stat-clients">
          <div className="stat-label">Clients</div>
          <div className="stat-num">{clients.length}</div>
          <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 6 }}>active relationships</div>
        </div>
        <div className="stat-card" data-testid="stat-revenue">
          <div className="stat-label">Revenue (paid)</div>
          <div className="stat-num">${revenue.toFixed(0)}</div>
          <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 6 }}>{pendingInvoices.length} pending</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 32 }}>
        <button className="card" style={{ textAlign: "left", cursor: "pointer", border: "0.5px solid var(--purple)", background: "linear-gradient(135deg, rgba(83,74,183,0.08), rgba(83,74,183,0.02))" }} onClick={() => navigate("/projects/new")} data-testid="quick-new-project">
          <Plus size={20} color="var(--purple)" style={{ marginBottom: 10 }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>New project</h3>
          <p style={{ fontSize: 13, color: "var(--text-sec)" }}>Start the 5-step wizard.</p>
        </button>
        <button className="card" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => navigate("/editor")} data-testid="quick-ai-editor">
          <Sparkles size={20} color="var(--purple)" style={{ marginBottom: 10 }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>AI Editor</h3>
          <p style={{ fontSize: 13, color: "var(--text-sec)" }}>Upload footage, let AI find your best moments.</p>
        </button>
        <button className="card" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => navigate("/community")} data-testid="quick-community">
          <Users size={20} color="var(--purple)" style={{ marginBottom: 10 }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Community</h3>
          <p style={{ fontSize: 13, color: "var(--text-sec)" }}>Connect with other creators · send stars.</p>
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Recent projects</h2>
        <Link to="/projects" style={{ fontSize: 13, color: "var(--purple)" }} data-testid="see-all-projects">See all <ArrowRight size={12} style={{ display: "inline" }} /></Link>
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <Video size={40} color="var(--text-dim)" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>No projects yet</h3>
          <p style={{ color: "var(--text-sec)", fontSize: 13, marginBottom: 20 }}>Create your first project to get started.</p>
          <button className="btn-primary" onClick={() => navigate("/projects/new")} data-testid="empty-new-project">Create project</button>
        </div>
      ) : (
        <div className="grid-3">
          {projects.slice(0, 6).map((p) => (
            <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)} data-testid={`project-card-${p.id}`}>
              <span className={`pill status-${p.status || "draft"}`}>{p.status}</span>
              <h3 style={{ marginTop: 10 }}>{p.name}</h3>
              <div className="meta">{p.client_name || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
