/**
 * src/layout/AdminLayout.jsx
 * Admin / Internal User Layout
 * -----------------------------
 * Full sidebar + topbar layout for admin and internal users.
 * Features: collapsible sidebar, breadcrumb, theme toggle,
 *           keyboard shortcuts, GSAP page transition animations.
 */

import React, { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { gsap } from "gsap";
import {
  LayoutDashboard, Package, RefreshCw, FileText, Receipt,
  Users, Settings, ChevronDown, Moon, Sun, LogOut,
  User, Tag, Percent, BarChart2, Menu, X, Layers,
  ShieldCheck, CreditCard, Bell, HelpCircle,
} from "lucide-react";
import { logout, selectCurrentUser } from "../store/slices/authSlice";
import { toggleTheme, selectTheme } from "../store/slices/themeSlice";
import Breadcrumb from "../components/common/Breadcrumb";
import KeyboardShortcuts from "../components/common/KeyboardShortcuts";
import Tooltip from "../components/common/Tooltip";

// ── Navigation Configuration ──────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard", shortcut: "Alt+D" },
  { label: "Subscriptions", icon: RefreshCw, path: "/admin/subscriptions", shortcut: "Alt+S" },
  { label: "Products", icon: Package, path: "/admin/products", shortcut: "Alt+P" },
  { label: "Invoices", icon: Receipt, path: "/admin/invoices", shortcut: "Alt+I" },
  { label: "Contacts", icon: Users, path: "/admin/contacts", shortcut: "Alt+C" },
  { label: "Reports", icon: BarChart2, path: "/admin/reports", shortcut: "Alt+R" },
  {
    label: "Configuration",
    icon: Settings,
    shortcut: "Alt+G",
    children: [
      { label: "Recurring Plans", icon: RefreshCw, path: "/admin/recurring-plans" },
      { label: "Attributes / Variants", icon: Layers, path: "/admin/attributes" },
      { label: "Quotation Templates", icon: FileText, path: "/admin/quotation-templates" },
      { label: "Discounts", icon: Tag, path: "/admin/discounts" },
      { label: "Taxes", icon: Percent, path: "/admin/taxes" },
    ],
  },
];

export default function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectCurrentUser);
  const theme = useSelector(selectTheme);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const mainRef = useRef(null);
  const sidebarRef = useRef(null);

  // ── GSAP Page Transition ───────────────────────────────────────────────────
  useEffect(() => {
    if (mainRef.current) {
      gsap.fromTo(
        mainRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [location.pathname]);

  // ── GSAP Sidebar Animation ────────────────────────────────────────────────
  useEffect(() => {
    if (sidebarRef.current) {
      gsap.to(sidebarRef.current, {
        width: sidebarOpen ? 256 : 64,
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
  }, [sidebarOpen]);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.altKey) {
        const shortcuts = {
          d: "/admin/dashboard",
          s: "/admin/subscriptions",
          p: "/admin/products",
          i: "/admin/invoices",
          c: "/admin/contacts",
          r: "/admin/reports",
        };
        if (shortcuts[e.key]) {
          e.preventDefault();
          navigate(shortcuts[e.key]);
        }
        if (e.key === "?") {
          e.preventDefault();
          setShortcutsOpen((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg-secondary)" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div
        ref={sidebarRef}
        className="flex flex-col h-full overflow-hidden shrink-0 transition-all"
        style={{
          width: sidebarOpen ? 256 : 64,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          {sidebarOpen && (
            <span className="text-blue font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden">
              <span style={{ color: "var(--accent)" }}>Sub</span>MS
            </span>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              // Configuration dropdown — admin only
              if (user?.role !== "admin") return null;
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setConfigOpen((v) => !v)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                      configOpen
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-gray-400 hover:bg-blue-500/20 hover:text-blue-400"
                    }`}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${configOpen ? "rotate-180" : ""}`}
                        />
                      </>
                    )}
                  </button>
                  {configOpen && sidebarOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                            isActive(child.path)
                              ? "bg-blue-600 text-white"
                              : "text-gray-400 hover:text-blue-400 hover:bg-blue-500/20"
                          }`}
                        >
                          <child.icon size={16} className="shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Tooltip key={item.path} text={!sidebarOpen ? item.label : ""} side="right">
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.path)
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-gray-400 hover:bg-blue-500/20 hover:text-blue-400"
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </Tooltip>
            );
          })}

          {/* User Roles — Admin Only */}
          {user?.role === "admin" && (
            <Tooltip text={!sidebarOpen ? "User Roles" : ""} side="right">
              <Link
                to="/admin/user-roles"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive("/admin/user-roles")
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-gray-400 hover:bg-blue-500/20 hover:text-blue-400"
                }`}
              >
                <ShieldCheck size={18} className="shrink-0" />
                {sidebarOpen && <span>User Roles</span>}
              </Link>
            </Tooltip>
          )}
        </nav>

        {/* Bottom: theme toggle + logout */}
        <div className="p-2 border-t border-white/10 space-y-1">
          <Tooltip text="Keyboard Shortcuts (Alt+?)" side="right">
            <button
              onClick={() => setShortcutsOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 text-sm transition-all"
            >
              <HelpCircle size={18} className="shrink-0" />
              {sidebarOpen && <span>Shortcuts</span>}
            </button>
          </Tooltip>

          <Tooltip text="Toggle Theme" side="right">
            <button
              onClick={() => dispatch(toggleTheme())}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 text-sm transition-all"
            >
              {theme === "dark" ? (
                <Sun size={18} className="shrink-0" />
              ) : (
                <Moon size={18} className="shrink-0" />
              )}
              {sidebarOpen && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
            </button>
          </Tooltip>

          <Tooltip text="Logout" side="right">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm transition-all"
            >
              <LogOut size={18} className="shrink-0" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b shrink-0"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-color)",
            boxShadow: "var(--shadow)",
          }}
        >
          <Breadcrumb />
          <div className="flex items-center gap-3">
            {/* Profile button */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.login_id?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden sm:block">{user?.login_id}</span>
                <ChevronDown size={14} />
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl z-50 py-1"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {user?.login_id}
                    </div>
                    <div className="text-xs mt-0.5 capitalize px-2 py-0.5 rounded-full inline-block"
                      style={{
                        background: user?.role === "admin" ? "#dbeafe" : "#dcfce7",
                        color: user?.role === "admin" ? "#1d4ed8" : "#15803d",
                      }}
                    >
                      {user?.role}
                    </div>
                  </div>
                  <Link
                    to="/admin/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-blue-500/20 hover:text-blue-400"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <User size={15} /> My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto p-6"
          style={{ background: "var(--bg-secondary)" }}
        >
          <Outlet />
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Profile overlay backdrop */}
      {profileOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
      )}
    </div>
  );
}