/**
 * src/pages/admin/Dashboard.jsx
 * Admin Dashboard
 * ----------------
 * KPI stats (subscriptions, revenue, invoices, contacts, products),
 * Monthly revenue chart (Recharts), recent subscriptions list.
 * GSAP staggered card entrance animations.
 */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import {
  RefreshCw, Receipt, TrendingUp, AlertCircle,
  Users, Package, CheckCircle, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import api from "../../configs/api";
import { StatusBadge, Card, Spinner } from "../../components/common/UI";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [recentSubs, setRecentSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const cardsRef = useRef([]);

  useEffect(() => {
    loadData();
  }, []);

  // GSAP stagger on cards after data loads
  useEffect(() => {
    if (!loading && cardsRef.current.length) {
      gsap.fromTo(
        cardsRef.current.filter(Boolean),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power2.out" }
      );
    }
  }, [loading]);

  const loadData = async () => {
    try {
      const [statsRes, revenueRes, subsRes] = await Promise.all([
        api.get("/api/reports/dashboard"),
        api.get("/api/reports/revenue"),
        api.get("/api/subscriptions?limit=8"),
      ]);
      setStats(statsRes.data);
      setRevenue(revenueRes.data);
      setRecentSubs(subsRes.data.slice(0, 8));
    } catch {
      // Silently handle — stats will remain null
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={36} />
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Active Subscriptions",
      value: stats?.subscriptions?.active ?? 0,
      icon: RefreshCw,
      color: "#3b82f6",
      sub: `${stats?.subscriptions?.total ?? 0} total`,
    },
    {
      label: "Monthly Revenue",
      value: `₹${((stats?.revenue?.monthly_revenue ?? 0) / 1000).toFixed(1)}K`,
      icon: TrendingUp,
      color: "#22c55e",
      sub: `₹${((stats?.revenue?.total_revenue ?? 0) / 1000).toFixed(1)}K all time`,
    },
    {
      label: "Confirmed Invoices",
      value: stats?.invoices?.confirmed ?? 0,
      icon: Receipt,
      color: "#f59e0b",
      sub: `${stats?.invoices?.paid ?? 0} paid`,
    },
    {
      label: "Overdue Invoices",
      value: stats?.invoices?.overdue ?? 0,
      icon: AlertCircle,
      color: "#ef4444",
      sub: "Require attention",
    },
    {
      label: "Total Contacts",
      value: stats?.contacts?.total ?? 0,
      icon: Users,
      color: "#8b5cf6",
      sub: `${stats?.contacts?.active ?? 0} active customers`,
    },
    {
      label: "Quotations",
      value: stats?.subscriptions?.quotation ?? 0,
      icon: Clock,
      color: "#06b6d4",
      sub: "Pending confirmation",
    },
    {
      label: "Closed Subscriptions",
      value: stats?.subscriptions?.closed ?? 0,
      icon: CheckCircle,
      color: "#64748b",
      sub: "Churned",
    },
    {
      label: "Total Products",
      value: stats?.products?.total ?? 0,
      icon: Package,
      color: "#f97316",
      sub: "In catalog",
    },
  ];

  const STATUS_COL_MAP = {
    draft: "#94a3b8",
    quotation: "#f59e0b",
    quotation_sent: "#f97316",
    confirmed: "#3b82f6",
    active: "#22c55e",
    closed: "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Overview of your subscription business
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div
            key={card.label}
            ref={(el) => (cardsRef.current[i] = el)}
            className="rounded-2xl p-5 transition-all hover:shadow-md cursor-default"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl" style={{ background: card.color + "18" }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {card.value}
            </div>
            <div className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {card.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Recent Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Area Chart */}
        <div
          className="lg:col-span-3 rounded-2xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Monthly Revenue (Last 12 Months)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
                formatter={(v) => [`₹${v.toLocaleString()}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2}
                fill="url(#revGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription Status Breakdown */}
        <div
          className="lg:col-span-2 rounded-2xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Subscription Status
          </h2>
          <div className="space-y-3">
            {Object.entries(stats?.subscriptions || {}).filter(([k]) => k !== "total").map(([status, count]) => {
              const pct = stats?.subscriptions?.total
                ? Math.round((count / stats.subscriptions.total) * 100)
                : 0;
              const color = STATUS_COL_MAP[status] || "#94a3b8";
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize font-medium" style={{ color: "var(--text-secondary)" }}>
                      {status.replace(/_/g, " ")}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => navigate("/admin/subscriptions")}
            className="mt-5 w-full py-2 rounded-xl text-sm font-medium transition-all hover:bg-blue-600 hover:text-white border"
            style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
          >
            View All Subscriptions →
          </button>
        </div>
      </div>

      {/* Recent Subscriptions */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border-color)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Recent Subscriptions</h2>
          <button onClick={() => navigate("/admin/subscriptions")}
            className="text-sm text-blue-500 hover:text-blue-600 transition-colors">
            View all →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                {["Number", "Customer", "Plan", "Next Invoice", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSubs.map((sub) => (
                <tr
                  key={sub.id}
                  onClick={() => navigate(`/admin/subscriptions/${sub.id}`)}
                  className="border-b last:border-0 cursor-pointer transition-colors"
                  style={{ borderColor: "var(--border-color)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}
                >
                  <td className="px-4 py-3 font-mono font-medium text-blue-500">{sub.subscription_number}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{sub.customer_name || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{sub.plan_name || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                    {sub.next_invoice_date ? new Date(sub.next_invoice_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recentSubs.length && (
            <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No subscriptions yet. <button onClick={() => navigate("/admin/subscriptions/new")} className="text-blue-500 hover:underline">Create one →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}