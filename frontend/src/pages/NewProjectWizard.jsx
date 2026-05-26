import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatErr } from "../lib/api";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const STEPS = ["Client", "Deliverables", "Scope", "Review", "Confirm"];

export default function NewProjectWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState({ name: "", email: "" });
  const [showNewClient, setShowNewClient] = useState(false);
  const [form, setForm] = useState({
    name: "",
    client_id: "",
    client_name: "",
    deliverables: [{ title: "Main video", format: "16:9", duration: "60s" }],
    scope: "",
    due_date: "",
    revision_rounds: 2,
    budget: 500,
    notes: "",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/clients");
      setClients(data.clients);
    })();
  }, []);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const addDeliverable = () => set("deliverables", [...form.deliverables, { title: "", format: "16:9", duration: "" }]);
  const updateDeliverable = (i, k, v) => {
    const d = [...form.deliverables];
    d[i] = { ...d[i], [k]: v };
    set("deliverables", d);
  };
  const removeDeliverable = (i) => set("deliverables", form.deliverables.filter((_, idx) => idx !== i));

  const createClientInline = async () => {
    if (!newClient.name) return;
    try {
      const { data } = await api.post("/clients", newClient);
      setClients([data.client, ...clients]);
      set("client_id", data.client.id);
      set("client_name", data.client.name);
      setShowNewClient(false);
      setNewClient({ name: "", email: "" });
    } catch (e) {
      setErr(formatErr(e.response?.data?.detail));
    }
  };

  const canNext = () => {
    if (step === 0) return form.name && (form.client_id || form.client_name);
    if (step === 1) return form.deliverables.length > 0;
    return true;
  };

  const submit = async () => {
    setSaving(true);
    setErr("");
    try {
      const { data } = await api.post("/projects", form);
      navigate(`/projects/${data.project.id}`);
    } catch (e) {
      setErr(formatErr(e.response?.data?.detail));
      setSaving(false);
    }
  };

  return (
    <div className="page-shell" style={{ maxWidth: 720 }} data-testid="new-project-wizard">
      <button className="btn-ghost" onClick={() => navigate("/projects")} style={{ marginBottom: 16 }} data-testid="wizard-back-to-projects">
        <ArrowLeft size={14} style={{ display: "inline", marginRight: 4 }} /> Back to projects
      </button>
      <h1 className="page-title">New project</h1>
      <p className="page-sub">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "var(--purple)" : "var(--surface3)" }} />
        ))}
      </div>

      <div className="card">
        {step === 0 && (
          <>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Project name & client</h3>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Project name</label>
              <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g., Q1 brand video" data-testid="wizard-project-name" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Client</label>
              <select className="input" value={form.client_id} onChange={(e) => {
                const c = clients.find((c2) => c2.id === e.target.value);
                set("client_id", e.target.value);
                if (c) set("client_name", c.name);
              }} data-testid="wizard-client-select">
                <option value="">— Select a client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="btn-ghost" style={{ marginTop: 8, fontSize: 12, padding: "4px 8px" }} onClick={() => setShowNewClient(!showNewClient)} data-testid="wizard-add-client-toggle">
                {showNewClient ? "Cancel" : "+ New client"}
              </button>
            </div>
            {showNewClient && (
              <div style={{ background: "var(--surface2)", padding: 14, borderRadius: 10, marginBottom: 10 }}>
                <input className="input" placeholder="Client name" style={{ marginBottom: 8 }} value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} data-testid="wizard-new-client-name" />
                <input className="input" placeholder="Client email (optional)" style={{ marginBottom: 8 }} value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} data-testid="wizard-new-client-email" />
                <button className="btn-primary" onClick={createClientInline} style={{ padding: "8px 16px" }} data-testid="wizard-new-client-create">Create</button>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Deliverables</h3>
            {form.deliverables.map((d, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 10 }} data-testid={`wizard-deliverable-${i}`}>
                <input className="input" placeholder="Title" value={d.title} onChange={(e) => updateDeliverable(i, "title", e.target.value)} />
                <select className="input" value={d.format} onChange={(e) => updateDeliverable(i, "format", e.target.value)}>
                  <option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option>
                </select>
                <input className="input" placeholder="Duration" value={d.duration} onChange={(e) => updateDeliverable(i, "duration", e.target.value)} />
                <button className="btn-ghost" onClick={() => removeDeliverable(i)} disabled={form.deliverables.length <= 1}>✕</button>
              </div>
            ))}
            <button className="btn-secondary" onClick={addDeliverable} style={{ padding: "8px 16px", fontSize: 12 }} data-testid="wizard-add-deliverable">+ Add deliverable</button>
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Scope & timeline</h3>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Scope description</label>
              <textarea className="input" rows={4} value={form.scope} onChange={(e) => set("scope", e.target.value)} placeholder="What's in scope for this project?" data-testid="wizard-scope" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Due date</label>
              <input className="input" type="date" value={form.due_date || ""} onChange={(e) => set("due_date", e.target.value)} data-testid="wizard-due-date" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Budget (USD)</label>
              <input className="input" type="number" value={form.budget} onChange={(e) => set("budget", parseFloat(e.target.value) || 0)} data-testid="wizard-budget" />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Review settings</h3>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Revision rounds included</label>
              <input className="input" type="number" min={1} max={5} value={form.revision_rounds} onChange={(e) => set("revision_rounds", parseInt(e.target.value, 10) || 2)} data-testid="wizard-revisions" />
              <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 6 }}>2 rounds included per ReelLab standard.</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Notes for client</label>
              <textarea className="input" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} data-testid="wizard-notes" />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Confirm</h3>
            <div style={{ background: "var(--surface2)", padding: 14, borderRadius: 10 }}>
              <div style={{ marginBottom: 10 }}><span className="label" style={{ display: "inline", marginRight: 8 }}>Project:</span><strong>{form.name}</strong></div>
              <div style={{ marginBottom: 10 }}><span className="label" style={{ display: "inline", marginRight: 8 }}>Client:</span>{form.client_name || "—"}</div>
              <div style={{ marginBottom: 10 }}><span className="label" style={{ display: "inline", marginRight: 8 }}>Deliverables:</span>{form.deliverables.length}</div>
              <div style={{ marginBottom: 10 }}><span className="label" style={{ display: "inline", marginRight: 8 }}>Due:</span>{form.due_date || "—"}</div>
              <div><span className="label" style={{ display: "inline", marginRight: 8 }}>Budget:</span>${form.budget}</div>
            </div>
          </>
        )}

        {err && <div style={{ color: "var(--coral)", marginTop: 14, fontSize: 13 }}>{err}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "0.5px solid var(--border)" }}>
          <button className="btn-secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} data-testid="wizard-back">
            <ArrowLeft size={14} style={{ display: "inline", marginRight: 4 }} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn-primary" onClick={() => setStep(step + 1)} disabled={!canNext()} data-testid="wizard-next">
              Next <ArrowRight size={14} style={{ display: "inline", marginLeft: 4 }} />
            </button>
          ) : (
            <button className="btn-primary" onClick={submit} disabled={saving} data-testid="wizard-submit">
              <Check size={14} style={{ display: "inline", marginRight: 4 }} /> Create project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
