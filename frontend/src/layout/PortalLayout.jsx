/**
 * src/layout/PortalLayout.jsx
 * Portal / Customer Layout
 * -------------------------
 * Horizontal navbar for the shop and customer account pages.
 * Includes: logo, nav links, cart icon with badge, profile dropdown.
 */

import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingCart, User, Sun, Moon, LogOut, Package, ClipboardList, ChevronDown } from "lucide-react";
import { logout, selectCurrentUser, selectIsAuthenticated } from "../store/slices/authSlice";
import { toggleTheme, selectTheme } from "../store/slices/themeSlice";
import { selectCartCount } from "../store/slices/cartSlice";

export default function PortalLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const theme = useSelector(selectTheme);
  const cartCount = useSelector(selectCartCount);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navLinkClass = (path) =>
    `text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
      isActive(path)
        ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
        : "hover:bg-black/5 dark:hover:bg-white/5"
    }`;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-color)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/portal" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              <span className="text-blue-600">Sub</span>MS
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
            <Link to="/portal/shop" className={navLinkClass("/portal/shop")}>Home</Link>
            <Link to="/portal/shop" className={navLinkClass("/portal/shop")}>Shop</Link>
            {isAuthenticated && (
              <Link to="/portal/orders" className={navLinkClass("/portal/orders")}>My Orders</Link>
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--text-secondary)" }}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Cart */}
            <Link
              to="/portal/cart"
              className="relative p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--text-secondary)" }}
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.login_id?.[0]?.toUpperCase() || "U"}
                  </div>
                  <ChevronDown size={14} />
                </button>

                {profileOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl z-50 py-1"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                      {user?.login_id}
                    </div>
                    <Link
                      to="/portal/orders"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <ClipboardList size={15} /> My Orders
                    </Link>
                    <Link
                      to="/portal/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <User size={15} /> My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* Backdrop */}
      {profileOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
      )}
    </div>
  );
}