import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { EmptyState, Spinner, Btn, ConfirmDialog } from "../../components/common/UI";
export default function Attributes() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  useEffect(() => { api.get("/api/attributes").then(r => setItems(r.data)).catch(() => toast.error("Failed.")).finally(() => setLoading(false)); }, []);
  const handleDelete = async () => { for (const id of selected) { try { await api.delete(`/api/attributes/${id}`); } catch {} } toast.success("Deleted."); setSelected([]); api.get("/api/attributes").then(r => setItems(r.data)); };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Attributes / Variants</h1><div className="flex items-center gap-2">{selected.length > 0 && <Btn variant="danger" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /> Delete ({selected.length})</Btn>}<Btn onClick={() => navigate("/admin/attributes/new")}><Plus size={15} /> New</Btn></div></div>
      {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : (
        <div className="space-y-4">
          {items.map(a => (
            <div key={a.id} className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3"><input type="checkbox" checked={selected.includes(a.id)} onChange={() => setSelected(s => s.includes(a.id) ? s.filter(x => x !== a.id) : [...s, a.id])} /><h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{a.name}</h3></div>
                <Btn variant="secondary" size="sm" onClick={() => navigate(`/admin/attributes/${a.id}`)}>Edit</Btn>
              </div>
              <div className="flex flex-wrap gap-2">{a.values?.map(v => (<span key={v.id} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}>{v.value} {v.default_extra_price > 0 && <span className="text-green-500">+₹{v.default_extra_price}</span>}</span>))}</div>
            </div>
          ))}
          {!items.length && <EmptyState title="No attributes" message="Add product attributes like Brand, Color, Size." action={<Btn onClick={() => navigate("/admin/attributes/new")}><Plus size={14} /> New Attribute</Btn>} />}
        </div>
      )}
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Attributes" message={`Delete ${selected.length} attribute(s)?`} />
    </div>
  );
}