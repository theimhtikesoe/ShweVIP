"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiRequest } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

interface UserRow {
  id: number;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  subscription: {
    startDate: string;
    expiryDate: string;
    quota: number;
    isActive: boolean;
  } | null;
}

export default function AdminUsersPage() {
  const { user, loading, logout } = useAuthGuard("admin");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newEmail, setNewEmail] = useState("member@pnm.local");
  const [newPassword, setNewPassword] = useState("MemberPass123");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [newQuota, setNewQuota] = useState("50000000000");
  const [newExpiry, setNewExpiry] = useState("");

  const [updateUserId, setUpdateUserId] = useState("");
  const [updateEmail, setUpdateEmail] = useState("");
  const [updateRole, setUpdateRole] = useState<"" | "admin" | "user">("");
  const [updateQuota, setUpdateQuota] = useState("");
  const [updateExpiry, setUpdateExpiry] = useState("");

  const fetchUsers = async () => {
    try {
      const response = await apiRequest<{ users: UserRow[] }>("/users");
      setUsers(response.users);
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: newRole,
          quota: Number(newQuota),
          subscriptionExpiry: newExpiry || undefined
        })
      });

      await fetchUsers();
      setNewEmail("");
      setNewPassword("");
      setNewQuota("50000000000");
      setNewExpiry("");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const updateUser = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!updateUserId) {
      setError("User ID is required");
      return;
    }

    const payload: Record<string, unknown> = {};
    if (updateEmail) payload.email = updateEmail;
    if (updateRole) payload.role = updateRole;
    if (updateQuota) payload.quota = Number(updateQuota);
    if (updateExpiry) payload.subscriptionExpiry = updateExpiry;

    setBusy(true);

    try {
      await apiRequest(`/users/${updateUserId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      await fetchUsers();
      setUpdateEmail("");
      setUpdateRole("");
      setUpdateQuota("");
      setUpdateExpiry("");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  return (
    <AppShell title="Admin User Console" user={user} onLogout={logout}>
      <section className="card">
        <h2 className="text-lg font-semibold">Create User</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={createUser}>
          <input className="field" placeholder="Email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required />
          <input
            className="field"
            placeholder="Password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <select className="field" value={newRole} onChange={(event) => setNewRole(event.target.value as "admin" | "user")}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <input
            className="field"
            type="number"
            min={1}
            placeholder="Quota (bytes)"
            value={newQuota}
            onChange={(event) => setNewQuota(event.target.value)}
            required
          />
          <input
            className="field md:col-span-2"
            type="date"
            value={newExpiry}
            onChange={(event) => setNewExpiry(event.target.value)}
          />
          <button className="btn-primary md:col-span-2" type="submit" disabled={busy}>
            {busy ? "Saving..." : "Create user and enqueue provisioning"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Edit User / Subscription</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={updateUser}>
          <input
            className="field"
            type="number"
            min={1}
            placeholder="User ID"
            value={updateUserId}
            onChange={(event) => setUpdateUserId(event.target.value)}
            required
          />
          <input className="field" placeholder="Email (optional)" value={updateEmail} onChange={(event) => setUpdateEmail(event.target.value)} />
          <select className="field" value={updateRole} onChange={(event) => setUpdateRole(event.target.value as "" | "admin" | "user")}>
            <option value="">Role (unchanged)</option>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <input
            className="field"
            type="number"
            min={1}
            placeholder="Quota (optional)"
            value={updateQuota}
            onChange={(event) => setUpdateQuota(event.target.value)}
          />
          <input
            className="field md:col-span-2"
            type="date"
            value={updateExpiry}
            onChange={(event) => setUpdateExpiry(event.target.value)}
          />
          <button className="btn-secondary md:col-span-2" type="submit" disabled={busy}>
            {busy ? "Updating..." : "Update user"}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">User List</h2>
          <button className="btn-secondary" onClick={fetchUsers}>
            Refresh
          </button>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2">ID</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Expiry</th>
                <th className="pb-2">Quota</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2">{row.id}</td>
                  <td className="py-2">{row.email}</td>
                  <td className="py-2">{row.role}</td>
                  <td className="py-2">{row.subscription ? new Date(row.subscription.expiryDate).toLocaleDateString() : "-"}</td>
                  <td className="py-2">{row.subscription?.quota ?? "-"}</td>
                  <td className="py-2">
                    {row.subscription?.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">active</span>
                    ) : (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
