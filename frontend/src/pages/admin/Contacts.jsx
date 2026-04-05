/**
 * src/pages/admin/Contacts.jsx - Contact/Customer List
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { SearchInput, ConfirmDialog, EmptyState, Spinner, Btn, StatusBadge } from "../../components/common/UI";

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    setFiltered(search ? contacts.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())) : contacts);
  }, [contacts, search]);

  const load = async () => {
    try { const r = await api.get("/api/contacts"); setContacts(r.data); }
    catch { toast.error("Failed to load contacts."); }
    finally { setLoading(false); }
  };
  const handleDelete = async () => {
    for (const id of selected) { try { await api.delete(`/api/contacts/${id}`); } catch {} }
    toast.success("Deleted."); setSelected([]); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Contacts</h1>
        <div className="flex items-center gap-2">
          {selected.length > 0 && <Btn variant="danger" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /> Delete ({selected.length})</Btn>}
          <Btn onClick={() => navigate("/admin/contacts/new")}><Plus size={15} /> New</Btn>
        </div>
      </div>
      <div className="flex justify-end">
        <SearchInput value={search} onChange={setSearch} placeholder="Search contacts…" />
      </div>
      {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
              <th className="px-4 py-3 w-10"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={(e) => setSelected(e.target.checked ? filtered.map(c => c.id) : [])} /></th>
              {["Name", "Email", "Phone", "Address", "Active Subs"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b last:border-0 cursor-pointer transition-colors"
                  style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.includes(c.id)} onChange={() => setSelected(s => s.includes(c.id) ? s.filter(x => x !== c.id) : [...s, c.id])} /></td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }} onClick={() => navigate(`/admin/contacts/${c.id}`)}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold">{c.name?.[0]?.toUpperCase()}</div>
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }} onClick={() => navigate(`/admin/contacts/${c.id}`)}>{c.email}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }} onClick={() => navigate(`/admin/contacts/${c.id}`)}>{c.phone || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }} onClick={() => navigate(`/admin/contacts/${c.id}`)}>{c.address || "—"}</td>
                  <td className="px-4 py-3" onClick={() => navigate(`/admin/subscriptions?customer_id=${c.id}`)}>
                    {c.active_subscriptions > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-200">
                        <RefreshCw size={10} /> {c.active_subscriptions}
                      </span>
                    ) : <span style={{ color: "var(--text-muted)" }}>0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <EmptyState title="No contacts" message="Add customers to create subscriptions." action={<Btn onClick={() => navigate("/admin/contacts/new")}><Plus size={14} /> New Contact</Btn>} />}
        </div>
      )}
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Contacts" message={`Delete ${selected.length} contact(s)?`} />
    </div>
  );
}