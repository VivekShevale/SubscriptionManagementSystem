/**
 * src/pages/admin/Invoices.jsx
 * Invoice List Page — Screen Invoice List
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { StatusBadge, SearchInput, ConfirmDialog, EmptyState, Spinner, Btn } from "../../components/common/UI";

const TABS = ["all", "draft", "confirmed", "paid", "cancelled"];

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    let r = tab !== "all" ? invoices.filter(i => i.status === tab) : invoices;
    if (search) r = r.filter(i => i.invoice_number?.toLowerCase().includes(search.toLowerCase()) || i.customer_name?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(r);
  }, [invoices, tab, search]);

  const load = async () => {
    try { const r = await api.get("/api/invoices"); setInvoices(r.data); }
    catch { toast.error("Failed to load invoices."); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    for (const id of selected) { try { await api.delete(`/api/invoices/${id}`); } catch {} }
    toast.success("Deleted."); setSelected([]); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Invoices</h1>
        <div className="flex items-center gap-2">
          {selected.length > 0 && <Btn variant="danger" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /> Delete ({selected.length})</Btn>}
          <Btn onClick={() => navigate("/admin/invoices/new")}><Plus size={15} /> New</Btn>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${tab === t ? "bg-blue-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
              style={tab !== t ? { color: "var(--text-secondary)" } : {}}>{t}</button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoices…" />
      </div>
      {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
              <th className="px-4 py-3 w-10"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={(e) => setSelected(e.target.checked ? filtered.map(i => i.id) : [])} /></th>
              {["Invoice #", "Customer", "Invoice Date", "Due Date", "Total", "Amount Due", "Status"].map(h =>
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b last:border-0 cursor-pointer transition-colors"
                  style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(inv.id)} onChange={() => setSelected(s => s.includes(inv.id) ? s.filter(x => x !== inv.id) : [...s, inv.id])} />
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-500" onClick={() => navigate(`/admin/invoices/${inv.id}`)}>{inv.invoice_number}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>{inv.customer_name || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>₹{(inv.total || 0).toLocaleString()}</td>
                  <td className="px-4 py-3" style={{ color: inv.amount_due > 0 ? "var(--danger)" : "var(--success)" }} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>₹{(inv.amount_due || 0).toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <EmptyState title="No invoices" message="Invoices are generated from subscriptions." action={<Btn onClick={() => navigate("/admin/subscriptions")}>Go to Subscriptions</Btn>} />}
        </div>
      )}
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Invoices" message={`Delete ${selected.length} invoice(s)?`} />
    </div>
  );
}