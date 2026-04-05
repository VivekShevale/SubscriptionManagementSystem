/**
 * src/components/common/Breadcrumb.jsx
 * Breadcrumb Navigation Component
 * ---------------------------------
 * Auto-generates breadcrumb from current URL path.
 * Maps route segments to human-readable labels.
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

// Map path segments to human-readable display names
const SEGMENT_LABELS = {
  admin: "Admin",
  dashboard: "Dashboard",
  subscriptions: "Subscriptions",
  products: "Products",
  invoices: "Invoices",
  contacts: "Contacts",
  reports: "Reports",
  "recurring-plans": "Recurring Plans",
  attributes: "Attributes",
  "quotation-templates": "Quotation Templates",
  discounts: "Discounts",
  taxes: "Taxes",
  "user-roles": "User Roles",
  profile: "Profile",
  new: "New",
};

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs = segments.map((seg, idx) => {
    const path = "/" + segments.slice(0, idx + 1).join("/");
    // If segment is a numeric ID, show it as "#id"
    const label = isNaN(seg) ? (SEGMENT_LABELS[seg] || seg) : `#${seg}`;
    const isLast = idx === segments.length - 1;
    return { label, path, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      <Link
        to="/admin/dashboard"
        className="p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        style={{ color: "var(--text-muted)" }}
      >
        <Home size={14} />
      </Link>
      {crumbs.map(({ label, path, isLast }, idx) => (
        <React.Fragment key={path}>
          <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
          {isLast ? (
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {label}
            </span>
          ) : (
            <Link
              to={path}
              className="hover:underline transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              {label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}