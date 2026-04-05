/**
 * src/pages/portal/OrderDetail.jsx - Order Detail Page (Screen 6)
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, RefreshCw, XCircle, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { StatusBadge, Spinner } from "../../components/common/UI";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api.get(`/api/portal/orders/${id}`)
      .then(r => setOrder(r.data))
      .catch(() => toast.error("Failed to load order."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRenew = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/api/portal/orders/${id}/renew`);
      toast.success("Subscription renewed!");
      navigate(`/portal/orders/${res.data.subscription.id}`);
    } catch (e) { toast.error(e.response?.data?.error || "Renew failed."); }
    finally { setActionLoading(false); }
  };

  const handleClose = async () => {
    if (!window.confirm("Are you sure you want to close this subscription?")) return;
    setActionLoading(true);
    try {
      await api.post(`/api/portal/orders/${id}/close`);
      toast.success("Subscription closed.");
      api.get(`/api/portal/orders/${id}`).then(r => setOrder(r.data));
    } catch (e) { toast.error(e.response?.data?.error || "Close failed."); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;
  if (!order) return <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>Order not found.</div>;

  const total = order.order_lines?.reduce((s, l) => s + (l.amount || 0), 0) || 0;
  const taxAmt = total * 0.18;
  const grandTotal = total + taxAmt;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
        <button onClick={() => navigate("/portal/orders")} className="hover:text-blue-500 transition-colors">Orders</button>
        <ChevronRight size={14} />
        <span style={{ color: "var(--text-primary)" }}>{order.subscription_number}</span>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xl" style={{ color: "var(--text-primary)" }}>{order.subscription_number}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-black/5" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
            <Download size={14} /> Download
          </button>
          {order.status !== "closed" && (
            <>
              {order.plan?.is_renewable !== false && (
                <button onClick={handleRenew} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60">
                  <RefreshCw size={14} /> Renew
                </button>
              )}
              {order.plan?.is_closable !== false && (
                <button onClick={handleClose} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                  <XCircle size={14} /> Close
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Subscription Block */}
      <div className="rounded-2xl p-5 space-y-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Your Subscription</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[["Plan", order.plan_name || "—"], ["Start Date", order.start_date ? new Date(order.start_date).toLocaleDateString() : "—"], ["Next Invoice", order.next_invoice_date ? new Date(order.next_invoice_date).toLocaleDateString() : "—"]].map(([label, value]) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
              <div className="font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Last Invoices */}
      {order.invoices?.length > 0 && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Invoices</h2>
          {order.invoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:text-blue-500 transition-colors"
              style={{ borderColor: "var(--border-color)" }}
              onClick={() => navigate(`/portal/orders/${id}/invoices/${inv.id}`)}>
              <span className="font-mono text-sm text-blue-500 hover:underline">{inv.invoice_number}</span>
              <StatusBadge status={inv.status} />
            </div>
          ))}
        </div>
      )}

      {/* Products */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Products</h2>
        </div>
        <table className="w-full text-sm">
          <thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
            {["Product Name", "Qty", "Unit Price", "Tax", "Amount"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {order.order_lines?.map(line => (
              <tr key={line.id} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{line.product_name}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{line.quantity}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>₹{(line.unit_price || 0).toLocaleString()}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{line.taxes?.map(t => t.name).join(", ") || "—"}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>₹{(line.amount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-4 border-t" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex justify-end">
            <div className="min-w-52 space-y-1.5 text-sm">
              <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Subtotal</span><span>₹{total.toFixed(2)}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Tax (18%)</span><span>₹{taxAmt.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                <span>Total</span><span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}