/**
 * src/pages/admin/Products.jsx
 * Products List Page — Screen 4
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { SearchInput, ConfirmDialog, EmptyState, Spinner, Btn, ExportMenu } from "../../components/common/UI";

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    setFiltered(search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : products);
  }, [products, search]);

  const load = async () => {
    try { const r = await api.get("/api/products"); setProducts(r.data); }
    catch { toast.error("Failed to load products."); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    for (const id of selected) { try { await api.delete(`/api/products/${id}`); } catch {} }
    toast.success("Products deleted."); setSelected([]); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Products</h1>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <Btn variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={14} /> Delete ({selected.length})
            </Btn>
          )}
          <Btn onClick={() => navigate("/admin/products/new")}><Plus size={15} /> New</Btn>
        </div>
      </div>

      <div className="flex justify-end">
        <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? filtered.map(p => p.id) : [])} />
                </th>
                {["Product Name", "Type", "Sales Price", "Cost"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 cursor-pointer transition-colors"
                  style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() =>
                      setSelected(s => s.includes(p.id) ? s.filter(x => x !== p.id) : [...s, p.id])} />
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}
                    onClick={() => navigate(`/admin/products/${p.id}`)}>
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 text-xs font-bold">
                          {p.name[0]}
                        </div>
                      )}
                      {p.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: "var(--text-secondary)" }}
                    onClick={() => navigate(`/admin/products/${p.id}`)}>{p.product_type}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}
                    onClick={() => navigate(`/admin/products/${p.id}`)}>₹{p.sales_price?.toLocaleString()}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}
                    onClick={() => navigate(`/admin/products/${p.id}`)}>₹{p.cost_price?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <EmptyState title="No products" message="Add your first product."
              action={<Btn onClick={() => navigate("/admin/products/new")}><Plus size={14} /> New Product</Btn>} />
          )}
        </div>
      )}
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        title="Delete Products" message={`Deactivate ${selected.length} product(s)?`} />
    </div>
  );
}