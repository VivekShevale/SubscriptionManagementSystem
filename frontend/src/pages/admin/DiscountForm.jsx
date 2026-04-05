/**
 * src/pages/admin/DiscountForm.jsx - Discount Create/Edit (Admin only)
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { FormField, Btn, Spinner } from "../../components/common/UI";

export default function DiscountForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [form, setForm] = useState({ name: "", discount_type: "percentage", value: 0, min_purchase: 0, min_quantity: 1, start_date: "", end_date: "", limit_usage: false, usage_limit: "", product_ids: [] });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  useEffect(() => {
    api.get("/api/products").then(r => setProducts(r.data)).catch(() => {});
    if (!isNew) api.get(`/api/discounts/${id}`).then(r => { const d = r.data; setForm({ name: d.name, discount_type: d.discount_type, value: d.value, min_purchase: d.min_purchase, min_quantity: d.min_quantity, start_date: d.start_date || "", end_date: d.end_date || "", limit_usage: d.limit_usage, usage_limit: d.usage_limit || "", product_ids: d.products?.map(p => p.id) || [] }); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name) { toast.error("Discount name is required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null };
      if (isNew) { await api.post("/api/discounts", payload); toast.success("Discount created."); navigate("/admin/discounts"); }
      else { await api.put(`/api/discounts/${id}`, payload); toast.success("Saved."); }
    } catch (e) { toast.error(e.response?.data?.error || "Save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/discounts")}><ArrowLeft size={14} /> Back</Btn>
        <div className="flex gap-2">
          <Btn onClick={handleSave} loading={saving}><Save size={14} /> Save</Btn>
          {!isNew && <Btn variant="danger" size="sm" onClick={async () => { await api.delete(`/api/discounts/${id}`); toast.success("Deleted."); navigate("/admin/discounts"); }}><Trash2 size={14} /> Delete</Btn>}
        </div>
      </div>
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{isNew ? "New Discount" : "Edit Discount"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Discount Name" required>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. WELCOME10" className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Discount Type">
            <select value={form.discount_type} onChange={(e) => setForm(f => ({ ...f, discount_type: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Price (₹)</option>
            </select>
          </FormField>
          <FormField label={form.discount_type === "percentage" ? "Discount %" : "Discount Amount (₹)"}>
            <input type="number" value={form.value} onChange={(e) => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Minimum Purchase (₹)">
            <input type="number" value={form.min_purchase} onChange={(e) => setForm(f => ({ ...f, min_purchase: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Minimum Quantity">
            <input type="number" value={form.min_quantity} min="1" onChange={(e) => setForm(f => ({ ...f, min_quantity: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Start Date">
            <input type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="End Date">
            <input type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Applicable Products" hint="Leave empty to apply to all products">
            <select multiple value={form.product_ids.map(String)} onChange={(e) => setForm(f => ({ ...f, product_ids: Array.from(e.target.selectedOptions, o => parseInt(o.value)) }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 h-24" style={inp}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input type="checkbox" id="limit_usage" checked={form.limit_usage} onChange={(e) => setForm(f => ({ ...f, limit_usage: e.target.checked }))} className="w-4 h-4 rounded" />
          <label htmlFor="limit_usage" className="text-sm" style={{ color: "var(--text-secondary)" }}>Limit Usage</label>
          {form.limit_usage && (
            <input type="number" value={form.usage_limit} onChange={(e) => setForm(f => ({ ...f, usage_limit: e.target.value }))} placeholder="Max uses" className="px-3 py-1.5 rounded-xl text-sm outline-none w-28" style={inp} />
          )}
        </div>
      </div>
    </div>
  );
}