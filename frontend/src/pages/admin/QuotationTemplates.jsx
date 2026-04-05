/**
 * src/pages/admin/QuotationTemplates.jsx - Quotation Template List
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { EmptyState, Spinner, Btn, ConfirmDialog } from "../../components/common/UI";

export default function QuotationTemplates() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { api.get("/api/quotation-templates").then(r => setItems(r.data)).catch(() => toast.error("Failed.")).finally(() => setLoading(false)); }, []);
  const handleDelete = async () => {
    for (const id of selected) { try { await api.delete(`/api/quotation-templates/${id}`); } catch {} }
    toast.success("Deleted."); setSelected([]); api.get("/api/quotation-templates").then(r => setItems(r.data));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Quotation Templates</h1>
        <div className="flex items-center gap-2">
          {selected.length > 0 && <Btn variant="danger" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /> Delete ({selected.length})</Btn>}
          <Btn onClick={() => navigate("/admin/quotation-templates/new")}><Plus size={15} /> New</Btn>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
              <th className="px-4 py-3 w-10"><input type="checkbox" checked={selected.length === items.length && items.length > 0} onChange={(e) => setSelected(e.target.checked ? items.map(i => i.id) : [])} /></th>
              {["Template Name", "Validity (days)", "Recurring Plan", "Products", "Last Forever"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id} className="border-b last:border-0 cursor-pointer" style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.includes(t.id)} onChange={() => setSelected(s => s.includes(t.id) ? s.filter(x => x !== t.id) : [...s, t.id])} /></td>
                  <td className="px-4 py-3 font-medium text-blue-500" onClick={() => navigate(`/admin/quotation-templates/${t.id}`)}>{t.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{t.validity_days} days</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{t.recurring_plan_name || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{t.lines?.length || 0} products</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.last_forever ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{t.last_forever ? "Yes" : "No"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <EmptyState title="No quotation templates" message="Templates speed up subscription creation." action={<Btn onClick={() => navigate("/admin/quotation-templates/new")}><Plus size={14} /> New Template</Btn>} />}
        </div>
      )}
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Templates" message={`Delete ${selected.length} template(s)?`} />
    </div>
  );
}