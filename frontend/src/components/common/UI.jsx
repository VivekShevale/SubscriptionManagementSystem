/**
 * src/components/common/UI.jsx
 * Shared UI Primitives
 * ---------------------
 * Reusable components used across all admin pages:
 * PageHeader, StatusBadge, Modal, ConfirmDialog, ExportMenu, EmptyState, Spinner.
 */

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import {
  X, Download, FileText, FileSpreadsheet, Printer,
  AlertTriangle, Inbox, Loader2, ChevronDown,
} from "lucide-react";

// ── Page Header ───────────────────────────────────────────────────────────────
/**
 * PageHeader — standard top-row for list/form pages.
 * @param {string} title
 * @param {ReactNode} actions — buttons on the right
 */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  // Subscription statuses
  draft:          { bg: "#f1f5f9", text: "#475569" },
  quotation:      { bg: "#fffbeb", text: "#d97706" },
  quotation_sent: { bg: "#fef3c7", text: "#b45309" },
  confirmed:      { bg: "#dbeafe", text: "#1d4ed8" },
  active:         { bg: "#dcfce7", text: "#15803d" },
  closed:         { bg: "#fee2e2", text: "#b91c1c" },
  // Invoice statuses
  paid:           { bg: "#dcfce7", text: "#15803d" },
  cancelled:      { bg: "#fee2e2", text: "#b91c1c" },
  // User roles
  admin:          { bg: "#ede9fe", text: "#6d28d9" },
  internal:       { bg: "#dbeafe", text: "#1d4ed8" },
  portal:         { bg: "#d1fae5", text: "#047857" },
  // Generic
  true:           { bg: "#dcfce7", text: "#15803d" },
  false:          { bg: "#fee2e2", text: "#b91c1c" },
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status?.toLowerCase?.()] || { bg: "#f1f5f9", text: "#64748b" };
  const label = status?.replace(/_/g, " ") || "—";
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = "", padding = true }) {
  return (
    <div
      className={`rounded-2xl ${padding ? "p-6" : ""} ${className}`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow)",
      }}
    >
      {children}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = "#3b82f6", trend }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
    }
  }, []);
  return (
    <div
      ref={ref}
      className="rounded-2xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{value}</p>
          {trend && (
            <p className="text-xs mt-1" style={{ color: trend >= 0 ? "#22c55e" : "#ef4444" }}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last month
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl" style={{ background: color + "20" }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = "max-w-xl" }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    if (open) {
      window.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${width} rounded-2xl shadow-2xl z-10 max-h-[90vh] flex flex-col`}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--border-color)" }}>
          <h2 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Delete", danger = true }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`p-4 rounded-full ${danger ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
          <AlertTriangle size={28} className={danger ? "text-red-500" : "text-amber-500"} />
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{message}</p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-black/5"
            style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${danger ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Export Menu ───────────────────────────────────────────────────────────────
export function ExportMenu({ onExport }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-black/5"
        style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
      >
        <Download size={15} /> Export <ChevronDown size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl z-50 py-1"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
          >
            {[
              { label: "CSV", icon: FileText, value: "csv" },
              { label: "Excel", icon: FileSpreadsheet, value: "excel" },
              { label: "PDF", icon: Printer, value: "pdf" },
            ].map(({ label, icon: Icon, value }) => (
              <button key={value}
                onClick={() => { onExport(value); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ color: "var(--text-primary)" }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ title = "No records found", message = "Create one to get started.", action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-5 rounded-2xl mb-4" style={{ background: "var(--bg-secondary)" }}>
        <Inbox size={40} style={{ color: "var(--text-muted)" }} />
      </div>
      <h3 className="font-semibold text-base mb-1" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{message}</p>
      {action}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin text-blue-500" />;
}

// ── Form Field Wrappers ───────────────────────────────────────────────────────
export function FormField({ label, required, error, children, hint }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{hint}</p>}
      {error && <p className="text-xs mt-1 text-red-500">{error}</p>}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30 ${className}`}
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        color: "var(--text-primary)",
      }}
      {...props}
    />
  );
}

export function Select({ children, className = "", ...props }) {
  return (
    <select
      className={`w-full px-3 py-2 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30 cursor-pointer ${className}`}
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        color: "var(--text-primary)",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full px-3 py-2 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30 resize-none ${className}`}
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        color: "var(--text-primary)",
      }}
      {...props}
    />
  );
}

export function Btn({ children, variant = "primary", size = "md", className = "", loading, ...props }) {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "border hover:bg-black/5 dark:hover:bg-white/5",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    ghost: "hover:bg-black/5 dark:hover:bg-white/5",
    success: "bg-green-600 hover:bg-green-700 text-white",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      style={variant === "secondary" ? { borderColor: "var(--border-color)", color: "var(--text-primary)" } : {}}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Data Table ────────────────────────────────────────────────────────────────
export function DataTable({ columns, data, onRowClick, loading, emptyState }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (!data?.length) {
    return emptyState || <EmptyState />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border-color)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                style={{ color: "var(--text-muted)", width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick?.(row)}
              className="border-b last:border-0 transition-colors"
              style={{
                borderColor: "var(--border-color)",
                cursor: onRowClick ? "pointer" : "default",
                background: "var(--bg-card)",
              }}
              onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = "var(--bg-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-card)"; }}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Search Input ──────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }}
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          width: 240,
        }}
      />
    </div>
  );
}