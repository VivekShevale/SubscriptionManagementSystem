import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { FormField, Btn, Spinner } from "../../components/common/UI";
export default function AttributeForm() {
  const { id } = useParams(); const navigate = useNavigate(); const isNew = !id;
  const [name, setName] = useState(""); const [values, setValues] = useState([{ value: "", default_extra_price: 0 }]);
  const [loading, setLoading] = useState(!isNew); const [saving, setSaving] = useState(false);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };
  useEffect(() => { if (!isNew) api.get(`/api/attributes/${id}`).then(r => { setName(r.data.name); setValues(r.data.values?.length ? r.data.values.map(v => ({ id: v.id, value: v.value, default_extra_price: v.default_extra_price })) : [{ value: "", default_extra_price: 0 }]); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const handleSave = async () => {
    if (!name) { toast.error("Attribute name is required."); return; }
    setSaving(true);
    try {
      if (isNew) { await api.post("/api/attributes", { name, values }); toast.success("Attribute created."); navigate("/admin/attributes"); }
      else { await api.put(`/api/attributes/${id}`, { name, values }); toast.success("Saved."); }
    } catch (e) { toast.error(e.response?.data?.error || "Save failed."); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/attributes")}><ArrowLeft size={14} /> Back</Btn>
        <div className="flex gap-2"><Btn onClick={handleSave} loading={saving}><Save size={14} /> Save</Btn>{!isNew && <Btn variant="danger" size="sm" onClick={async () => { await api.delete(`/api/attributes/${id}`); toast.success("Deleted."); navigate("/admin/attributes"); }}><Trash2 size={14} /></Btn>}</div>
      </div>
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <FormField label="Attribute Name" required>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brand, Color, Storage" className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
        </FormField>
        <div>
          <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Attribute Values</span></div>
          <table className="w-full text-sm"><thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}><th className="text-left px-2 py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Value</th><th className="text-left px-2 py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Default Extra Price (₹)</th><th className="w-8"></th></tr></thead>
          <tbody>{values.map((v, idx) => (
            <tr key={idx} className="border-b last:border-0" style={{ borderColor: "var(--border-color)" }}>
              <td className="px-2 py-2"><input value={v.value} onChange={(e) => setValues(vs => vs.map((x, i) => i === idx ? { ...x, value: e.target.value } : x))} placeholder="e.g. Odoo" className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inp} /></td>
              <td className="px-2 py-2"><input type="number" value={v.default_extra_price} onChange={(e) => setValues(vs => vs.map((x, i) => i === idx ? { ...x, default_extra_price: parseFloat(e.target.value) || 0 } : x))} className="w-full px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={inp} /></td>
              <td className="px-2 py-2"><button onClick={() => setValues(vs => vs.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600" disabled={values.length === 1}><Trash2 size={13} /></button></td>
            </tr>
          ))}</tbody></table>
          <button onClick={() => setValues(vs => [...vs, { value: "", default_extra_price: 0 }])} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-2"><Plus size={14} /> Add Value</button>
        </div>
      </div>
    </div>
  );
}