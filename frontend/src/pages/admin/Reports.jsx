/**
 * src/pages/admin/Reports.jsx
 * Reports & Analytics Page
 * Includes: KPI cards, revenue chart, overdue invoices, export buttons.
 */
import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, Receipt, RefreshCw, AlertCircle, Download } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { Card, StatCard, Spinner, Btn, ExportMenu } from "../../components/common/UI";

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/reports/dashboard"),
      api.get("/api/reports/revenue"),
      api.get("/api/reports/overdue-invoices"),
      api.get("/api/reports/payments"),
    ]).then(([s, r, o, p]) => {
      setStats(s.data); setRevenue(r.data); setOverdue(o.data); setPayments(p.data);
    }).catch(() => toast.error("Failed to load reports.")).finally(() => setLoading(false));
  }, []);

  const handleExport = async (section, format) => {
    try {
      const res = await api.get(`/api/reports/${section}?export=${format}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url;
      a.download = `${section}.${format === "excel" ? "xlsx" : format}`; a.click();
    } catch { toast.error("Export failed."); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={36} /></div>;

  const chartTooltipStyle = { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, fontSize: 12, color: "var(--text-primary)" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Reports & Analytics</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Business performance overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Subscriptions" value={stats?.subscriptions?.active ?? 0} icon={RefreshCw} color="#3b82f6" />
        <StatCard label="Total Revenue" value={`₹${((stats?.revenue?.total_revenue ?? 0) / 1000).toFixed(1)}K`} icon={TrendingUp} color="#22c55e" />
        <StatCard label="Paid Invoices" value={stats?.invoices?.paid ?? 0} icon={Receipt} color="#f59e0b" />
        <StatCard label="Overdue Invoices" value={stats?.invoices?.overdue ?? 0} icon={AlertCircle} color="#ef4444" />
      </div>

      {/* Revenue Chart */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Monthly Revenue</h2>
          <ExportMenu onExport={(fmt) => handleExport("revenue", fmt)} />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={revenue} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revG)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Subscription Status Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Subscription Status Breakdown</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={Object.entries(stats?.subscriptions || {}).filter(([k]) => k !== "total").map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Invoice Stats */}
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Invoice Overview</h2>
          </div>
          <div className="space-y-3">
            {[["Total", stats?.invoices?.total, "#64748b"], ["Paid", stats?.invoices?.paid, "#22c55e"], ["Confirmed (Pending)", stats?.invoices?.confirmed, "#f59e0b"], ["Draft", stats?.invoices?.draft, "#94a3b8"], ["Overdue", stats?.invoices?.overdue, "#ef4444"]].map(([label, val, color]) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <span style={{ color: "var(--text-muted)" }}>{val ?? 0}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "var(--bg-secondary)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${stats?.invoices?.total ? ((val || 0) / stats.invoices.total) * 100 : 0}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue Invoices Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-color)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Overdue Invoices</h2>
          <ExportMenu onExport={(fmt) => handleExport("overdue-invoices", fmt)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
              {["Invoice #", "Customer", "Due Date", "Amount Due", "Days Overdue"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {overdue.slice(0, 10).map(inv => {
                const daysOverdue = inv.due_date ? Math.floor((new Date() - new Date(inv.due_date)) / 86400000) : 0;
                return (
                  <tr key={inv.id} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                    <td className="px-4 py-3 font-mono text-blue-500">{inv.invoice_number}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{inv.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-red-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 font-medium text-red-500">₹{(inv.amount_due || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600">{daysOverdue} days</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!overdue.length && <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>🎉 No overdue invoices!</div>}
        </div>
      </div>
    </div>
  );
}