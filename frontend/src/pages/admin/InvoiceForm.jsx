/**
 * src/pages/admin/InvoiceForm.jsx
 * Invoice Create / Edit Form — 2 views (draft → confirmed)
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle, XCircle, Send, Printer, CreditCard, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { StatusBadge, Modal, Btn, FormField, Spinner } from "../../components/common/UI";

const EMPTY_LINE = { product_id: "", description: "", quantity: 1, unit_price: 0, discount_pct: 0, tax_ids: [] };

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [inv, setInv] = useState(null);
  const [form, setForm] = useState({ customer_id: "", invoice_date: new Date().toISOString().split("T")[0], due_date: "", notes: "" });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ payment_method: "cash", amount: 0, payment_date: new Date().toISOString().split("T")[0] });

  useEffect(() => {
    Promise.all([
      api.get("/api/contacts").catch(() => ({ data: [] })),
      api.get("/api/products").catch(() => ({ data: [] })),
      api.get("/api/taxes").catch(() => ({ data: [] })),
    ]).then(([c, p, t]) => { setContacts(c.data); setProducts(p.data); setTaxes(t.data); });
    if (!isNew) loadInv();
  }, []);

  const loadInv = async () => {
    try {
      const r = await api.get(`/api/invoices/${id}`);
      const i = r.data;
      setInv(i);
      setForm({ customer_id: i.customer_id || "", invoice_date: i.invoice_date || "", due_date: i.due_date || "", notes: i.notes || "" });
      setLines(i.lines?.length ? i.lines.map(l => ({ id: l.id, product_id: l.product_id || "", description: l.description || "", quantity: l.quantity, unit_price: l.unit_price, discount_pct: l.discount_pct, tax_ids: l.taxes?.map(t => t.id) || [] })) : [{ ...EMPTY_LINE }]);
    } catch { toast.error("Failed to load invoice."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, lines };
      if (isNew) { const r = await api.post("/api/invoices", payload); toast.success("Invoice created."); navigate(`/admin/invoices/${r.data.invoice.id}`); }
      else { await api.put(`/api/invoices/${id}`, payload); toast.success("Saved."); loadInv(); }
    } catch (e) { toast.error(e.response?.data?.error || "Save failed."); }
    finally { setSaving(false); }
  };

  const action = async (act) => {
    setSaving(true);
    try { await api.post(`/api/invoices/${id}/${act}`); toast.success(`Invoice ${act}ed.`); loadInv(); }
    catch (e) { toast.error(e.response?.data?.error || "Action failed."); }
    finally { setSaving(false); }
  };

  const handlePay = async () => {
    setSaving(true);
    try { await api.post("/api/payments", { ...payForm, invoice_id: parseInt(id) }); toast.success("Payment recorded."); setPayModal(false); loadInv(); }
    catch (e) { toast.error(e.response?.data?.error || "Payment failed."); }
    finally { setSaving(false); }
  };

  const lineAmt = (l) => { const b = (l.quantity || 0) * (l.unit_price || 0); return b - b * (l.discount_pct || 0) / 100; };
  const total = lines.reduce((s, l) => s + lineAmt(l), 0);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };
  const isDraft = !inv || inv.status === "draft";

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/invoices")}><ArrowLeft size={14} /> Back</Btn>
          {inv && <><span className="font-mono font-semibold text-blue-500">{inv.invoice_number}</span><StatusBadge status={inv.status} /></>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && <Btn onClick={handleSave} loading={saving}><Save size={14} /> Save</Btn>}
          {isDraft && <Btn variant="success" size="sm" onClick={() => action("confirm")}><CheckCircle size={14} /> Confirm</Btn>}
          {isDraft && <Btn variant="danger" size="sm" onClick={() => action("cancel")}><XCircle size={14} /> Cancel</Btn>}
          {!isDraft && inv?.status !== "cancelled" && (
            <>
              {inv?.subscription_id && <Btn variant="secondary" size="sm" onClick={() => navigate(`/admin/subscriptions/${inv.subscription_id}`)}>Subscription</Btn>}
              <Btn variant="secondary" size="sm" onClick={() => action("send")}><Send size={14} /> Send</Btn>
              {inv?.amount_due > 0 && <Btn variant="success" size="sm" onClick={() => { setPayForm(f => ({ ...f, amount: inv.amount_due })); setPayModal(true); }}><CreditCard size={14} /> Pay</Btn>}
              <Btn variant="secondary" size="sm" onClick={() => window.print()}><Printer size={14} /> Print</Btn>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Customer">
            <select value={form.customer_id} onChange={(e) => setForm(f => ({ ...f, customer_id: e.target.value }))} disabled={!isDraft}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inp}>
              <option value="">— Customer —</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Invoice Date">
            <input type="date" value={form.invoice_date} onChange={(e) => setForm(f => ({ ...f, invoice_date: e.target.value }))} disabled={!isDraft}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inp} />
          </FormField>
          <FormField label="Due Date">
            <input type="date" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} disabled={!isDraft}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inp} />
          </FormField>
        </div>

        <div className="space-y-2">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
              {["Product", "Description", "Qty", "Unit Price", "Disc%", "Tax", "Amount", ""].map(h =>
                <th key={h} className="text-left px-2 py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                  <td className="px-2 py-2 min-w-[140px]">
                    <select value={line.product_id} disabled={!isDraft}
                      onChange={(e) => { const p = products.find(x => x.id === parseInt(e.target.value)); setLines(ls => ls.map((l, i) => i === idx ? { ...l, product_id: e.target.value, unit_price: p?.sales_price || 0, description: p?.name || "" } : l)); }}
                      className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp}>
                      <option value="">— Product —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 min-w-[120px]">
                    <input value={line.description} disabled={!isDraft} onChange={(e) => setLines(ls => ls.map((l, i) => i === idx ? { ...l, description: e.target.value } : l))}
                      className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp} placeholder="Description" />
                  </td>
                  <td className="px-2 py-2 w-14">
                    <input type="number" value={line.quantity} disabled={!isDraft} onChange={(e) => setLines(ls => ls.map((l, i) => i === idx ? { ...l, quantity: parseFloat(e.target.value) || 1 } : l))}
                      className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={inp} />
                  </td>
                  <td className="px-2 py-2 w-20">
                    <input type="number" value={line.unit_price} disabled={!isDraft} onChange={(e) => setLines(ls => ls.map((l, i) => i === idx ? { ...l, unit_price: parseFloat(e.target.value) || 0 } : l))}
                      className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={inp} />
                  </td>
                  <td className="px-2 py-2 w-16">
                    <input type="number" value={line.discount_pct} disabled={!isDraft} onChange={(e) => setLines(ls => ls.map((l, i) => i === idx ? { ...l, discount_pct: parseFloat(e.target.value) || 0 } : l))}
                      className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={inp} />
                  </td>
                  <td className="px-2 py-2 min-w-[100px]">
                    <select value={line.tax_ids[0] || ""} disabled={!isDraft} onChange={(e) => setLines(ls => ls.map((l, i) => i === idx ? { ...l, tax_ids: e.target.value ? [parseInt(e.target.value)] : [] } : l))}
                      className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp}>
                      <option value="">No Tax</option>
                      {taxes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 w-20 text-right font-medium" style={{ color: "var(--text-primary)" }}>₹{lineAmt(line).toFixed(2)}</td>
                  <td className="px-2 py-2 w-8">
                    {isDraft && <button onClick={() => setLines(ls => ls.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600" disabled={lines.length === 1}><Trash2 size={13} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isDraft && <button onClick={() => setLines(ls => [...ls, { ...EMPTY_LINE }])} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1"><Plus size={14} /> Add Line</button>}
          <div className="flex justify-end">
            <div className="min-w-52 space-y-1.5 text-sm">
              <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Subtotal</span><span>₹{total.toFixed(2)}</span></div>
              {inv && <><div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Tax</span><span>₹{(inv.tax_amount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: "var(--border-color)" }}><span>Total</span><span>₹{(inv.total || total).toFixed(2)}</span></div>
              {inv.amount_paid > 0 && <div className="flex justify-between text-green-500"><span>Paid</span><span>-₹{inv.amount_paid.toFixed(2)}</span></div>}
              {inv.amount_due >= 0 && <div className="flex justify-between font-semibold" style={{ color: inv.amount_due > 0 ? "var(--danger)" : "var(--success)" }}><span>Amount Due</span><span>₹{inv.amount_due.toFixed(2)}</span></div>}</>}
            </div>
          </div>
        </div>
      </div>

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment" width="max-w-sm">
        <div className="space-y-4">
          {[{ label: "Payment Method", key: "payment_method", type: "select", options: [["cash", "Cash"], ["online", "Online"], ["bank_transfer", "Bank Transfer"]] },
            { label: "Amount (₹)", key: "amount", type: "number" },
            { label: "Payment Date", key: "payment_date", type: "date" }].map(({ label, key, type, options }) => (
            <FormField key={key} label={label}>
              {type === "select" ? (
                <select value={payForm[key]} onChange={(e) => setPayForm(f => ({ ...f, [key]: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inp}>
                  {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input type={type} value={payForm[key]} onChange={(e) => setPayForm(f => ({ ...f, [key]: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inp} />
              )}
            </FormField>
          ))}
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" className="flex-1" onClick={() => setPayModal(false)}>Discard</Btn>
            <Btn className="flex-1" onClick={handlePay} loading={saving}>Record Payment</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}