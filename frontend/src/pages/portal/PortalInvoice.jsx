/**
 * src/pages/portal/PortalInvoice.jsx - Customer Invoice Page (Screen 7)
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, CreditCard, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { StatusBadge, Spinner, Modal, FormField } from "../../components/common/UI";

export default function PortalInvoice() {
  const { id: orderId, invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ payment_method: "online", amount: 0, payment_date: new Date().toISOString().split("T")[0] });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.get(`/api/portal/invoices/${invoiceId}`)
      .then(r => { setInvoice(r.data); setPayForm(f => ({ ...f, amount: r.data.amount_due })); })
      .catch(() => toast.error("Failed to load invoice."))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const handlePay = async () => {
    setPaying(true);
    try {
      await api.post("/api/payments", { ...payForm, invoice_id: parseInt(invoiceId) });
      toast.success("Payment recorded.");
      setPayModal(false);
      api.get(`/api/portal/invoices/${invoiceId}`).then(r => setInvoice(r.data));
    } catch (e) { toast.error(e.response?.data?.error || "Payment failed."); }
    finally { setPaying(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;
  if (!invoice) return <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>Invoice not found.</div>;

  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
        <button onClick={() => navigate("/portal/orders")} className="hover:text-blue-500 transition-colors">Orders</button>
        <ChevronRight size={14} />
        <button onClick={() => navigate(`/portal/orders/${orderId}`)} className="hover:text-blue-500 transition-colors">Order</button>
        <ChevronRight size={14} />
        <span style={{ color: "var(--text-primary)" }}>{invoice.invoice_number}</span>
      </div>

      {/* Upper Section */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-xl" style={{ color: "var(--text-primary)" }}>{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="text-sm space-y-0.5">
              <div style={{ color: "var(--text-muted)" }}>Invoice Date: <span style={{ color: "var(--text-secondary)" }}>{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : "—"}</span></div>
              <div style={{ color: "var(--text-muted)" }}>Due Date: <span style={{ color: "var(--text-secondary)" }}>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}</span></div>
              {invoice.subscription_number && <div style={{ color: "var(--text-muted)" }}>Source: <span className="text-blue-500 font-mono">{invoice.subscription_number}</span></div>}
            </div>
          </div>
          <div className="space-y-2">
            {invoice.customer_name && (
              <div className="text-right">
                <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{invoice.customer_name}</div>
              </div>
            )}
            <div className="flex items-center gap-2">
              {invoice.amount_due > 0 && invoice.status !== "paid" && (
                <button onClick={() => setPayModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                  <CreditCard size={14} /> Pay Now
                </button>
              )}
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-black/5" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                <Download size={14} /> Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section — Products + Totals */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <table className="w-full text-sm">
          <thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
            {["Product Name", "Qty", "Unit Price", "Tax", "Amount"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {invoice.lines?.map(line => (
              <tr key={line.id} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{line.product_name || line.description}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{line.quantity}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>₹{(line.unit_price || 0).toLocaleString()}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{line.taxes?.map(t => `${t.name}`).join(", ") || "—"}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>₹{(line.amount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="px-4 py-4 border-t" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex justify-end">
            <div className="min-w-60 space-y-1.5 text-sm">
              <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Subtotal</span><span>₹{(invoice.subtotal || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Tax</span><span>₹{(invoice.tax_amount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                <span>Total</span><span>₹{(invoice.total || 0).toFixed(2)}</span>
              </div>
              {invoice.amount_paid > 0 && <div className="flex justify-between text-green-500"><span>Paid</span><span>-₹{invoice.amount_paid.toFixed(2)}</span></div>}
              <div className="flex justify-between font-semibold" style={{ color: invoice.amount_due > 0 ? "var(--danger)" : "var(--success)" }}>
                <span>Amount Due</span><span>₹{(invoice.amount_due || 0).toFixed(2)}</span>
              </div>
              {invoice.status === "paid" && <div className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>Payment Term: Immediate Payment</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Make Payment" width="max-w-sm">
        <div className="space-y-4">
          <FormField label="Payment Method">
            <select value={payForm.payment_method} onChange={(e) => setPayForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inp}>
              <option value="online">Online</option>
              <option value="cash">Cash</option>
            </select>
          </FormField>
          <FormField label="Amount (₹)">
            <input type="number" value={payForm.amount} onChange={(e) => setPayForm(f => ({ ...f, amount: parseFloat(e.target.value) }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inp} />
          </FormField>
          <FormField label="Payment Date">
            <input type="date" value={payForm.payment_date} onChange={(e) => setPayForm(f => ({ ...f, payment_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inp} />
          </FormField>
          <div className="flex gap-3">
            <button onClick={() => setPayModal(false)} className="flex-1 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-black/5" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>Discard</button>
            <button onClick={handlePay} disabled={paying} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60">
              {paying ? "Processing…" : "Pay"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}