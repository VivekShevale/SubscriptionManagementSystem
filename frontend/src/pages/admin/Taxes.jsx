/**
 * src/pages/admin/Taxes.jsx - Admin-only Tax Management
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { EmptyState, Spinner, Btn, StatusBadge, ConfirmDialog } from "../../components/common/UI";

export default function Taxes() {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { api.get("/api/taxes").then(r => setTaxes(r.data)).catch(() => toast.error("Failed.")).finally(() => setLoading(false)); }, []);
  const handleDelete = async () => { for (const id of selected) { try { await api.delete(`/api/taxes/${id}`); } catch {} } toast.success("Deleted."); setSelected([]); api.get("/api/taxes").then(r => setTaxes(r.data)); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Taxes</h1>
        <div className="flex items-center gap-2">
          {selected.length > 0 && <Btn variant="danger" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /> Delete ({selected.length})</Btn>}
          <Btn onClick={() => navigate("/admin/taxes/new")}><Plus size={15} /> New</Btn>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
              <th className="px-4 py-3 w-10"><input type="checkbox" checked={selected.length === taxes.length && taxes.length > 0} onChange={(e) => setSelected(e.target.checked ? taxes.map(t => t.id) : [])} /></th>
              {["Tax Name", "Computation", "Amount"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {taxes.map(t => (
                <tr key={t.id} className="border-b last:border-0 cursor-pointer" style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.includes(t.id)} onChange={() => setSelected(s => s.includes(t.id) ? s.filter(x => x !== t.id) : [...s, t.id])} /></td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }} onClick={() => navigate(`/admin/taxes/${t.id}`)}>{t.name}</td>
                  <td className="px-4 py-3 capitalize" style={{ color: "var(--text-secondary)" }} onClick={() => navigate(`/admin/taxes/${t.id}`)}>{t.computation}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }} onClick={() => navigate(`/admin/taxes/${t.id}`)}>{t.computation === "percentage" ? `${t.amount}%` : `₹${t.amount}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!taxes.length && <EmptyState title="No taxes configured" message="Add tax rules for invoice lines." action={<Btn onClick={() => navigate("/admin/taxes/new")}><Plus size={14} /> New Tax</Btn>} />}
        </div>
      )}
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Taxes" message={`Delete ${selected.length} tax(es)?`} />
    </div>
  );
}