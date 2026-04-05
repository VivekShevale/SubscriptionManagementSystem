/**
 * src/pages/admin/AdminProfile.jsx - Admin/Internal User Profile Page
 */
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff, Save, User } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { selectCurrentUser, updateUser } from "../../store/slices/authSlice";
import { FormField, Btn, StatusBadge } from "../../components/common/UI";

export default function AdminProfile() {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [contact, setContact] = useState({ name: "", phone: "", address: "", city: "", country: "" });
  const [pwdForm, setPwdForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  useEffect(() => {
    api.get("/api/auth/me").then(r => {
      if (r.data.contact) setContact({ name: r.data.contact.name || "", phone: r.data.contact.phone || "", address: r.data.contact.address || "", city: r.data.contact.city || "", country: r.data.contact.country || "" });
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put(`/api/users/${currentUser.id}`, contact);
      toast.success("Profile updated.");
    } catch { toast.error("Failed to update profile."); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (pwdForm.new_password !== pwdForm.confirm) { toast.error("New passwords don't match."); return; }
    setPwdSaving(true);
    try {
      await api.put("/api/auth/change-password", { current_password: pwdForm.current_password, new_password: pwdForm.new_password });
      toast.success("Password changed successfully.");
      setPwdForm({ current_password: "", new_password: "", confirm: "" });
    } catch (e) { toast.error(e.response?.data?.error || "Password change failed."); }
    finally { setPwdSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>My Profile</h1>

      {/* User Info Card */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {currentUser?.login_id?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{currentUser?.login_id}</div>
            <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{currentUser?.email}</div>
            <StatusBadge status={currentUser?.role} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[["name", "Display Name", "text"], ["phone", "Phone", "tel"], ["address", "Address", "text"], ["city", "City", "text"], ["country", "Country", "text"]].map(([key, label, type]) => (
            <FormField key={key} label={label} className={key === "address" ? "sm:col-span-2" : ""}>
              <input type={type} value={contact[key]} onChange={(e) => setContact(c => ({ ...c, [key]: e.target.value }))}
                placeholder={label} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
            </FormField>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Btn onClick={handleSaveProfile} loading={saving}><Save size={14} /> Save Profile</Btn>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Change Password</h2>
        <div className="space-y-4">
          {[["current_password", "Current Password"], ["new_password", "New Password"], ["confirm", "Confirm New Password"]].map(([key, label]) => (
            <FormField key={key} label={label}>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} value={pwdForm[key]} onChange={(e) => setPwdForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={label} className="w-full px-3 py-2 pr-10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
                {key === "current_password" && (
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </FormField>
          ))}
          <div className="flex justify-end">
            <Btn onClick={handleChangePassword} loading={pwdSaving}><Save size={14} /> Change Password</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}