/**
 * src/pages/admin/ProductForm.jsx
 * Product Create / Edit Form — Screen 5
 * Handles: name, type, prices, taxes, variants tab, recurring prices tab.
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Save, ArrowLeft, Upload } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { FormField, Btn, Spinner, StatusBadge } from "../../components/common/UI";

const EMPTY_VARIANT = { attribute_id: "", attribute_value_id: "", extra_price: 0 };
const EMPTY_PRICE = { recurring_plan_id: "", price: 0, min_qty: 1, start_date: "", end_date: "" };

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [form, setForm] = useState({ name: "", product_type: "service", sales_price: 0, cost_price: 0, description: "", image_url: "", tax_ids: [] });
  const [variants, setVariants] = useState([]);
  const [recurringPrices, setRecurringPrices] = useState([]);
  const [activeTab, setActiveTab] = useState("recurring_prices");
  const [attrs, setAttrs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadRefs(); if (!isNew) loadProduct(); }, []);

  const loadRefs = async () => {
    const [a, p, t] = await Promise.all([
      api.get("/api/attributes").catch(() => ({ data: [] })),
      api.get("/api/recurring-plans").catch(() => ({ data: [] })),
      api.get("/api/taxes").catch(() => ({ data: [] })),
    ]);
    setAttrs(a.data); setPlans(p.data); setTaxes(t.data);
  };

  const loadProduct = async () => {
    try {
      const r = await api.get(`/api/products/${id}`);
      const p = r.data;
      setForm({ name: p.name, product_type: p.product_type, sales_price: p.sales_price, cost_price: p.cost_price, description: p.description || "", image_url: p.image_url || "", tax_ids: p.taxes?.map(t => t.id) || [] });
      setVariants(p.variants || []);
      setRecurringPrices(p.recurring_prices || []);
    } catch { toast.error("Failed to load product."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Product name is required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, variants, recurring_prices: recurringPrices };
      if (isNew) { const r = await api.post("/api/products", payload); toast.success("Product created."); navigate(`/admin/products/${r.data.product.id}`); }
      else { await api.put(`/api/products/${id}`, payload); toast.success("Product saved."); }
    } catch (e) { toast.error(e.response?.data?.error || "Save failed."); }
    finally { setSaving(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "products");
      const r = await api.post("/api/upload/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(f => ({ ...f, image_url: r.data.url }));
      toast.success("Image uploaded.");
    } catch { toast.error("Upload failed. Check Cloudinary config."); }
    finally { setUploading(false); }
  };

  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };
  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/products")}><ArrowLeft size={14} /> Back</Btn>
        <div className="flex gap-2">
          <Btn onClick={handleSave} loading={saving}><Save size={14} /> Save</Btn>
          {!isNew && <Btn variant="danger" size="sm" onClick={async () => { await api.delete(`/api/products/${id}`); toast.success("Deleted."); navigate("/admin/products"); }}>
            <Trash2 size={14} /> Delete
          </Btn>}
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Product Name" required>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. CRM Software Suite"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Product Type">
            <select value={form.product_type} onChange={(e) => setForm(f => ({ ...f, product_type: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp}>
              <option value="service">Service</option>
              <option value="goods">Goods</option>
            </select>
          </FormField>
          <FormField label="Sales Price">
            <input type="number" value={form.sales_price} onChange={(e) => setForm(f => ({ ...f, sales_price: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Cost Price">
            <input type="number" value={form.cost_price} onChange={(e) => setForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          </FormField>
          <FormField label="Tax">
            <select value={form.tax_ids[0] || ""} onChange={(e) => setForm(f => ({ ...f, tax_ids: e.target.value ? [parseInt(e.target.value)] : [] }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp}>
              <option value="">No Tax</option>
              {taxes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormField>
          <FormField label="Product Image">
            <div className="flex items-center gap-3">
              {form.image_url && <img src={form.image_url} alt="product" className="w-10 h-10 rounded-lg object-cover" />}
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border transition-colors"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                <Upload size={14} />
                {uploading ? "Uploading…" : "Upload Image"}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
          </FormField>
        </div>

        {/* Tab Strip */}
        <div className="border-b" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex">
            {["recurring_prices", "variants"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent"}`}
                style={activeTab !== tab ? { color: "var(--text-muted)" } : {}}>
                {tab === "recurring_prices" ? "Recurring Prices" : "Variants"}
              </button>
            ))}
          </div>
        </div>

        {/* Recurring Prices */}
        {activeTab === "recurring_prices" && (
          <div className="space-y-2">
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Recurring Plan", "Price", "Min Qty", "Start Date", "End Date", ""].map(h =>
                  <th key={h} className="text-left px-2 py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {recurringPrices.map((rp, idx) => (
                  <tr key={idx} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                    <td className="px-2 py-2">
                      <select value={rp.recurring_plan_id} onChange={(e) => setRecurringPrices(r => r.map((x, i) => i === idx ? { ...x, recurring_plan_id: e.target.value } : x))}
                        className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp}>
                        <option value="">— Plan —</option>
                        {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    {["price", "min_qty"].map(k => (
                      <td key={k} className="px-2 py-2 w-20">
                        <input type="number" value={rp[k]} onChange={(e) => setRecurringPrices(r => r.map((x, i) => i === idx ? { ...x, [k]: parseFloat(e.target.value) || 0 } : x))}
                          className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={inp} />
                      </td>
                    ))}
                    {["start_date", "end_date"].map(k => (
                      <td key={k} className="px-2 py-2">
                        <input type="date" value={rp[k] || ""} onChange={(e) => setRecurringPrices(r => r.map((x, i) => i === idx ? { ...x, [k]: e.target.value } : x))}
                          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp} />
                      </td>
                    ))}
                    <td className="px-2 py-2 w-8">
                      <button onClick={() => setRecurringPrices(r => r.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setRecurringPrices(r => [...r, { ...EMPTY_PRICE }])} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1">
              <Plus size={14} /> Add Price
            </button>
          </div>
        )}

        {/* Variants */}
        {activeTab === "variants" && (
          <div className="space-y-2">
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Attribute", "Value", "Extra Price", ""].map(h =>
                  <th key={h} className="text-left px-2 py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {variants.map((v, idx) => (
                  <tr key={idx} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
                    <td className="px-2 py-2">
                      <select value={v.attribute_id} onChange={(e) => setVariants(vs => vs.map((x, i) => i === idx ? { ...x, attribute_id: e.target.value, attribute_value_id: "" } : x))}
                        className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp}>
                        <option value="">— Attribute —</option>
                        {attrs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select value={v.attribute_value_id} onChange={(e) => setVariants(vs => vs.map((x, i) => i === idx ? { ...x, attribute_value_id: e.target.value } : x))}
                        className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp}>
                        <option value="">— Value —</option>
                        {attrs.find(a => a.id === parseInt(v.attribute_id))?.values?.map(val =>
                          <option key={val.id} value={val.id}>{val.value}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2 w-24">
                      <input type="number" value={v.extra_price} onChange={(e) => setVariants(vs => vs.map((x, i) => i === idx ? { ...x, extra_price: parseFloat(e.target.value) || 0 } : x))}
                        className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={inp} />
                    </td>
                    <td className="px-2 py-2 w-8">
                      <button onClick={() => setVariants(vs => vs.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setVariants(vs => [...vs, { ...EMPTY_VARIANT }])} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1">
              <Plus size={14} /> Add Variant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}