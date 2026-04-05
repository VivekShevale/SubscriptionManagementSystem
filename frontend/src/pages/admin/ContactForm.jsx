/**
 * src/pages/admin/ContactForm.jsx - Contact Create/Edit
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { FormField, Btn, Spinner } from "../../components/common/UI";

export default function ContactForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "", country: "" });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  useEffect(() => {
    if (!isNew) api.get(`/api/contacts/${id}`).then(r => { setForm({ name: r.data.name, email: r.data.email, phone: r.data.phone || "", address: r.data.address || "", city: r.data.city || "", country: r.data.country || "" }); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error("Name and email are required."); return; }
    setSaving(true);
    try {
      if (isNew) { const r = await api.post("/api/contacts", form); toast.success("Contact created."); navigate(`/admin/contacts/${r.data.contact.id}`); }
      else { await api.put(`/api/contacts/${id}`, form); toast.success("Saved."); }
    } catch (e) { toast.error(e.response?.data?.error || "Save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/contacts")}><ArrowLeft size={14} /> Back</Btn>
        <div className="flex gap-2">
          <Btn onClick={handleSave} loading={saving}><Save size={14} /> Save</Btn>
          {!isNew && <Btn variant="danger" size="sm" onClick={async () => { await api.delete(`/api/contacts/${id}`); toast.success("Deleted."); navigate("/admin/contacts"); }}><Trash2 size={14} /> Delete</Btn>}
        </div>
      </div>
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{isNew ? "New Contact" : "Edit Contact"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[["name", "Name", "text", true], ["email", "Email", "email", true], ["phone", "Phone", "tel", false], ["address", "Address", "text", false], ["city", "City", "text", false], ["country", "Country", "text", false]].map(([key, label, type, req]) => (
            <FormField key={key} label={label} required={req}>
              <input type={type} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={label} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
            </FormField>
          ))}
        </div>
      </div>
    </div>
  );
}