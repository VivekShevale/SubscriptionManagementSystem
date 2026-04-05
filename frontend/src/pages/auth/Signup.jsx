/**
 * src/pages/auth/Signup.jsx
 * Signup / Registration Page
 * ---------------------------
 * New user registration. First user becomes Admin; all others Portal.
 * Validates: unique login ID (6-12 chars), email, strong password.
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { Eye, EyeOff, UserPlus, Package, Check, X as XIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";

const PasswordRule = ({ met, text }) => (
  <div className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-green-500" : "text-gray-400"}`}>
    {met ? <Check size={12} /> : <XIcon size={12} />}
    {text}
  </div>
);

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ login_id: "", email: "", password: "", confirm_password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
    );
  }, []);

  const pwd = form.password;
  const rules = {
    length: pwd.length > 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    special: /[^a-zA-Z0-9]/.test(pwd),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { login_id, email, password, confirm_password } = form;
    if (login_id.length < 6 || login_id.length > 12) {
      toast.error("Login ID must be 6–12 characters."); return;
    }
    if (!Object.values(rules).every(Boolean)) {
      toast.error("Password does not meet requirements."); return;
    }
    if (password !== confirm_password) {
      toast.error("Passwords do not match."); return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/register", form);
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
  };
  const inputClass = "w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-secondary)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#3b82f6" }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#8b5cf6" }} />
      </div>
      <div ref={cardRef} className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Create account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Get started with SubscriptionMS</p>
        </div>
        <div className="rounded-2xl p-8 shadow-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Login ID <span className="text-red-500">*</span>
              </label>
              <input value={form.login_id} onChange={(e) => setForm(f => ({ ...f, login_id: e.target.value }))}
                placeholder="6–12 characters" className={inputClass} style={fieldStyle} maxLength={12} />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {form.login_id.length}/12 chars
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Email Address <span className="text-red-500">*</span>
              </label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com" className={inputClass} style={fieldStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Create a strong password" className={`${inputClass} pr-10`} style={fieldStyle} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <PasswordRule met={rules.length} text="More than 8 chars" />
                  <PasswordRule met={rules.upper} text="Uppercase letter" />
                  <PasswordRule met={rules.lower} text="Lowercase letter" />
                  <PasswordRule met={rules.special} text="Special character" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input type="password" value={form.confirm_password}
                onChange={(e) => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                placeholder="Re-enter password" className={inputClass} style={fieldStyle} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white mt-2 transition-all disabled:opacity-60 hover:shadow-lg hover:shadow-blue-500/25"
              style={{ background: "#3b82f6" }}>
              {loading ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" /></svg> : <UserPlus size={16} />}
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" className="text-blue-500 hover:text-blue-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}