/**
 * src/components/common/WebsiteTour.jsx
 * First-time user website tour using a spotlight overlay approach.
 * Works for both Admin and Portal users with role-specific steps.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from "lucide-react";

// ── Tour Step Definitions ────────────────────────────────────────────────────

const ADMIN_STEPS = [
  {
    id: "welcome",
    title: "Welcome to SubMS! 🎉",
    description:
      "This quick tour will walk you through the key areas of your Subscription Management System. It only takes about a minute.",
    target: null, // modal-only, no highlight
    position: "center",
  },
  {
    id: "sidebar",
    title: "Navigation Sidebar",
    description:
      "This sidebar is your main navigation hub. You can collapse it using the menu button at the top to get more screen space.",
    target: "[data-tour='sidebar']",
    position: "right",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "The Dashboard gives you a live overview of revenue, active subscriptions, pending invoices, and key metrics at a glance.",
    target: "[data-tour='nav-dashboard']",
    position: "right",
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    description:
      "Manage all customer subscriptions here — create new ones, track billing cycles, and update statuses with ease.",
    target: "[data-tour='nav-subscriptions']",
    position: "right",
  },
  {
    id: "products",
    title: "Products",
    description:
      "Define your product catalog with pricing, variants, and attributes. Products are what customers subscribe to.",
    target: "[data-tour='nav-products']",
    position: "right",
  },
  {
    id: "invoices",
    title: "Invoices",
    description:
      "View and manage all invoices. You can create manual invoices or let the system auto-generate them from subscriptions.",
    target: "[data-tour='nav-invoices']",
    position: "right",
  },
  {
    id: "contacts",
    title: "Contacts",
    description:
      "Your customer directory lives here. Each contact can have multiple subscriptions and invoices linked to them.",
    target: "[data-tour='nav-contacts']",
    position: "right",
  },
  {
    id: "reports",
    title: "Reports",
    description:
      "Dive deep into analytics — revenue trends, subscription growth, churn rates, and more in the Reports section.",
    target: "[data-tour='nav-reports']",
    position: "right",
  },
  {
    id: "profile",
    title: "Your Profile",
    description:
      "Click your username in the top-right to access your profile, switch themes, or log out.",
    target: "[data-tour='topbar-profile']",
    position: "bottom",
  },
  {
    id: "done",
    title: "You're all set! ✅",
    description:
      "That covers the essentials. Explore the Configuration menu in the sidebar for advanced settings like recurring plans, discounts, and taxes. Happy managing!",
    target: null,
    position: "center",
  },
];

const PORTAL_STEPS = [
  {
    id: "welcome",
    title: "Welcome to SubMS! 🎉",
    description:
      "Let's show you around the customer portal. This quick tour covers everything you need to start shopping and managing your orders.",
    target: null,
    position: "center",
  },
  {
    id: "logo",
    title: "Portal Home",
    description:
      "Click the SubMS logo at any time to return to the main shop page.",
    target: "[data-tour='portal-logo']",
    position: "bottom",
  },
  {
    id: "shop",
    title: "Shop",
    description:
      "Browse all available subscription products here. Click any product to see full details and add it to your cart.",
    target: "[data-tour='portal-shop']",
    position: "bottom",
  },
  {
    id: "cart",
    title: "Shopping Cart",
    description:
      "Your cart shows how many items are waiting for checkout. Click it to review and place your order.",
    target: "[data-tour='portal-cart']",
    position: "bottom",
  },
  {
    id: "orders",
    title: "My Orders",
    description:
      "Track all your past and active orders, view invoices, and check subscription statuses from the My Orders page.",
    target: "[data-tour='portal-orders']",
    position: "bottom",
  },
  {
    id: "profile",
    title: "Your Profile",
    description:
      "Click your avatar in the top-right to update your profile details or sign out.",
    target: "[data-tour='portal-profile']",
    position: "bottom",
  },
  {
    id: "done",
    title: "Ready to go! 🚀",
    description:
      "You know the essentials now. Start by browsing the Shop to find the perfect subscription for you!",
    target: null,
    position: "center",
  },
];

// ── Tour Storage Helpers ──────────────────────────────────────────────────────

const TOUR_KEY = "sms_tour_completed";

export const hasTourBeenCompleted = (role) => {
  try {
    const val = localStorage.getItem(`${TOUR_KEY}_${role}`);
    return val === "true";
  } catch {
    return false;
  }
};

export const markTourCompleted = (role) => {
  try {
    localStorage.setItem(`${TOUR_KEY}_${role}`, "true");
  } catch {}
};

// ── Spotlight calculation ─────────────────────────────────────────────────────

function getTargetRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - 8,
    left: rect.left - 8,
    width: rect.width + 16,
    height: rect.height + 16,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  };
}

// ── Tooltip positioning ───────────────────────────────────────────────────────

function getTooltipStyle(rect, position) {
  if (!rect || position === "center") {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 10002,
    };
  }

  const GAP = 16;
  const TOOLTIP_W = 340;
  const TOOLTIP_H = 220; // rough estimate

  if (position === "right") {
    return {
      position: "fixed",
      top: Math.min(rect.top, window.innerHeight - TOOLTIP_H - 16),
      left: rect.left + rect.width + GAP,
      zIndex: 10002,
    };
  }

  if (position === "bottom") {
    return {
      position: "fixed",
      top: rect.top + rect.height + GAP,
      left: Math.max(8, Math.min(rect.centerX - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - 8)),
      zIndex: 10002,
    };
  }

  // top
  return {
    position: "fixed",
    top: rect.top - TOOLTIP_H - GAP,
    left: Math.max(8, Math.min(rect.centerX - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - 8)),
    zIndex: 10002,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WebsiteTour({ role, onComplete }) {
  const steps = role === "portal" ? PORTAL_STEPS : ADMIN_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [visible, setVisible] = useState(true);
  const tooltipRef = useRef(null);
  const overlayRef = useRef(null);

  const step = steps[stepIndex];

  // Recalculate spotlight on step change / resize
  const recalc = useCallback(() => {
    setRect(getTargetRect(step.target));
  }, [step]);

  useEffect(() => {
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [recalc]);

  // Animate tooltip in on step change
  useEffect(() => {
    if (tooltipRef.current) {
      gsap.fromTo(
        tooltipRef.current,
        { opacity: 0, scale: 0.93, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: "power2.out" }
      );
    }
  }, [stepIndex]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const handleFinish = () => {
    if (overlayRef.current) {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          markTourCompleted(role);
          setVisible(false);
          onComplete?.();
        },
      });
    } else {
      markTourCompleted(role);
      setVisible(false);
      onComplete?.();
    }
  };

  if (!visible) return null;

  const tooltipStyle = getTooltipStyle(rect, step.position);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <>
      {/* ── Dark overlay with cutout ──────────────────────────────────── */}
      <div
        ref={overlayRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* SVG mask to punch a hole around the target */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  rx="10"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Animated border around spotlight */}
        {rect && (
          <div
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: 10,
              border: "2px solid #3b82f6",
              boxShadow: "0 0 0 4px rgba(59,130,246,0.2)",
              pointerEvents: "none",
              zIndex: 10001,
              animation: "tour-pulse 2s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* ── Tooltip card ──────────────────────────────────────────────── */}
      <div
        ref={tooltipRef}
        style={{
          ...tooltipStyle,
          width: 340,
          borderRadius: 16,
          background: "var(--bg-card, #1e293b)",
          border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.08)" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
              borderRadius: 999,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <div style={{ padding: "20px 22px 22px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isLast ? (
                  <CheckCircle2 size={16} color="white" />
                ) : (
                  <Sparkles size={16} color="white" />
                )}
              </div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary, #f1f5f9)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {step.title}
              </h3>
            </div>
            <button
              onClick={handleFinish}
              title="Skip tour"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted, #64748b)",
                padding: 2,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "var(--text-secondary, #94a3b8)",
              margin: "0 0 18px",
            }}
          >
            {step.description}
          </p>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Step count */}
            <span style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
              {stepIndex + 1} / {steps.length}
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "7px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
                    background: "transparent",
                    color: "var(--text-secondary, #94a3b8)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "7px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg,#3b82f6,#6366f1)",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
                }}
              >
                {isLast ? "Finish" : "Next"}
                {!isLast && <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.25); }
          50%       { box-shadow: 0 0 0 8px rgba(59,130,246,0.1); }
        }
      `}</style>
    </>
  );
}
