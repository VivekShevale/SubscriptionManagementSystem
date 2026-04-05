/**
 * src/pages/admin/Subscriptions.jsx
 * Subscriptions List Page
 * ------------------------
 * Lists all subscriptions with: subscription #, customer, next invoice,
 * recurring amount, plan, status. Supports search and status filter.
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import {
  StatusBadge, SearchInput, ConfirmDialog,
  EmptyState, Spinner, Btn, ExportMenu,
} from "../../components/common/UI";

const STATUS_TABS = ["all", "draft", "quotation", "quotation_sent", "confirmed", "active", "closed"];

export default function Subscriptions() {
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const tableRef = useRef(null);

  useEffect(() => { loadSubs(); }, []);

  useEffect(() => {
    let result = subs;
    if (activeTab !== "all") result = result.filter((s) => s.status === activeTab);
    if (search) result = result.filter((s) =>
      s.subscription_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_name?.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [subs, activeTab, search]);

  useEffect(() => {
    if (!loading && tableRef.current) {
      gsap.fromTo(tableRef.current.querySelectorAll("tr"),
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.25, stagger: 0.03, ease: "power1.out" }
      );
    }
  }, [loading, filtered]);

  const loadSubs = async () => {
    try {
      const res = await api.get("/api/subscriptions");
      setSubs(res.data);
    } catch { toast.error("Failed to load subscriptions."); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    for (const id of selected) {
      try { await api.delete(`/api/subscriptions/${id}`); }
      catch { /* individual errors silently skipped */ }
    }
    toast.success("Selected subscriptions deleted.");
    setSelected([]);
    loadSubs();
  };

  const handleExport = async (format) => {
    try {
      const res = await api.get(`/api/reports/subscriptions?export=${format}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url;
      a.download = `subscriptions.${format === "excel" ? "xlsx" : format}`;
      a.click();
    } catch { toast.error("Export failed."); }
  };

  const toggleSelect = (id) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const lineTotal = (sub) => {
    if (!sub.order_lines?.length) return 0;
    return sub.order_lines.reduce((acc, l) => acc + (l.amount || 0), 0);
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Subscriptions</h1>
        <div className="flex items-center gap-2">
          <ExportMenu onExport={handleExport} />
          {selected.length > 0 && (
            <Btn variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={14} /> Delete ({selected.length})
            </Btn>
          )}
          <Btn onClick={() => navigate("/admin/subscriptions/new")}>
            <Plus size={15} /> New
          </Btn>
        </div>
      </div>

      {/* Status tabs + search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={activeTab !== tab ? { color: "var(--text-secondary)" } : {}}>
              {tab.replace(/_/g, " ")}
              {tab !== "all" && (
                <span className="ml-1.5 opacity-70">
                  {subs.filter((s) => s.status === tab).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search subscriptions…" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table ref={tableRef} className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? filtered.map((s) => s.id) : [])}
                    className="rounded" />
                </th>
                {["Number", "Customer", "Next Invoice", "Recurring", "Plan", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr key={sub.id}
                  className="border-b last:border-0 cursor-pointer transition-colors"
                  style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(sub.id)}
                      onChange={() => toggleSelect(sub.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-500"
                    onClick={() => navigate(`/admin/subscriptions/${sub.id}`)}>
                    {sub.subscription_number}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}
                    onClick={() => navigate(`/admin/subscriptions/${sub.id}`)}>
                    {sub.customer_name || <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}
                    onClick={() => navigate(`/admin/subscriptions/${sub.id}`)}>
                    {sub.next_invoice_date
                      ? new Date(sub.next_invoice_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}
                    onClick={() => navigate(`/admin/subscriptions/${sub.id}`)}>
                    {lineTotal(sub) > 0 ? `₹${lineTotal(sub).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}
                    onClick={() => navigate(`/admin/subscriptions/${sub.id}`)}>
                    {sub.plan_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sub.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <EmptyState
              title="No subscriptions found"
              message="Create a new subscription to get started."
              action={
                <Btn onClick={() => navigate("/admin/subscriptions/new")}>
                  <Plus size={14} /> New Subscription
                </Btn>
              }
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Subscriptions"
        message={`Delete ${selected.length} selected subscription(s)? Only draft subscriptions can be deleted.`}
      />
    </div>
  );
}