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
  Users, Package, CheckCircle, Clock, Printer,
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
  const dashboardRef = useRef(null);

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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN');
    
    // Get current stats for print
    const currentStats = stats || {};
    const currentRevenue = revenue || [];
    const currentSubs = recentSubs || [];
    
    const styles = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          padding: 40px 20px;
          background: white;
          color: #333;
        }
        
        .print-container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #3b82f6;
        }
        
        .print-header h1 {
          color: #3b82f6;
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        .print-header p {
          color: #666;
          font-size: 14px;
          margin-top: 5px;
        }
        
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .kpi-card {
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 20px;
          background: #f9fafb;
        }
        
        .kpi-value {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
          margin: 10px 0 5px;
        }
        
        .kpi-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }
        
        .kpi-sub {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 5px;
        }
        
        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .chart-container {
          margin: 20px 0;
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        
        .stat-item {
          padding: 10px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .stat-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 5px;
        }
        
        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
        }
        
        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 5px;
        }
        
        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        
        th {
          background: #f3f4f6;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }
        
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .print-footer {
          margin-top: 40px;
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #9ca3af;
        }
        
        @media print {
          body {
            padding: 0;
            margin: 0;
          }
          
          .no-print {
            display: none;
          }
        }
      </style>
    `;
    
    const getStatusColor = (status) => {
      const colors = {
        draft: '#94a3b8',
        quotation: '#f59e0b',
        quotation_sent: '#f97316',
        confirmed: '#3b82f6',
        active: '#22c55e',
        closed: '#ef4444'
      };
      return colors[status] || '#94a3b8';
    };
    
    const getStatusBadgeStyle = (status) => {
      const color = getStatusColor(status);
      return `background: ${color}15; color: ${color}; border: 1px solid ${color}30;`;
    };
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admin Dashboard Report - ${dateStr}</title>
        ${styles}
      </head>
      <body>
        <div class="print-container">
          <div class="print-header">
            <h1>📊 Admin Dashboard Report</h1>
            <p>Generated on: ${dateStr} at ${timeStr}</p>
          </div>
          
          <div class="section">
            <h2 class="section-title">Key Performance Indicators</h2>
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label">Active Subscriptions</div>
                <div class="kpi-value">${currentStats?.subscriptions?.active ?? 0}</div>
                <div class="kpi-sub">${currentStats?.subscriptions?.total ?? 0} total</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Monthly Revenue</div>
                <div class="kpi-value">₹${((currentStats?.revenue?.monthly_revenue ?? 0) / 1000).toFixed(1)}K</div>
                <div class="kpi-sub">₹${((currentStats?.revenue?.total_revenue ?? 0) / 1000).toFixed(1)}K all time</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Confirmed Invoices</div>
                <div class="kpi-value">${currentStats?.invoices?.confirmed ?? 0}</div>
                <div class="kpi-sub">${currentStats?.invoices?.paid ?? 0} paid</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Overdue Invoices</div>
                <div class="kpi-value">${currentStats?.invoices?.overdue ?? 0}</div>
                <div class="kpi-sub">Require attention</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Total Contacts</div>
                <div class="kpi-value">${currentStats?.contacts?.total ?? 0}</div>
                <div class="kpi-sub">${currentStats?.contacts?.active ?? 0} active customers</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Quotations</div>
                <div class="kpi-value">${currentStats?.subscriptions?.quotation ?? 0}</div>
                <div class="kpi-sub">Pending confirmation</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Closed Subscriptions</div>
                <div class="kpi-value">${currentStats?.subscriptions?.closed ?? 0}</div>
                <div class="kpi-sub">Churned</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Total Products</div>
                <div class="kpi-value">${currentStats?.products?.total ?? 0}</div>
                <div class="kpi-sub">In catalog</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Subscription Status Distribution</h2>
            <div class="stats-grid">
              ${Object.entries(currentStats?.subscriptions || {})
                .filter(([k]) => k !== "total")
                .map(([status, count]) => {
                  const pct = currentStats?.subscriptions?.total
                    ? Math.round((count / currentStats.subscriptions.total) * 100)
                    : 0;
                  return `
                    <div class="stat-item">
                      <div class="stat-label" style="text-transform: capitalize;">${status.replace(/_/g, " ")}</div>
                      <div class="stat-value">${count} (${pct}%)</div>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${pct}%; background: ${getStatusColor(status)}"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Monthly Revenue Trend</h2>
            <div class="chart-container">
              <table style="width: 100%;">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Revenue (₹)</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  ${currentRevenue.map(item => `
                    <tr>
                      <td>${item.month}</td>
                      <td>₹${item.revenue.toLocaleString()}</td>
                      <td>${item.revenue > 0 ? '📈' : '📉'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Recent Subscriptions</h2>
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Next Invoice</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${currentSubs.map(sub => `
                  <tr>
                    <td style="font-family: monospace;">${sub.subscription_number}</td>
                    <td>${sub.customer_name || "—"}</td>
                    <td>${sub.plan_name || "—"}</td>
                    <td>${sub.next_invoice_date ? new Date(sub.next_invoice_date).toLocaleDateString() : "—"}</td>
                    <td>
                      <span class="status-badge" style="${getStatusBadgeStyle(sub.status)}">
                        ${sub.status?.replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                  </tr>
                `).join('')}
                ${currentSubs.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">No subscriptions found</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          
          <div class="print-footer">
            <p>This is a system-generated dashboard report. For any queries, please contact the administrator.</p>
            <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
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
    <div ref={dashboardRef} className="space-y-6">
      {/* Page title with Print Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Overview of your subscription business
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
          }}
        >
          <Printer size={16} /> Print Dashboard
        </button>
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