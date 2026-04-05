/**
 * src/pages/portal/Orders.jsx - Customer Orders List (Screen 5)
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { Spinner, StatusBadge } from "../../components/common/UI";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/portal/orders").then(r => setOrders(r.data))
      .catch(() => toast.error("Failed to load orders."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>My Orders</h1>
      {!orders.length ? (
        <div className="flex flex-col items-center py-20 text-center">
          <ClipboardList size={48} className="mb-4 text-gray-300" />
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>No orders yet</h2>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-muted)" }}>Visit our shop to subscribe to products.</p>
          <button onClick={() => navigate("/portal/shop")} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Browse Shop</button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
              {["Order", "Order Date", "Plan", "Status", "Total"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {orders.map(order => {
                const total = order.order_lines?.reduce((s, l) => s + (l.amount || 0), 0) || 0;
                return (
                  <tr key={order.id} onClick={() => navigate(`/portal/orders/${order.id}`)}
                    className="border-b last:border-0 cursor-pointer transition-colors"
                    style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-500">{order.subscription_number}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{order.order_date ? new Date(order.order_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{order.plan_name || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>₹{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}