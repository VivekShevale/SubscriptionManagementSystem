/**
 * src/pages/admin/TaxForm.jsx - Tax Create/Edit (Admin only)
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { FormField, Btn, Spinner } from "../../components/common/UI";

export default function TaxForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [form, setForm] = useState({ name: "", computation: "percentage", amount: 0 });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  useEffect(() => { if (!isNew) api.get(`/api/taxes/${id}`).then(r => { setForm({ name: r.data.name, computation: r.data.computation, amount: r.data.amount }); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const handleSave = async () => {
    if (!form.name) { toast.error("Tax name is required."); return; }
    setSaving(true);
    try {
      if (isNew) { await api.post("/api/taxes", form); toast.success("Tax created."); navigate("/admin/taxes"); }
      else { await api.put(`/api/taxes/${id}`, form); toast.success("Saved."); }
    } catch (e) { toast.error(e.response?.data?.error || "Save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/taxes")}><ArrowLeft size={14} /> Back</Btn>
        <div className="flex gap-2">
          <Btn onClick={handleSave} loading={saving}><Save size={14} /> Save</Btn>
          {!isNew && <Btn variant="danger" size="sm" onClick={async () => { await api.delete(`/api/taxes/${id}`); toast.success("Deleted."); navigate("/admin/taxes"); }}><Trash2 size={14} /> Delete</Btn>}
        </div>
      </div>
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{isNew ? "New Tax" : "Edit Tax"}</h2>
        <FormField label="Tax Name" required>
          <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. GST 18%" className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
        </FormField>
        <FormField label="Tax Computation">
          <select value={form.computation} onChange={(e) => setForm(f => ({ ...f, computation: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
          </select>
        </FormField>
        <FormField label={form.computation === "percentage" ? "Percentage (%)" : "Fixed Amount (₹)"}>
          <input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
        </FormField>
      </div>
    </div>
  );
}