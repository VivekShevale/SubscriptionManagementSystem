/**
 * src/components/common/Tooltip.jsx
 * Tooltip Component
 * ------------------
 * Lightweight tooltip using CSS positioning.
 * Shows on hover with a small delay. Supports side: top|right|bottom|left.
 */

import React, { useState } from "react";

export default function Tooltip({ children, text, side = "top" }) {
  const [visible, setVisible] = useState(false);
  if (!text) return children;

  const positionClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 pointer-events-none whitespace-nowrap text-xs px-2 py-1 rounded-lg font-medium shadow-lg ${positionClass}`}
          style={{
            background: "var(--bg-sidebar)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}