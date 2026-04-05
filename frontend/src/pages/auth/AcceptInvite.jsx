/**
 * src/pages/auth/AcceptInvite.jsx
 * Invite acceptance page — opened via the one-time link emailed to new users.
 * Flow:
 *   1. Read token from URL param
 *   2. Call GET /api/auth/accept-invite/:token → get JWT + user
 *   3. Store JWT in Redux/localStorage (user is now authenticated)
 *   4. Show set-password form — user sets their own password
 *   5. Redirect to their dashboard
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, Package, CheckCircle, XCircle, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { loginSuccess } from "../../store/slices/authSlice";

const PasswordRule = ({ met, label }) => (
  <div className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-green-500" : "text-gray-400"}`}>
    <span>{met ? "✓" : "○"}</span> {label}
  </div>
);

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [status, setStatus] = useState("verifying"); // verifying | ready | error | done
  const [errorMsg, setErrorMsg] = useState("");
  const [userData, setUserData] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password strength rules
  const rules = {
    length: password.length > 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
  const allRulesMet = Object.values(rules).every(Boolean);

  // Step 1: verify token on mount
  useEffect(() => {
    if (!token) { setStatus("error"); setErrorMsg("No invite token found in URL."); return; }
    api.get(`/api/auth/accept-invite/${token}`)
      .then(res => {
        // Auto-authenticate user
        dispatch(loginSuccess({ token: res.data.token, user: res.data.user }));
        setJwtToken(res.data.token);
        setUserData(res.data.user);
        setStatus("ready");
      })
      .catch(err => {
        setStatus("error");
        setErrorMsg(err.response?.data?.error || "Invalid or expired invite link.");
      });
  }, [token]);

  // Step 2: set password
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!allRulesMet) { toast.error("Please meet all password requirements."); return; }
    if (password !== confirm) { toast.error("Passwords do not match."); return; }

    setSaving(true);
    try {
      await api.post("/api/auth/set-invite-password", { new_password: password });

      toast.success("Password set! Welcome to SubscriptionMS 🎉");
      setStatus("done");

      // Redirect based on role
      setTimeout(() => {
        if (userData?.role === "portal") navigate("/portal");
        else navigate("/admin/dashboard");
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to set password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-secondary)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#3b82f6" }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#8b5cf6" }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>SubscriptionMS</h1>
        </div>

        <div className="rounded-2xl p-8 shadow-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>

          {/* Verifying */}
          {status === "verifying" && (
            <div className="text-center py-8 space-y-3">
              <svg className="w-8 h-8 animate-spin mx-auto text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" />
              </svg>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Verifying your invite link…</p>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle size={36} className="text-red-500" />
                </div>
              </div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Invite Link Invalid</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{errorMsg}</p>
              <button onClick={() => navigate("/login")} className="mt-2 text-blue-500 hover:underline text-sm">
                Go to Login
              </button>
            </div>
          )}

          {/* Set Password Form */}
          {status === "ready" && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
                  <KeyRound size={22} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Welcome, {userData?.login_id}!
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  Set your password to activate your account.
                </p>
              </div>

              <div className="px-3 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
                <span style={{ color: "var(--text-muted)" }}>Your Login ID: </span>
                <span className="font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{userData?.login_id}</span>
                <span className="ml-3 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{userData?.role}</span>
              </div>

              <form onSubmit={handleSetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                      style={inp}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Password rules */}
                  {password && (
                    <div className="mt-2 grid grid-cols-2 gap-1 px-1">
                      <PasswordRule met={rules.length} label="More than 8 characters" />
                      <PasswordRule met={rules.upper} label="One uppercase letter" />
                      <PasswordRule met={rules.lower} label="One lowercase letter" />
                      <PasswordRule met={rules.special} label="One special character" />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                      style={inp}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                  )}
                  {confirm && password === confirm && allRulesMet && (
                    <p className="text-xs text-green-500 mt-1">✓ Passwords match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={saving || !allRulesMet || password !== confirm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-60"
                >
                  {saving ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" />
                    </svg>
                  ) : <KeyRound size={16} />}
                  {saving ? "Activating…" : "Activate Account"}
                </button>
              </form>
            </div>
          )}

          {/* Success */}
          {status === "done" && (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={36} className="text-green-600" />
                </div>
              </div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Account Activated!</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Redirecting you to your dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
