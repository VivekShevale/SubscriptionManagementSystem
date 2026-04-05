/**
 * src/components/common/KeyboardShortcuts.jsx
 * Keyboard Shortcuts Guide Modal
 * --------------------------------
 * Displays all available keyboard shortcuts in a modal overlay.
 * Triggered by Alt+? or the "Shortcuts" button in the sidebar.
 */

import React, { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  { category: "Navigation", items: [
    { keys: ["Alt", "D"], desc: "Go to Dashboard" },
    { keys: ["Alt", "S"], desc: "Go to Subscriptions" },
    { keys: ["Alt", "P"], desc: "Go to Products" },
    { keys: ["Alt", "I"], desc: "Go to Invoices" },
    { keys: ["Alt", "C"], desc: "Go to Contacts" },
    { keys: ["Alt", "R"], desc: "Go to Reports" },
    { keys: ["Alt", "?"], desc: "Toggle this guide" },
  ]},
  { category: "Actions", items: [
    { keys: ["Esc"], desc: "Close modal / Cancel" },
    { keys: ["Ctrl", "S"], desc: "Save current form" },
    { keys: ["Ctrl", "K"], desc: "Focus search bar" },
  ]},
];

export default function KeyboardShortcuts({ open, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl z-10 overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-blue-500" />
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcut List */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--text-muted)" }}>
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.desc} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {item.desc}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <React.Fragment key={k}>
                          {i > 0 && <span className="text-xs" style={{ color: "var(--text-muted)" }}>+</span>}
                          <kbd
                            className="px-2 py-0.5 rounded-md text-xs font-mono font-medium"
                            style={{
                              background: "var(--bg-secondary)",
                              border: "1px solid var(--border-color)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t text-xs text-center"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
          Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}