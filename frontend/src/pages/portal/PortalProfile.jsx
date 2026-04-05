/**
 * src/pages/portal/PortalProfile.jsx - Portal User Profile (Screen 8)
 */
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Save, User } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { selectCurrentUser } from "../../store/slices/authSlice";
import { FormField, Btn, StatusBadge } from "../../components/common/UI";

export default function PortalProfile() {
  const currentUser = useSelector(selectCurrentUser);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", country: "" });
  const [saving, setSaving] = useState(false);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  useEffect(() => {
    api.get("/api/portal/profile").then(r => {
      if (r.data.contact) setForm({ name: r.data.contact.name || "", phone: r.data.contact.phone || "", address: r.data.contact.address || "", city: r.data.contact.city || "", country: r.data.contact.country || "" });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await api.put("/api/portal/profile", form); toast.success("Profile updated."); }
    catch { toast.error("Failed to update profile."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>My Profile</h1>
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {currentUser?.login_id?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="font-bold" style={{ color: "var(--text-primary)" }}>{currentUser?.login_id}</div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>{currentUser?.email}</div>
            <StatusBadge status={currentUser?.role} />
          </div>
        </div>
        <div className="space-y-4">
          {[["name", "Full Name", "text"], ["phone", "Phone Number", "tel"], ["address", "Address", "text"], ["city", "City", "text"], ["country", "Country", "text"]].map(([key, label, type]) => (
            <FormField key={key} label={label}>
              <input type={type} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={label} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
            </FormField>
          ))}
          <div className="flex justify-end pt-2">
            <Btn onClick={handleSave} loading={saving}><Save size={14} /> Save Profile</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}