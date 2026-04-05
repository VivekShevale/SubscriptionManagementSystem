/**
 * src/pages/admin/UserRoles.jsx
 * User Role Management Page — Admin Only (Screen 14)
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { StatusBadge, EmptyState, Spinner, Btn } from "../../components/common/UI";

export default function UserRoles() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/api/users").then(r => { setUsers(r.data); setFiltered(r.data); }).catch(() => toast.error("Failed to load users.")).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    if (!search) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter(u => u.login_id?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)));
  }, [search, users]);

  const ROLE_COLOR = { admin: "#7c3aed", internal: "#2563eb", portal: "#16a34a" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-2 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} className="text-blue-500" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>User Roles & Access</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Manage system users and their access levels</p>
      </div>

      {/* Search + New */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by login ID, email, or role…"
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
        </div>
        <Btn onClick={() => navigate("/admin/user-roles/new")}><Plus size={15} /> New Internal User</Btn>
      </div>

      {/* Table */}
      {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
              {["Login ID", "Email", "User Type", "Status", "Created At"].map(h =>
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: ROLE_COLOR[u.role] || "#64748b" }}>{u.login_id?.[0]?.toUpperCase()}</div>
                      {u.login_id}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-600"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <EmptyState title="No users found" message="Create internal users to grant system access." action={<Btn onClick={() => navigate("/admin/user-roles/new")}><Plus size={14} /> New User</Btn>} />}
        </div>
      )}
    </div>
  );
}