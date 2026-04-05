/**
 * src/pages/admin/RecurringPlanForm.jsx
 * Recurring Plan Create / Edit — Screen 9
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { FormField, Btn, Spinner } from "../../components/common/UI";

export default function RecurringPlanForm() {
  const { id } = useParams(); const navigate = useNavigate(); const isNew = !id;
  const [form, setForm] = useState({ name: "", billing_period: "monthly", billing_period_count: 1, auto_close_period: "", auto_close_unit: "month", is_closable: true, is_pausable: false, is_renewable: true });
  const [planProducts, setPlanProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(!isNew); const [saving, setSaving] = useState(false);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  useEffect(() => {
    api.get("/api/products").then(r => setProducts(r.data)).catch(() => {});
    if (!isNew) api.get(`/api/recurring-plans/${id}`).then(r => {
      const p = r.data;
      setForm({ name: p.name, billing_period: p.billing_period, billing_period_count: p.billing_period_count, auto_close_period: p.auto_close_period || "", auto_close_unit: p.auto_close_unit || "month", is_closable: p.is_closable, is_pausable: p.is_pausable, is_renewable: p.is_renewable });
      setPlanProducts(p.plan_products || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name) { toast.error("Plan name is required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, plan_products: planProducts };
      if (isNew) { await api.post("/api/recurring-plans", payload); toast.success("Plan created."); navigate("/admin/recurring-plans"); }
      else { await api.put(`/api/recurring-plans/${id}`, payload); toast.success("Saved."); }
    } catch (e) { toast.error(e.response?.data?.error || "Save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const CheckOption = ({ label, field }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={form[field]} onChange={(e) => setForm(f => ({ ...f, [field]: e.target.checked }))} className="w-4 h-4 rounded" />
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
    </label>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/recurring-plans")}><ArrowLeft size={14} /> Back</Btn>
        <div className="flex gap-2">
          <Btn onClick={handleSave} loading={saving}><Save size={14} /> Save</Btn>
          {!isNew && <Btn variant="danger" size="sm" onClick={async () => { await api.delete(`/api/recurring-plans/${id}`); toast.success("Deleted."); navigate("/admin/recurring-plans"); }}><Trash2 size={14} /></Btn>}
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <FormField label="Plan Name" required>
          <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly Basic" className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Billing Period Count">
            <input type="number" min="1" value={form.billing_period_count} onChange={(e) => setForm(f => ({ ...f, billing_period_count: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Billing Period">
            <select value={form.billing_period} onChange={(e) => setForm(f => ({ ...f, billing_period: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp}>
              {["daily", "weekly", "monthly", "yearly"].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Auto Close After (optional)">
            <input type="number" min="1" value={form.auto_close_period} onChange={(e) => setForm(f => ({ ...f, auto_close_period: e.target.value }))} placeholder="e.g. 12" className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Auto Close Unit">
            <select value={form.auto_close_unit} onChange={(e) => setForm(f => ({ ...f, auto_close_unit: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp}>
              <option value="month">Month(s)</option>
              <option value="year">Year(s)</option>
            </select>
          </FormField>
        </div>

        <div className="flex items-center gap-6">
          <CheckOption label="Closable" field="is_closable" />
          <CheckOption label="Pausable" field="is_pausable" />
          <CheckOption label="Renewable" field="is_renewable" />
        </div>

        {/* Plan Products Table */}
        <div>
          <div className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Plan Products</div>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
              {["Product", "Price", "Min Qty", ""].map(h => <th key={h} className="text-left px-2 py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {planProducts.map((pp, idx) => (
                <tr key={idx} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                  <td className="px-2 py-2">
                    <select value={pp.product_id || ""} onChange={(e) => setPlanProducts(ps => ps.map((x, i) => i === idx ? { ...x, product_id: parseInt(e.target.value) || "" } : x))} className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp}>
                      <option value="">— Product —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 w-24"><input type="number" value={pp.price || 0} onChange={(e) => setPlanProducts(ps => ps.map((x, i) => i === idx ? { ...x, price: parseFloat(e.target.value) || 0 } : x))} className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={inp} /></td>
                  <td className="px-2 py-2 w-16"><input type="number" value={pp.min_qty || 1} min="1" onChange={(e) => setPlanProducts(ps => ps.map((x, i) => i === idx ? { ...x, min_qty: parseInt(e.target.value) || 1 } : x))} className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={inp} /></td>
                  <td className="px-2 py-2 w-8"><button onClick={() => setPlanProducts(ps => ps.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setPlanProducts(ps => [...ps, { product_id: "", price: 0, min_qty: 1 }])} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-2"><Plus size={14} /> Add Product</button>
        </div>
      </div>
    </div>
  );
}