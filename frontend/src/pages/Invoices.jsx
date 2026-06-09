import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import api from "../lib/api";
import { Plus, Trash2 } from "lucide-react";

export default function Invoices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const isCeo = user?.role === "ceo";
  const [invoices, setInvoices] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [show, setShow] = useState(isCeo && loc.pathname.endsWith("/new"));
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_name: loc.state?.client_name || "",
    client_email: "",
    client_id: "",
    project_id: loc.state?.project_id || "",
    items: [{ label: "Editing services", amount: 500 }],
    due_date: "",
    notes: "",
  });

  const load = async () => {
    const iv = await api.get("/invoices");
    setInvoices(iv.data.invoices || []);
    setCanCreate(!!iv.data.can_create);
    if (isCeo) {
      try {
        const cl = await api.get("/clients");
        setClients(cl.data.clients || []);
      } catch (err) { console.warn("clients load failed", err); }
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const updateItem = (i, k, v) => {
    const items = [...form.items];
    items[i] = { ...items[i], [k]: k === "amount" ? parseFloat(v) || 0 : v };
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { label: "", amount: 0 }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const create = async () => {
    if (!form.client_name) return;
    await api.post("/invoices", form);
    setShow(false);
    setForm({ client_name: "", client_email: "", client_id: "", project_id: "", items: [{ label: "", amount: 0 }], due_date: "", notes: "" });
    load();
    if (loc.pathname.endsWith("/new")) navigate("/invoices");
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/invoices/${id}/status`, { status });
    load();
  };

  const markPaid = async (id) => {
    await api.post(`/invoices/${id}/pay`);
    load();
  };

  const total = form.items.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="page-shell" data-testid="invoices-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 className="page-title">{isCeo ? "Invoices" : "Billing & Invoices"}</h1>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShow(!show)} data-testid="new-invoice-btn">
            <Plus size={14} style={{ display: "inline", marginRight: 4 }} /> New invoice
          </button>
        )}
      </div>
      <p className="page-sub" data-testid="invoices-subtitle">
        {isCeo
          ? "Create and manage invoices for any user. Payments flow through Stripe automatically."
          : "Your paid invoices and active subscription history. Read only."}
      </p>

      {canCreate && show && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>New invoice</h3>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div>
              <label className="label">Client name</label>
              <input className="input" placeholder="Client name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} data-testid="invoice-client-name" />
            </div>
            <div>
              <label className="label">Client email</label>
              <input className="input" type="email" placeholder="client@example.com" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} data-testid="invoice-client-email" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Due date</label>
            <input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="invoice-due-date" />
          </div>

          <label className="label">Line items</label>
          {form.items.map((it, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 8, marginBottom: 8 }} data-testid={`invoice-item-${i}`}>
              <input className="input" placeholder="Description" value={it.label} onChange={(e) => updateItem(i, "label", e.target.value)} />
              <input className="input" type="number" placeholder="Amount" value={it.amount} onChange={(e) => updateItem(i, "amount", e.target.value)} />
              <button className="btn-ghost" onClick={() => removeItem(i)} disabled={form.items.length <= 1}><Trash2 size={14} /></button>
            </div>
          ))}
          <button className="btn-secondary" onClick={addItem} style={{ padding: "6px 14px", fontSize: 12 }} data-testid="invoice-add-item">+ Add line item</button>

          <div style={{ marginTop: 18, padding: 14, background: "var(--surface2)", borderRadius: 10, display: "flex", justifyContent: "space-between" }}>
            <strong>Total</strong>
            <strong style={{ color: "var(--purple)" }}>${total.toFixed(2)}</strong>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn-primary" onClick={create} data-testid="invoice-save">Create invoice</button>
            <button className="btn-ghost" onClick={() => setShow(false)}>Cancel</button>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }} data-testid="invoices-empty">
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>
            {isCeo ? "No invoices yet" : "No paid invoices yet"}
          </h3>
          <p style={{ color: "var(--text-sec)", fontSize: 13 }}>
            {isCeo
              ? "Create your first invoice for a client."
              : "Your billing history will appear here after your first payment."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--surface2)" }}>
              <tr style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-dim)", fontFamily: "DM Mono, monospace" }}>
                <th style={{ padding: "12px 16px" }}>Number</th>
                <th>{isCeo ? "Client" : "Description"}</th>
                <th>Total</th>
                <th>Status</th>
                {isCeo && <th></th>}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: "0.5px solid var(--border)", fontSize: 13 }} data-testid={`invoice-row-${inv.id}`}>
                  <td style={{ padding: "14px 16px" }}><strong>{inv.number}</strong></td>
                  <td>{isCeo ? inv.client_name : ((inv.items && inv.items[0]?.label) || inv.client_name)}</td>
                  <td>${inv.total?.toFixed(2)}</td>
                  <td><span className={`pill status-${inv.status}`} data-testid={`invoice-status-${inv.id}`}>{inv.status}</span></td>
                  {isCeo && (
                    <td style={{ textAlign: "right", paddingRight: 16 }}>
                      {inv.status === "draft" && <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11, marginRight: 6 }} onClick={() => updateStatus(inv.id, "sent")} data-testid={`invoice-send-${inv.id}`}>Send</button>}
                      {inv.status !== "paid" && <button className="btn-primary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => markPaid(inv.id)} data-testid={`invoice-pay-${inv.id}`}>Mark Paid</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
