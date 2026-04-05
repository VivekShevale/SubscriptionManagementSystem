import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { EmptyState, Spinner, Btn, ConfirmDialog } from "../../components/common/UI";
export default function RecurringPlans() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  useEffect(() => { api.get("/api/recurring-plans").then(r => setItems(r.data)).catch(() => toast.error("Failed.")).finally(() => setLoading(false)); }, []);
  const handleDelete = async () => { for (const id of selected) { try { await api.delete(`/api/recurring-plans/${id}`); } catch {} } toast.success("Deleted."); setSelected([]); api.get("/api/recurring-plans").then(r => setItems(r.data)); };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Recurring Plans</h1><div className="flex items-center gap-2">{selected.length > 0 && <Btn variant="danger" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /> Delete ({selected.length})</Btn>}<Btn onClick={() => navigate("/admin/recurring-plans/new")}><Plus size={15} /> New</Btn></div></div>
      {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table className="w-full text-sm"><thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}><th className="px-4 py-3 w-10"><input type="checkbox" checked={selected.length === items.length && items.length > 0} onChange={(e) => setSelected(e.target.checked ? items.map(i => i.id) : [])} /></th>{["Plan Name","Billing Period","Closable","Pausable","Renewable","Active Subs"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>)}</tr></thead>
          <tbody>{items.map(p => (<tr key={p.id} className="border-b last:border-0 cursor-pointer" style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}><td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.includes(p.id)} onChange={() => setSelected(s => s.includes(p.id) ? s.filter(x => x !== p.id) : [...s, p.id])} /></td><td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }} onClick={() => navigate(`/admin/recurring-plans/${p.id}`)}>{p.name}</td><td className="px-4 py-3 capitalize" style={{ color: "var(--text-secondary)" }} onClick={() => navigate(`/admin/recurring-plans/${p.id}`)}>{p.billing_period_count} {p.billing_period}</td><td className="px-4 py-3" onClick={() => navigate(`/admin/recurring-plans/${p.id}`)}><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_closable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{p.is_closable ? "Yes" : "No"}</span></td><td className="px-4 py-3" onClick={() => navigate(`/admin/recurring-plans/${p.id}`)}><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_pausable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{p.is_pausable ? "Yes" : "No"}</span></td><td className="px-4 py-3" onClick={() => navigate(`/admin/recurring-plans/${p.id}`)}><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_renewable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{p.is_renewable ? "Yes" : "No"}</span></td><td className="px-4 py-3" onClick={() => navigate(`/admin/subscriptions?plan_id=${p.id}`)}><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 cursor-pointer"><RefreshCw size={10} /> {p.active_subscriptions}</span></td></tr>))}</tbody></table>
          {!items.length && <EmptyState title="No recurring plans" message="Create billing plans for your subscriptions." action={<Btn onClick={() => navigate("/admin/recurring-plans/new")}><Plus size={14} /> New Plan</Btn>} />}
        </div>
      )}
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Plans" message={`Delete ${selected.length} plan(s)?`} />
    </div>
  );
}