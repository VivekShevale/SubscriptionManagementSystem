/**
 * src/components/common/RAGChatbot.jsx
 * RAG-based AI Chatbot powered by Groq API
 * -----------------------------------------
 * Retrieves live data from the SMS backend APIs, builds a rich context,
 * and sends it to Groq's LLM for natural-language answers.
 *
 * Features:
 *  - Floating chat bubble (bottom-right)
 *  - Live data retrieval (subscriptions, invoices, contacts, reports, products)
 *  - Role-aware (admin sees everything, portal user sees own data)
 *  - Suggested quick-prompts
 *  - Markdown-style response rendering
 *  - Conversation history (multi-turn)
 *  - Groq API key input (stored in localStorage)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { gsap } from "gsap";
import {
  MessageSquare, X, Send, Bot, User, Loader2,
  Sparkles, ChevronDown, Settings, Key, Trash2,
  AlertCircle, TrendingUp, RefreshCw, Receipt, Users,
  Package, BarChart2, Zap,
} from "lucide-react";
import { selectCurrentUser, selectToken } from "../../store/slices/authSlice";
import api from "../../configs/api";

// ── Constants ────────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-70b-versatile";
const GROQ_KEY_STORAGE = "sms_groq_api_key";

const ADMIN_SUGGESTIONS = [
  { icon: TrendingUp,  label: "Revenue this month",       prompt: "What is the total revenue this month and how does it compare to last month?" },
  { icon: AlertCircle, label: "Overdue invoices",          prompt: "Show me all overdue invoices and the total amount pending." },
  { icon: RefreshCw,   label: "Active subscriptions",      prompt: "How many active subscriptions do we have and which plan is most popular?" },
  { icon: Users,       label: "Top customers",             prompt: "Who are our top 5 customers by subscription value?" },
  { icon: Receipt,     label: "Unpaid invoices",           prompt: "List all unpaid invoices with their due dates and amounts." },
  { icon: BarChart2,   label: "Business insights",         prompt: "Give me a business health summary — revenue, churn risk, and any anomalies." },
];

const PORTAL_SUGGESTIONS = [
  { icon: RefreshCw,   label: "My subscriptions",          prompt: "What active subscriptions do I have?" },
  { icon: Receipt,     label: "Pending invoices",          prompt: "Do I have any unpaid or overdue invoices?" },
  { icon: Package,     label: "Browse products",           prompt: "What subscription products are available?" },
  { icon: TrendingUp,  label: "My spending",               prompt: "How much have I spent in total on subscriptions?" },
];

// ── Data Fetcher ─────────────────────────────────────────────────────────────

async function fetchSystemContext(role) {
  const endpoints = role === "portal"
    ? [
        { key: "subscriptions", url: "/api/subscriptions" },
        { key: "invoices",      url: "/api/invoices" },
        { key: "products",      url: "/api/products" },
      ]
    : [
        { key: "dashboard",     url: "/api/reports/dashboard" },
        { key: "revenue",       url: "/api/reports/revenue" },
        { key: "subscriptions", url: "/api/subscriptions" },
        { key: "invoices",      url: "/api/invoices" },
        { key: "contacts",      url: "/api/contacts" },
        { key: "products",      url: "/api/products" },
        { key: "overdue",       url: "/api/reports/overdue-invoices" },
      ];

  const results = {};
  await Promise.allSettled(
    endpoints.map(async ({ key, url }) => {
      try {
        const res = await api.get(url);
        results[key] = res.data;
      } catch {
        results[key] = null;
      }
    })
  );
  return results;
}

// ── Context Builder ───────────────────────────────────────────────────────────

function buildSystemPrompt(role, user, context) {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const safe = (val) => (val === null || val === undefined ? "N/A" : val);
  const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  // Summarise data to avoid token overflow
  let dataSection = "";

  if (role !== "portal") {
    const dash = context.dashboard || {};
    const subs = context.subscriptions || [];
    const invs = context.invoices || [];
    const contacts = context.contacts || [];
    const products = context.products || [];
    const revenue = context.revenue || [];
    const overdue = context.overdue || [];

    // KPI summary
    dataSection += `
## DASHBOARD KPIs
- Active Subscriptions: ${safe(dash.subscriptions?.active)} / Total: ${safe(dash.subscriptions?.total)}
- Subscriptions by Status: Draft=${safe(dash.subscriptions?.draft)}, Quotation=${safe(dash.subscriptions?.quotation)}, Confirmed=${safe(dash.subscriptions?.confirmed)}, Closed=${safe(dash.subscriptions?.closed)}
- Total Revenue: ${currency(dash.revenue?.total_revenue)}
- Total Invoices: ${safe(dash.invoices?.total)} | Paid: ${safe(dash.invoices?.paid)} | Unpaid: ${safe(dash.invoices?.unpaid)} | Overdue: ${safe(dash.invoices?.overdue)}
- Total Contacts: ${safe(dash.contacts?.total)}
- Total Products: ${safe(dash.products?.total)}

## MONTHLY REVENUE TREND (last ${revenue.length} months)
${revenue.slice(-6).map(r => `- ${r.month}: ${currency(r.total_revenue)} (${r.invoice_count} invoices)`).join("\n")}

## OVERDUE INVOICES (${overdue.length} total)
${overdue.slice(0, 10).map(inv =>
  `- ${inv.invoice_number}: ${currency(inv.total_amount)} due ${inv.due_date?.slice(0,10)} — ${inv.customer_name}`
).join("\n")}
${overdue.length > 10 ? `...and ${overdue.length - 10} more` : ""}

## RECENT SUBSCRIPTIONS (latest 15)
${subs.slice(0, 15).map(s =>
  `- ${s.subscription_number} | ${s.customer_name} | ${s.plan_name || "—"} | ₹${s.recurring_amount || 0}/cycle | Status: ${s.status} | Next invoice: ${s.next_invoice_date?.slice(0,10) || "N/A"}`
).join("\n")}

## INVOICES SUMMARY
- Total: ${invs.length}
- Paid: ${invs.filter(i => i.status === "paid").length}
- Unpaid: ${invs.filter(i => i.status === "unpaid").length}
- Overdue: ${invs.filter(i => i.status === "overdue").length}
- Largest unpaid: ${currency(Math.max(...invs.filter(i => i.status !== "paid").map(i => Number(i.total_amount || 0)), 0))}

## CONTACTS (${contacts.length} total)
${contacts.slice(0, 10).map(c => `- ${c.name} | ${c.email || "—"} | ${c.company || "—"}`).join("\n")}
${contacts.length > 10 ? `...and ${contacts.length - 10} more` : ""}

## PRODUCTS (${products.length} total)
${products.slice(0, 10).map(p => `- ${p.name} | ${p.product_type || "—"} | Base price: ${currency(p.base_price)}`).join("\n")}
`;
  } else {
    // Portal user — filtered view
    const subs = context.subscriptions || [];
    const invs = context.invoices || [];
    const products = context.products || [];

    dataSection += `
## MY SUBSCRIPTIONS (${subs.length} total)
${subs.map(s =>
  `- ${s.subscription_number} | ${s.plan_name || "—"} | ₹${s.recurring_amount || 0}/cycle | Status: ${s.status} | Next invoice: ${s.next_invoice_date?.slice(0,10) || "N/A"}`
).join("\n") || "None"}

## MY INVOICES (${invs.length} total)
- Paid: ${invs.filter(i => i.status === "paid").length}
- Unpaid: ${invs.filter(i => i.status === "unpaid").length}
- Overdue: ${invs.filter(i => i.status === "overdue").length}
${invs.slice(0, 10).map(inv =>
  `- ${inv.invoice_number} | ${currency(inv.total_amount)} | ${inv.status} | Due: ${inv.due_date?.slice(0,10) || "N/A"}`
).join("\n")}

## AVAILABLE PRODUCTS (${products.length})
${products.slice(0, 15).map(p => `- ${p.name} | ${p.product_type || "—"} | ${currency(p.base_price)}`).join("\n")}
`;
  }

  return `You are an intelligent AI assistant for SubMS (Subscription Management System).
Current date & time: ${now}
Logged-in user: ${user?.login_id || "Unknown"} | Role: ${role}

You have access to LIVE system data below. Answer questions accurately using this data.
Be concise but insightful. Format numbers with ₹ for currency. Use bullet points for lists.
If asked about something not in the data, say so clearly. Do not hallucinate data.
For business insights, explain the *why* behind the numbers.

---
${dataSection}
---

SYSTEM KNOWLEDGE:
- Subscription statuses: draft → quotation → quotation_sent → confirmed → active → closed
- Invoice statuses: draft → sent → paid | overdue = unpaid past due date
- Portal users can browse products, view their own orders/invoices/subscriptions
- Admin users manage everything: all subscriptions, invoices, contacts, reports, products, discounts, taxes, user roles
`;
}

// ── Message Renderer ──────────────────────────────────────────────────────────

function renderMessage(text) {
  // Simple markdown-like rendering
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("## ")) return <div key={i} className="font-bold text-blue-400 mt-2 mb-1 text-xs uppercase tracking-wide">{line.slice(3)}</div>;
    if (line.startsWith("# "))  return <div key={i} className="font-bold mt-2 mb-1" style={{ color: "var(--text-primary)", fontSize: 14 }}>{line.slice(2)}</div>;
    if (line.startsWith("- ") || line.startsWith("• ")) {
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span style={{ color: "#3b82f6", flexShrink: 0 }}>•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    if (line.startsWith("**") && line.endsWith("**")) {
      return <div key={i} className="font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{line.slice(2, -2)}</div>;
    }
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    return <div key={i}>{renderInline(line)}</div>;
  });
}

function renderInline(text) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

// ── Main Chatbot Component ────────────────────────────────────────────────────

export default function RAGChatbot() {
  const user = useSelector(selectCurrentUser);
  const role = user?.role || "portal";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [context, setContext] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem(GROQ_KEY_STORAGE) || "");
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const bubbleRef = useRef(null);
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);

  const suggestions = role === "portal" ? PORTAL_SUGGESTIONS : ADMIN_SUGGESTIONS;

  // Animate bubble on mount
  useEffect(() => {
    if (bubbleRef.current) {
      gsap.fromTo(bubbleRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)", delay: 0.5 }
      );
    }
  }, []);

  // Animate panel open/close
  useEffect(() => {
    if (!panelRef.current) return;
    if (open) {
      gsap.fromTo(panelRef.current,
        { opacity: 0, scale: 0.92, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "power3.out" }
      );
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [open]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch context when panel opens
  useEffect(() => {
    if (open && !context) {
      loadContext();
    }
  }, [open]);

  const loadContext = async () => {
    setFetching(true);
    try {
      const data = await fetchSystemContext(role);
      setContext(data);
    } catch (e) {
      console.error("Context fetch error:", e);
    } finally {
      setFetching(false);
    }
  };

  const saveGroqKey = () => {
    const key = keyInput.trim();
    if (!key.startsWith("gsk_")) {
      setError("Invalid Groq key. It should start with 'gsk_'");
      return;
    }
    localStorage.setItem(GROQ_KEY_STORAGE, key);
    setGroqKey(key);
    setKeyInput("");
    setShowSettings(false);
    setError(null);
  };

  const sendMessage = useCallback(async (userText) => {
    const text = (userText || input).trim();
    if (!text || loading) return;
    if (!groqKey) { setShowSettings(true); return; }
    if (!context) { await loadContext(); }

    setInput("");
    setShowSuggestions(false);
    setError(null);
    setLoading(true);

    const userMsg = { role: "user", content: text, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Build conversation for Groq
      const systemPrompt = buildSystemPrompt(role, user, context || {});
      const history = messages.slice(-10).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: text },
          ],
          temperature: 0.4,
          max_tokens: 1024,
          stream: false,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

      setMessages(prev => [...prev, {
        role: "assistant",
        content: reply,
        id: Date.now() + 1,
      }]);
    } catch (err) {
      const errMsg = err.message.includes("401")
        ? "Invalid Groq API key. Please check your key in Settings."
        : err.message.includes("429")
        ? "Rate limit reached. Please wait a moment and try again."
        : `Error: ${err.message}`;
      setError(errMsg);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ ${errMsg}`,
        id: Date.now() + 1,
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, groqKey, context, messages, role, user]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
    setError(null);
  };

  const refreshContext = async () => {
    setContext(null);
    await loadContext();
  };

  return (
    <>
      {/* ── Floating Bubble ──────────────────────────────────────────────── */}
      {!open && (
        <button
          ref={bubbleRef}
          onClick={() => setOpen(true)}
          title="AI Assistant"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9000,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 25px rgba(99,102,241,0.5)",
          }}
        >
          <MessageSquare size={24} color="white" />
          {/* Pulse ring */}
          <span style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: "2px solid rgba(99,102,241,0.4)",
            animation: "chatbot-ping 2s ease-in-out infinite",
          }} />
        </button>
      )}

      {/* ── Chat Panel ───────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9100,
            width: 420,
            maxWidth: "calc(100vw - 32px)",
            height: 620,
            maxHeight: "calc(100vh - 48px)",
            borderRadius: 20,
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-color)",
            background: "linear-gradient(135deg, #1e40af22, #6366f122)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Sparkles size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                SubMS AI Assistant
              </div>
              <div style={{ fontSize: 11, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                {fetching ? "Loading data…" : context ? "Live data connected" : "Ready"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {messages.length > 0 && (
                <button onClick={clearChat} title="Clear chat"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6, borderRadius: 8 }}>
                  <Trash2 size={15} />
                </button>
              )}
              <button onClick={refreshContext} title="Refresh data"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6, borderRadius: 8 }}>
                <RefreshCw size={15} />
              </button>
              <button onClick={() => setShowSettings(s => !s)} title="Settings"
                style={{ background: "none", border: "none", cursor: "pointer", color: showSettings ? "#3b82f6" : "var(--text-muted)", padding: 6, borderRadius: 8 }}>
                <Settings size={15} />
              </button>
              <button onClick={() => setOpen(false)} title="Close"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6, borderRadius: 8 }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Key size={12} /> Groq API Key
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="password"
                  placeholder={groqKey ? "Key saved — enter new key to update" : "Enter your Groq API key (gsk_...)"}
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveGroqKey()}
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 12,
                    background: "var(--bg-card)", border: "1px solid var(--border-color)",
                    color: "var(--text-primary)", outline: "none",
                  }}
                />
                <button onClick={saveGroqKey}
                  style={{
                    padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: "#3b82f6", color: "white", border: "none", cursor: "pointer",
                  }}>
                  Save
                </button>
              </div>
              {groqKey && (
                <div style={{ fontSize: 11, color: "#22c55e", marginTop: 5 }}>
                  ✓ Key saved · Model: {GROQ_MODEL}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Get a free key at{" "}
                <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>
                  console.groq.com
                </a>
              </div>
              {error && (
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 5, display: "flex", gap: 4, alignItems: "center" }}>
                  <AlertCircle size={11} /> {error}
                </div>
              )}
            </div>
          )}

          {/* Messages Area */}
          <div
            ref={chatRef}
            style={{
              flex: 1, overflowY: "auto", padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 10,
            }}
          >
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 12px 8px" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "linear-gradient(135deg,#3b82f6,#6366f1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px",
                }}>
                  <Bot size={24} color="white" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 6 }}>
                  Hi, {user?.login_id}! 👋
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {role === "portal"
                    ? "Ask me about your subscriptions, invoices, or available products."
                    : "Ask me anything about your business — revenue, subscriptions, invoices, or insights."}
                </div>
                {!groqKey && (
                  <button
                    onClick={() => setShowSettings(true)}
                    style={{
                      marginTop: 12, padding: "7px 16px", borderRadius: 10,
                      background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "white",
                      border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <Key size={13} /> Set up Groq API Key
                  </button>
                )}
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && messages.length === 0 && groqKey && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, paddingLeft: 2 }}>
                  QUICK QUESTIONS
                </div>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.prompt)}
                    style={{
                      textAlign: "left", padding: "9px 12px", borderRadius: 10,
                      background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                      cursor: "pointer", fontSize: 12.5, color: "var(--text-primary)",
                      display: "flex", alignItems: "center", gap: 8,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f6"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-color)"}
                  >
                    <s.icon size={14} color="#3b82f6" style={{ flexShrink: 0 }} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: msg.role === "user"
                    ? "#3b82f6"
                    : msg.isError ? "#ef444420" : "linear-gradient(135deg,#6366f1,#3b82f6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {msg.role === "user"
                    ? <User size={14} color="white" />
                    : <Bot size={14} color={msg.isError ? "#ef4444" : "white"} />
                  }
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth: "78%",
                  padding: "9px 12px",
                  borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                    : msg.isError ? "#ef444415" : "var(--bg-secondary)",
                  border: msg.role === "assistant" ? "1px solid var(--border-color)" : "none",
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: msg.role === "user" ? "white" : "var(--text-primary)",
                }}>
                  {msg.role === "user"
                    ? msg.content
                    : <div>{renderMessage(msg.content)}</div>
                  }
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: "linear-gradient(135deg,#6366f1,#3b82f6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Bot size={14} color="white" />
                </div>
                <div style={{
                  padding: "10px 14px", borderRadius: "4px 14px 14px 14px",
                  background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                  display: "flex", gap: 5, alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: "50%", background: "#3b82f6",
                      animation: `chatbot-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                      display: "inline-block",
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Fetching indicator */}
          {fetching && (
            <div style={{
              padding: "6px 16px", fontSize: 11, color: "#3b82f6",
              background: "#3b82f610", borderTop: "1px solid var(--border-color)",
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            }}>
              <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
              Fetching live data from your system…
            </div>
          )}

          {/* Input Area */}
          <div style={{
            padding: "10px 12px",
            borderTop: "1px solid var(--border-color)",
            flexShrink: 0,
          }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-end",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: 14, padding: "6px 6px 6px 12px",
              transition: "border-color 0.2s",
            }}
              onFocus={() => {}}
            >
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={groqKey ? "Ask anything about your data…" : "Set up your Groq API key first"}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
                }}
                onKeyDown={handleKeyDown}
                disabled={!groqKey || loading}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  resize: "none", fontSize: 13, lineHeight: 1.5,
                  color: "var(--text-primary)", padding: 0, fontFamily: "inherit",
                  maxHeight: 96, overflow: "auto",
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || !groqKey || loading}
                style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: input.trim() && groqKey && !loading
                    ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                    : "var(--border-color)",
                  border: "none", cursor: input.trim() && groqKey && !loading ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                {loading
                  ? <Loader2 size={15} color="white" style={{ animation: "spin 1s linear infinite" }} />
                  : <Send size={15} color={input.trim() && groqKey ? "white" : "var(--text-muted)"} />
                }
              </button>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 5 }}>
              Powered by Groq · {GROQ_MODEL}
            </div>
          </div>
        </div>
      )}

      {/* Global animation styles */}
      <style>{`
        @keyframes chatbot-ping {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.15); opacity: 0; }
        }
        @keyframes chatbot-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1);   opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
