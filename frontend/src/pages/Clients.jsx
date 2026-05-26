import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Plus, Trash2 } from "lucide-react";

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", notes: "" });

  const load = async () => {
    const { data } = await api.get("/clients");
    setClients(data.clients);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return;
    await api.post("/clients", form);
    setForm({ name: "", email: "", company: "", phone: "", notes: "" });
    setShow(false);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    await api.delete(`/clients/${id}`);
    load();
  };

  return (
    <div className="page-shell" data-testid="clients-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 className="page-title">Clients</h1>
        <button className="btn-primary" onClick={() => setShow(!show)} data-testid="new-client-btn">
          <Plus size={14} style={{ display: "inline", marginRight: 4 }} /> New client
        </button>
      </div>
      <p className="page-sub">Manage your clients and their projects.</p>

      {show && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>New client</h3>
          <div className="grid-2">
            <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="client-form-name" />
            <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="client-form-email" />
            <input className="input" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} data-testid="client-form-company" />
            <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="client-form-phone" />
          </div>
          <textarea className="input" placeholder="Notes" rows={2} style={{ marginTop: 10 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="client-form-notes" />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn-primary" onClick={create} data-testid="client-form-save">Save client</button>
            <button className="btn-ghost" onClick={() => setShow(false)}>Cancel</button>
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>No clients yet</h3>
          <p style={{ color: "var(--text-sec)", fontSize: 13 }}>Add your first client to get started.</p>
        </div>
      ) : (
        <div className="grid-3">
          {clients.map((c) => (
            <div key={c.id} className="card" style={{ position: "relative" }} data-testid={`client-card-${c.id}`}>
              <button onClick={(e) => { e.stopPropagation(); remove(c.id); }} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "var(--text-dim)" }} data-testid={`client-delete-${c.id}`}>
                <Trash2 size={14} />
              </button>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{c.name}</h3>
              {c.company && <div style={{ fontSize: 12, color: "var(--text-sec)" }}>{c.company}</div>}
              {c.email && <div style={{ fontSize: 12, color: "var(--text-sec)" }}>{c.email}</div>}
              {c.phone && <div style={{ fontSize: 12, color: "var(--text-sec)" }}>{c.phone}</div>}
              {c.notes && <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-sec)", padding: 10, background: "var(--surface2)", borderRadius: 8 }}>{c.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
