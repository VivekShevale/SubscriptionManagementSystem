/**
 * src/pages/auth/Login.jsx
 * Login Page - Fixed token storage issue
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { gsap } from "gsap";
import { Eye, EyeOff, LogIn, Package } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { loginSuccess } from "../../store/slices/authSlice";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);
  const fieldsRef = useRef([]);

  // ── GSAP entrance animation ────────────────────────────────────────────────
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(cardRef.current,
      { opacity: 0, y: 40, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" }
    ).fromTo(fieldsRef.current,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.07, ease: "power2.out" },
      "-=0.2"
    );
  }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      // FIX: Send only the identifier field - backend uses either login_id OR email
      const res = await api.post("/api/auth/login", {
        login_id: form.identifier,  // This works for both login_id and email
        password: form.password,
      });
      
      // Debug log to verify response
      console.log("Login response:", res.data);
      
      // Verify token exists before dispatching
      if (!res.data.token) {
        throw new Error("No token received from server");
      }
      
      // Dispatch to Redux (this will save to localStorage via the authSlice)
      dispatch(loginSuccess({ 
        token: res.data.token, 
        user: res.data.user 
      }));
      
      toast.success(`Welcome back, ${res.data.user.login_id}!`);

      // Route based on role
      if (res.data.user.role === "portal") {
        navigate("/portal");
      } else {
        navigate("/admin/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Invalid login ID or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-secondary)" }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ background: "#3b82f6" }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ background: "#8b5cf6" }} />
      </div>

      <div ref={cardRef} className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Welcome back
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sign in to your SubscriptionMS account
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Login ID / Email */}
            <div ref={(el) => (fieldsRef.current[0] = el)}>
              <label className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}>
                Login ID or Email
              </label>
              <input
                name="identifier"
                type="text"
                value={form.identifier}
                onChange={handleChange}
                placeholder="Enter your login ID or email"
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Password */}
            <div ref={(el) => (fieldsRef.current[1] = el)}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Password
                </label>
                <Link to="/forgot-password"
                  className="text-xs text-blue-500 hover:text-blue-600 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div ref={(el) => (fieldsRef.current[2] = el)}>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
                style={{ background: loading ? "#93c5fd" : "#3b82f6" }}
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" />
                  </svg>
                ) : (
                  <LogIn size={16} />
                )}
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-500 hover:text-blue-600 font-medium transition-colors">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}