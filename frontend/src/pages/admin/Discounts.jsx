import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { EmptyState, Spinner, Btn, StatusBadge, ConfirmDialog } from "../../components/common/UI";
export default function Discounts() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  useEffect(() => { api.get("/api/discounts").then(r => setItems(r.data)).catch(() => toast.error("Failed.")).finally(() => setLoading(false)); }, []);
  const handleDelete = async () => { for (const id of selected) { try { await api.delete(`/api/discounts/${id}`); } catch {} } toast.success("Deleted."); setSelected([]); api.get("/api/discounts").then(r => setItems(r.data)); };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Discounts</h1><div className="flex items-center gap-2">{selected.length > 0 && <Btn variant="danger" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /> Delete ({selected.length})</Btn>}<Btn onClick={() => navigate("/admin/discounts/new")}><Plus size={15} /> New</Btn></div></div>
      {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table className="w-full text-sm"><thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}><th className="px-4 py-3 w-10"><input type="checkbox" checked={selected.length === items.length && items.length > 0} onChange={(e) => setSelected(e.target.checked ? items.map(i => i.id) : [])} /></th>{["Name","Type","Value","Min Purchase","Start","End","Usage"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>)}</tr></thead>
          <tbody>{items.map(d => (<tr key={d.id} className="border-b last:border-0 cursor-pointer" style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}><td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.includes(d.id)} onChange={() => setSelected(s => s.includes(d.id) ? s.filter(x => x !== d.id) : [...s, d.id])} /></td><td className="px-4 py-3 font-mono font-semibold text-blue-500" onClick={() => navigate(`/admin/discounts/${d.id}`)}>{d.name}</td><td className="px-4 py-3 capitalize" style={{ color: "var(--text-secondary)" }}>{d.discount_type}</td><td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{d.discount_type === "percentage" ? `${d.value}%` : `₹${d.value}`}</td><td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>₹{d.min_purchase}</td><td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{d.start_date || "—"}</td><td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{d.end_date || "—"}</td><td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{d.limit_usage ? `${d.usage_count}/${d.usage_limit}` : "∞"}</td></tr>))}</tbody></table>
          {!items.length && <EmptyState title="No discounts" message="Create discount codes for your customers." action={<Btn onClick={() => navigate("/admin/discounts/new")}><Plus size={14} /> New Discount</Btn>} />}
        </div>
      )}
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Discounts" message={`Delete ${selected.length} discount(s)?`} />
    </div>
  );
}