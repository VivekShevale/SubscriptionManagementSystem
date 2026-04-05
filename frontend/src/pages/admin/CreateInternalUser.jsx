/**
 * src/pages/admin/CreateInternalUser.jsx
 * Create Internal User Form — Admin Only (Screen 15)
 * Auto-generates password, sends credentials via email.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, ShieldCheck, Info } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { FormField, Btn } from "../../components/common/UI";

export default function CreateInternalUser() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ login_id: "", email: "", role: "internal", is_active: true });
  const [saving, setSaving] = useState(false);
  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  const handleSave = async () => {
    const { login_id, email, role } = form;
    if (!login_id || !email || !role) { toast.error("All fields are required."); return; }
    if (login_id.length < 6 || login_id.length > 12) { toast.error("Login ID must be 6–12 characters."); return; }
    setSaving(true);
    try {
      await api.post("/api/users", form);
      toast.success("User created! Credentials sent via email.");
      navigate("/admin/user-roles");
    } catch (e) { toast.error(e.response?.data?.error || "Failed to create user."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/user-roles")}><ArrowLeft size={14} /> Back</Btn>
        <Btn onClick={handleSave} loading={saving}><Save size={14} /> Save & Send Credentials</Btn>
      </div>

      <div className="rounded-2xl p-6 space-y-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={20} className="text-blue-500" />
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Create Internal User</h2>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
          <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            A secure password is auto-generated and sent to the user's email. The user will be required to reset their password on first login.
          </p>
        </div>

        <FormField label="Login ID" required hint="6–12 characters, unique across the system">
          <input value={form.login_id} onChange={(e) => setForm(f => ({ ...f, login_id: e.target.value }))} maxLength={12}
            placeholder="e.g. john_int" className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{form.login_id.length}/12 characters</div>
        </FormField>

        <FormField label="Email ID" required>
          <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="user@company.com" className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp} />
        </FormField>

        <FormField label="User Type" required>
          <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30" style={inp}>
            <option value="internal">Internal User (Limited access)</option>
            <option value="admin">Admin (Full access)</option>
            <option value="portal">Portal User (Customer)</option>
          </select>
        </FormField>

        <FormField label="Status">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`} onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{form.is_active ? "Active" : "Inactive"}</span>
          </label>
        </FormField>

        <div className="rounded-xl p-4 text-xs space-y-1" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
          <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>Access Level — {form.role === "admin" ? "Admin" : form.role === "internal" ? "Internal" : "Portal"}</p>
          {form.role === "admin" && <p>Full access to all modules including configuration, discounts, taxes, and user management.</p>}
          {form.role === "internal" && <p>Can create/manage subscriptions, invoices, products, and contacts. Cannot access discount/tax configuration.</p>}
          {form.role === "portal" && <p>Customer-facing access. Can browse shop, view orders and invoices.</p>}
        </div>
      </div>
    </div>
  );
}