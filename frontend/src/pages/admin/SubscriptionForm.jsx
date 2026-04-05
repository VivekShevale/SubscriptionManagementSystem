/**
 * src/pages/admin/SubscriptionForm.jsx
 * Subscription Create / Edit Form
 * --------------------------------
 * 3-view form matching the spec:
 *  View 1 (draft/quotation):        basic fields + order lines + order info
 *  View 2 (quotation_sent):         preview, cancel, renew, upsell, close
 *  View 3 (confirmed/active/closed): same as view 2 but order lines locked
 * Status header buttons change with each state.
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Plus, Trash2, Save, Send, CheckCircle, Eye, RefreshCw,
  TrendingUp, XCircle, Receipt, ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { selectCurrentUser } from "../../store/slices/authSlice";
import {
  StatusBadge, Modal, Btn, FormField, Input, Select, Spinner,
} from "../../components/common/UI";

const EMPTY_LINE = { product_id: "", variant_id: "", quantity: 1, unit_price: 0, discount_pct: 0, tax_ids: [] };

export default function SubscriptionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const isNew = !id;

  const [form, setForm] = useState({
    customer_id: "", plan_id: "", quotation_template_id: "",
    payment_term_id: "", salesperson_id: currentUser?.id || "",
    expiration_date: "", start_date: "", payment_method: "",
    payment_done: false, notes: "",
  });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [activeTab, setActiveTab] = useState("order_lines"); // order_lines | order_info
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [contacts, setContacts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [users, setUsers] = useState([]);

  // Modal states
  const [paymentTermModal, setPaymentTermModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [payForm, setPayForm] = useState({ payment_method: "cash", amount: 0, payment_date: new Date().toISOString().split("T")[0] });

  useEffect(() => { loadRefs(); }, []);
  useEffect(() => { if (!isNew) loadSub(); }, [id]);

  const loadRefs = async () => {
    const [portalUsers, p, t, pt, prod, tax, internalUsers] = await Promise.all([
      api.get("/api/users/portal-users").catch(() => ({ data: [] })),
      api.get("/api/recurring-plans").catch(() => ({ data: [] })),
      api.get("/api/quotation-templates").catch(() => ({ data: [] })),
      api.get("/api/payment-terms").catch(() => ({ data: [] })),
      api.get("/api/products").catch(() => ({ data: [] })),
      api.get("/api/taxes").catch(() => ({ data: [] })),
      api.get("/api/users/internal-users").catch(() => ({ data: [] })),
    ]);
    // Convert portal users to contact-like shape for the customer dropdown
    setContacts(portalUsers.data.map(u => ({
      id: u.contact_id,
      name: u.contact_name,
      email: u.email,
      _user_id: u.id,
    })));
    setPlans(p.data);
    setTemplates(t.data);
    setProducts(prod.data);
    setTaxes(tax.data);
    setPaymentTerms(pt.data);
    setUsers(internalUsers.data);
  };

  const loadSub = async () => {
    try {
      const res = await api.get(`/api/subscriptions/${id}`);
      const s = res.data;
      setSub(s);
      setForm({
        customer_id: s.customer_id || "",
        plan_id: s.plan_id || "",
        quotation_template_id: s.quotation_template_id || "",
        payment_term_id: s.payment_term_id || "",
        salesperson_id: s.salesperson_id || "",
        expiration_date: s.expiration_date || "",
        start_date: s.start_date || "",
        payment_method: s.payment_method || "",
        payment_done: s.payment_done || false,
        notes: s.notes || "",
      });
      setLines(s.order_lines?.length ? s.order_lines.map((l) => ({
        id: l.id,
        product_id: l.product_id || "",
        variant_id: l.variant_id || "",
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_pct: l.discount_pct,
        tax_ids: l.taxes?.map((t) => t.id) || [],
      })) : [{ ...EMPTY_LINE }]);
    } catch { toast.error("Failed to load subscription."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, order_lines: lines };
      if (isNew) {
        const res = await api.post("/api/subscriptions", payload);
        toast.success("Subscription created.");
        navigate(`/admin/subscriptions/${res.data.subscription.id}`);
      } else {
        await api.put(`/api/subscriptions/${id}`, payload);
        toast.success("Subscription saved.");
        loadSub();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed.");
    } finally { setSaving(false); }
  };

  const handleAction = async (action) => {
    setSaving(true);
    try {
      await api.post(`/api/subscriptions/${id}/${action}`);
      toast.success(`Subscription ${action.replace("-", " ")} successful.`);
      loadSub();
    } catch (err) {
      toast.error(err.response?.data?.error || `${action} failed.`);
    } finally { setSaving(false); }
  };

  const handleCreateInvoice = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/api/subscriptions/${id}/create-invoice`);
      toast.success("Invoice created.");
      navigate(`/admin/invoices/${res.data.invoice.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Invoice creation failed.");
    } finally { setSaving(false); }
  };

  const handlePayment = async () => {
    if (!sub?.invoices?.length) { toast.error("No invoice found."); return; }
    const invoice = sub.invoices.find((i) => i.status === "confirmed") || sub.invoices[0];
    setSaving(true);
    try {
      await api.post("/api/payments", { ...payForm, invoice_id: invoice.id });
      toast.success("Payment recorded.");
      setPaymentModal(false);
      loadSub();
    } catch (err) {
      toast.error(err.response?.data?.error || "Payment failed.");
    } finally { setSaving(false); }
  };

  const updateLine = (idx, key, value) =>
    setLines((ls) => ls.map((l, i) => i === idx ? { ...l, [key]: value } : l));

  const autoFillPrice = (idx, productId) => {
    const product = products.find((p) => p.id === parseInt(productId));
    if (product) updateLine(idx, "unit_price", product.sales_price);
  };

  const applyTemplate = (templateId) => {
    if (!templateId) {
      // Clear template selection — reset lines to blank
      setForm(f => ({ ...f, quotation_template_id: "" }));
      return;
    }
    const tmpl = templates.find((t) => t.id === parseInt(templateId));
    if (!tmpl) return;

    // Build expiration date from validity_days
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + (tmpl.validity_days || 30));
    const expDateStr = expDate.toISOString().split("T")[0];

    // Auto-fill order lines from template lines
    const newLines = tmpl.lines && tmpl.lines.length > 0
      ? tmpl.lines.map((l) => {
          const product = products.find((p) => p.id === l.product_id);
          return {
            product_id: l.product_id || "",
            variant_id: "",
            quantity: l.quantity || 1,
            unit_price: product?.sales_price || 0,
            discount_pct: 0,
            tax_ids: product?.taxes?.map(t => t.id) || [],
          };
        })
      : [{ ...EMPTY_LINE }];

    setForm(f => ({
      ...f,
      quotation_template_id: templateId,
      plan_id: tmpl.recurring_plan_id || f.plan_id,
      expiration_date: expDateStr,
    }));
    setLines(newLines);
    toast.success(`Template "${tmpl.name}" applied — ${newLines.length} line(s) loaded`);
  };

  const lineAmount = (l) => {
    const base = (l.quantity || 0) * (l.unit_price || 0);
    return base - base * (l.discount_pct || 0) / 100;
  };

  const totalAmount = lines.reduce((s, l) => s + lineAmount(l), 0);

  const isLocked = ["confirmed", "active", "closed"].includes(sub?.status);
  const status = sub?.status || "draft";

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const inputStyle = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header Actions Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/subscriptions")}>
            <ArrowLeft size={14} /> Back
          </Btn>
          {!isNew && <span className="font-mono font-semibold text-blue-500 text-lg">{sub?.subscription_number}</span>}
          {sub && <StatusBadge status={sub.status} />}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Btn variant="secondary" size="sm" onClick={handleSave} loading={saving}>
            <Save size={14} /> Save
          </Btn>

          {/* View 1 actions: draft / quotation */}
          {["draft", "quotation"].includes(status) && (
            <>
              <Btn size="sm" onClick={() => handleAction("send")} loading={saving}>
                <Send size={14} /> Send
              </Btn>
              <Btn variant="success" size="sm" onClick={() => handleAction("confirm")} loading={saving}>
                <CheckCircle size={14} /> Confirm
              </Btn>
            </>
          )}

          {/* View 2 actions: quotation_sent */}
          {status === "quotation_sent" && (
            <>
              <Btn size="sm" onClick={() => handleAction("send")}>
                <Send size={14} /> Resend
              </Btn>
              <Btn variant="success" size="sm" onClick={() => handleAction("confirm")}>
                <CheckCircle size={14} /> Confirm
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => window.open(`/portal/orders/${id}`, "_blank")}>
                <Eye size={14} /> Preview
              </Btn>
            </>
          )}

          {/* View 3 actions: confirmed / active */}
          {["confirmed", "active"].includes(status) && (
            <>
              <Btn variant="success" size="sm" onClick={handleCreateInvoice} loading={saving}>
                <Receipt size={14} /> Create Invoice
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => handleAction("renew")}>
                <RefreshCw size={14} /> Renew
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => navigate(`/admin/subscriptions/new`)}>
                <TrendingUp size={14} /> Upsell
              </Btn>
              <Btn variant="danger" size="sm" onClick={() => handleAction("close")}>
                <XCircle size={14} /> Close
              </Btn>
            </>
          )}
        </div>
      </div>

      {/* Main Form Card */}
      <div className="rounded-2xl p-6 space-y-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>

        {/* Top fields grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Customer (Portal Users)" required>
            <select value={form.customer_id} onChange={(e) => setForm(f => ({ ...f, customer_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={inputStyle}>
              <option value="">— Select Customer —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          </FormField>

          <FormField label="Quotation Template" className="sm:col-span-2">
            <div className="flex gap-2 items-center">
              <select
                value={form.quotation_template_id}
                onChange={(e) => applyTemplate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                style={inputStyle}
                disabled={isLocked}
              >
                <option value="">— None —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.validity_days}d validity{t.recurring_plan_name ? ` · ${t.recurring_plan_name}` : ""})</option>)}
              </select>
              {form.quotation_template_id && !isLocked && (
                <button
                  type="button"
                  onClick={() => applyTemplate(form.quotation_template_id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap transition-colors"
                  title="Re-apply template (overwrites current lines)"
                >
                  Re-apply
                </button>
              )}
            </div>
            {form.quotation_template_id && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                ✓ Template applied — order lines, recurring plan and expiration date have been pre-filled. You can still edit them below.
              </p>
            )}
          </FormField>

          <FormField label="Expiration Date">
            <input type="date" value={form.expiration_date}
              onChange={(e) => setForm(f => ({ ...f, expiration_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={inputStyle} />
          </FormField>

          <FormField label="Recurring Plan">
            <select value={form.plan_id} onChange={(e) => setForm(f => ({ ...f, plan_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={inputStyle}>
              <option value="">— Select Plan —</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>

          <FormField label="Payment Terms">
            <select value={form.payment_term_id} onChange={(e) => setForm(f => ({ ...f, payment_term_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              style={inputStyle}>
              <option value="">— Select Terms —</option>
              {paymentTerms.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
            </select>
          </FormField>

          {sub?.next_invoice_date && (
            <FormField label="Next Invoice">
              <input type="date" value={sub.next_invoice_date || ""}
                readOnly className="w-full px-3 py-2 rounded-xl text-sm" style={{ ...inputStyle, opacity: 0.7 }} />
            </FormField>
          )}
        </div>

        {/* Tab Strip */}
        <div className="border-b" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex gap-0">
            {["order_lines", "order_info"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                  activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent"
                }`}
                style={activeTab !== tab ? { color: "var(--text-muted)" } : {}}>
                {tab === "order_lines" ? "Order Lines" : "Order Info"}
              </button>
            ))}
          </div>
        </div>

        {/* Order Lines Tab */}
        {activeTab === "order_lines" && (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {["Product", "Qty", "Unit Price", "Discount %", "Taxes", "Amount", ""].map((h) => (
                      <th key={h} className="text-left px-2 py-2 text-xs font-medium"
                        style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                      <td className="px-2 py-2 min-w-[180px]">
                        <select value={line.product_id} disabled={isLocked}
                          onChange={(e) => { updateLine(idx, "product_id", e.target.value); autoFillPrice(idx, e.target.value); }}
                          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500/30"
                          style={inputStyle}>
                          <option value="">— Product —</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2 w-16">
                        <input type="number" value={line.quantity} min="1" disabled={isLocked}
                          onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none focus:ring-1 focus:ring-blue-500/30"
                          style={inputStyle} />
                      </td>
                      <td className="px-2 py-2 w-24">
                        <input type="number" value={line.unit_price} min="0" disabled={isLocked}
                          onChange={(e) => updateLine(idx, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none focus:ring-1 focus:ring-blue-500/30"
                          style={inputStyle} />
                      </td>
                      <td className="px-2 py-2 w-20">
                        <input type="number" value={line.discount_pct} min="0" max="100" disabled={isLocked}
                          onChange={(e) => updateLine(idx, "discount_pct", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none focus:ring-1 focus:ring-blue-500/30"
                          style={inputStyle} />
                      </td>
                      <td className="px-2 py-2 min-w-[120px]">
                        <select value={line.tax_ids[0] || ""} disabled={isLocked}
                          onChange={(e) => updateLine(idx, "tax_ids", e.target.value ? [parseInt(e.target.value)] : [])}
                          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500/30"
                          style={inputStyle}>
                          <option value="">No Tax</option>
                          {taxes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2 w-24 text-right font-medium" style={{ color: "var(--text-primary)" }}>
                        ₹{lineAmount(line).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 w-8">
                        {!isLocked && (
                          <button onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
                            className="p-1 rounded text-red-400 hover:text-red-600 transition-colors"
                            disabled={lines.length === 1}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isLocked && (
              <button onClick={() => setLines((ls) => [...ls, { ...EMPTY_LINE }])}
                className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors mt-1">
                <Plus size={14} /> Add Line
              </button>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="min-w-48 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                  <span style={{ color: "var(--text-primary)" }}>₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base border-t pt-1.5"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                  <span>Total</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Info Tab */}
        {activeTab === "order_info" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Salesperson (Internal Users)">
              <select value={form.salesperson_id}
                onChange={(e) => setForm(f => ({ ...f, salesperson_id: e.target.value }))}
                disabled={currentUser?.role !== "admin"}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                style={inputStyle}>
                <option value="">— Select —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.login_id} ({u.role})</option>)}
              </select>
            </FormField>

            <FormField label="Start Date">
              <input type="date" value={form.start_date}
                onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                style={inputStyle} />
            </FormField>

            <FormField label="Payment Method">
              <select value={form.payment_method}
                onChange={(e) => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                style={inputStyle}>
                <option value="">— Select —</option>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="razorpay">Razorpay</option>
              </select>
            </FormField>

            <FormField label="Payment Done">
              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" checked={form.payment_done}
                  onChange={(e) => setForm(f => ({ ...f, payment_done: e.target.checked }))}
                  className="w-4 h-4 rounded" id="payment_done" />
                <label htmlFor="payment_done" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Mark as payment done
                </label>
              </div>
            </FormField>

            <FormField label="Notes" className="sm:col-span-2">
              <textarea value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3} placeholder="Internal notes…"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500/30"
                style={inputStyle} />
            </FormField>
          </div>
        )}
      </div>

      {/* Linked Invoices (if any) */}
      {sub?.invoices?.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>Linked Invoices</h3>
          <div className="space-y-2">
            {sub.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "var(--border-color)" }}>
                <button onClick={() => navigate(`/admin/invoices/${inv.id}`)}
                  className="font-mono text-sm text-blue-500 hover:underline">
                  {inv.invoice_number}
                </button>
                <StatusBadge status={inv.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pay Invoice Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Record Payment" width="max-w-sm">
        <div className="space-y-4">
          <FormField label="Payment Method">
            <select value={payForm.payment_method}
              onChange={(e) => setPayForm(f => ({ ...f, payment_method: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </FormField>
          <FormField label="Amount">
            <input type="number" value={payForm.amount}
              onChange={(e) => setPayForm(f => ({ ...f, amount: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </FormField>
          <FormField label="Payment Date">
            <input type="date" value={payForm.payment_date}
              onChange={(e) => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" className="flex-1" onClick={() => setPaymentModal(false)}>Discard</Btn>
            <Btn className="flex-1" onClick={handlePayment} loading={saving}>Record Payment</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}