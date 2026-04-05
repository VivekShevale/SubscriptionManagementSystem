/**
 * src/pages/auth/ForgotPassword.jsx
 * Forgot Password — Step 1: Enter email to receive OTP
 */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Package } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1=email, 2=otp
  const [loading, setLoading] = useState(false);

  const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border-color)" };
  const inputStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email."); return; }
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      toast.success("OTP sent to your email!");
      setStep(2);
    } catch {
      toast.error("Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) { toast.error("Please enter the OTP."); return; }
    setLoading(true);
    try {
      await api.post("/api/auth/verify-otp", { email, otp });
      toast.success("OTP verified! Set your new password.");
      navigate("/reset-password", { state: { email } });
    } catch {
      toast.error("Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-secondary)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {step === 1 ? "Forgot Password" : "Enter OTP"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {step === 1 ? "Enter your email to receive a reset OTP" : `Check your inbox at ${email}`}
          </p>
        </div>
        <div className="rounded-2xl p-8 shadow-xl" style={cardStyle}>
          {step === 1 ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    style={inputStyle} />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-60"
                style={{ background: "#3b82f6" }}>
                {loading ? "Sending…" : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>6-Digit OTP</label>
                <input value={otp} onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter the OTP from your email" maxLength={6}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none text-center text-xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500/30"
                  style={inputStyle} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-60"
                style={{ background: "#3b82f6" }}>
                {loading ? "Verifying…" : "Verify OTP"}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-center"
                style={{ color: "var(--text-muted)" }}>
                ← Try a different email
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            <Link to="/login" className="text-blue-500 hover:text-blue-600 font-medium inline-flex items-center gap-1">
              <ArrowLeft size={13} /> Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}