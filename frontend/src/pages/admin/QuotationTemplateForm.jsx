/**
 * src/pages/admin/QuotationTemplateForm.jsx - Quotation Template Create/Edit (Screen 10)
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { FormField, Btn, Spinner } from "../../components/common/UI";

export default function QuotationTemplateForm() {
  const { id } = useParams(); const navigate = useNavigate(); const isNew = !id;
  const [form, setForm] = useState({ name: "", validity_days: 30, recurring_plan_id: "", last_forever: false, end_after_count: "", end_after_unit: "month" });
  const [lines, setLines] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(!isNew); const [saving, setSaving] = useState(false);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  useEffect(() => {
    Promise.all([api.get("/api/recurring-plans").catch(() => ({ data: [] })), api.get("/api/products").catch(() => ({ data: [] }))]).then(([p, pr]) => { setPlans(p.data); setProducts(pr.data); });
    if (!isNew) api.get(`/api/quotation-templates/${id}`).then(r => {
      const t = r.data;
      setForm({ name: t.name, validity_days: t.validity_days, recurring_plan_id: t.recurring_plan_id || "", last_forever: t.last_forever, end_after_count: t.end_after_count || "", end_after_unit: t.end_after_unit || "month" });
      setLines(t.lines || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name) { toast.error("Template name is required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, lines };
      if (isNew) { await api.post("/api/quotation-templates", payload); toast.success("Template created."); navigate("/admin/quotation-templates"); }
      else { await api.put(`/api/quotation-templates/${id}`, payload); toast.success("Saved."); }
    } catch (e) { toast.error(e.response?.data?.error || "Save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/quotation-templates")}><ArrowLeft size={14} /> Back</Btn>
        <div className="flex gap-2">
          <Btn onClick={handleSave} loading={saving}><Save size={14} /> Save</Btn>
          {!isNew && <Btn variant="danger" size="sm" onClick={async () => { await api.delete(`/api/quotation-templates/${id}`); toast.success("Deleted."); navigate("/admin/quotation-templates"); }}><Trash2 size={14} /></Btn>}
        </div>
      </div>
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Template Name" required>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. SaaS Starter Pack" className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Quotation Validity (days)">
            <input type="number" value={form.validity_days} onChange={(e) => setForm(f => ({ ...f, validity_days: parseInt(e.target.value) || 30 }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Recurring Plan">
            <select value={form.recurring_plan_id} onChange={(e) => setForm(f => ({ ...f, recurring_plan_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp}>
              <option value="">— None —</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <div className="flex flex-col gap-3 justify-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.last_forever} onChange={(e) => setForm(f => ({ ...f, last_forever: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Last Forever</span>
            </label>
          </div>
          {!form.last_forever && (
            <>
              <FormField label="End After">
                <input type="number" value={form.end_after_count} onChange={(e) => setForm(f => ({ ...f, end_after_count: e.target.value }))} placeholder="e.g. 12" className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
              </FormField>
              <FormField label="End After Unit">
                <select value={form.end_after_unit} onChange={(e) => setForm(f => ({ ...f, end_after_unit: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp}>
                  <option value="week">Week(s)</option>
                  <option value="month">Month(s)</option>
                  <option value="year">Year(s)</option>
                </select>
              </FormField>
            </>
          )}
        </div>

        <div>
          <div className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Product Lines</div>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
              {["Product", "Description", "Quantity", ""].map(h => <th key={h} className="text-left px-2 py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                  <td className="px-2 py-2 min-w-[160px]">
                    <select value={line.product_id || ""} onChange={(e) => setLines(ls => ls.map((x, i) => i === idx ? { ...x, product_id: parseInt(e.target.value) || "" } : x))} className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp}>
                      <option value="">— Product —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input value={line.description || ""} onChange={(e) => setLines(ls => ls.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} placeholder="Description" className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp} />
                  </td>
                  <td className="px-2 py-2 w-16">
                    <input type="number" value={line.quantity || 1} min="1" onChange={(e) => setLines(ls => ls.map((x, i) => i === idx ? { ...x, quantity: parseFloat(e.target.value) || 1 } : x))} className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={inp} />
                  </td>
                  <td className="px-2 py-2 w-8"><button onClick={() => setLines(ls => ls.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setLines(ls => [...ls, { product_id: "", description: "", quantity: 1 }])} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-2"><Plus size={14} /> Add Product</button>
        </div>
      </div>
    </div>
  );
}