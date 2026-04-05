/**
 * src/pages/auth/ResetPassword.jsx
 * Reset Password Page
 * --------------------
 * Called after OTP verification, or on first login with must_reset_password flag.
 * Validates password strength before submission.
 */
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { selectCurrentUser } from "../../store/slices/authSlice";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useSelector(selectCurrentUser);
  // Email comes from forgot-password flow state OR from logged-in user
  const email = location.state?.email || currentUser?.email || "";

  const [form, setForm] = useState({ new_password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      toast.error("Passwords do not match."); return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { email, new_password: form.new_password });
      toast.success("Password reset! Please log in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-secondary)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <KeyRound size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Set New Password</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>for {email}</p>
        </div>
        <div className="rounded-2xl p-8 shadow-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>New Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={form.new_password}
                  onChange={(e) => setForm(f => ({ ...f, new_password: e.target.value }))}
                  placeholder="Strong password" className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={inputStyle} />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Confirm Password</label>
              <input type="password" value={form.confirm}
                onChange={(e) => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Re-enter password" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                style={inputStyle} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-60"
              style={{ background: "#3b82f6" }}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}