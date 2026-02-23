"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiRequest } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

interface ServerRow {
  id: number;
  ip: string;
  region: string;
  status: "online" | "offline" | "maintenance";
  failoverEnabled: boolean;
  createdAt: string;
}

export default function AdminServersPage() {
  const { user, loading, logout } = useAuthGuard("admin");
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [ip, setIp] = useState("10.0.0.10");
  const [region, setRegion] = useState("us-east");
  const [status, setStatus] = useState<ServerRow["status"]>("online");
  const [failoverEnabled, setFailoverEnabled] = useState(true);

  const [editId, setEditId] = useState("");
  const [editStatus, setEditStatus] = useState<"" | ServerRow["status"]>("");
  const [editFailover, setEditFailover] = useState<"" | "true" | "false">("");

  const [provisionUserId, setProvisionUserId] = useState("");
  const [provisionServerId, setProvisionServerId] = useState("");

  const [busy, setBusy] = useState(false);

  const fetchServers = async () => {
    try {
      const response = await apiRequest<{ servers: ServerRow[] }>("/servers");
      setServers(response.servers);
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      fetchServers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const createServer = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      await apiRequest("/servers", {
        method: "POST",
        body: JSON.stringify({ ip, region, status, failoverEnabled })
      });

      setIp("");
      setRegion("");
      await fetchServers();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const updateServer = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!editId) {
      setError("Server ID is required");
      return;
    }

    const payload: Record<string, unknown> = {};
    if (editStatus) payload.status = editStatus;
    if (editFailover) payload.failoverEnabled = editFailover === "true";

    setBusy(true);

    try {
      await apiRequest(`/servers/${editId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      setEditStatus("");
      setEditFailover("");
      await fetchServers();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeServer = async (id: number) => {
    if (!confirm(`Delete server ${id}?`)) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/servers/${id}`, {
        method: "DELETE"
      });
      await fetchServers();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const provision = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      await apiRequest("/provision", {
        method: "POST",
        body: JSON.stringify({
          userId: Number(provisionUserId),
          serverId: provisionServerId ? Number(provisionServerId) : undefined
        })
      });

      setProvisionUserId("");
      setProvisionServerId("");
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
    <AppShell title="Admin Server Console" user={user} onLogout={logout}>
      <section className="card">
        <h2 className="text-lg font-semibold">Add VPN Node</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={createServer}>
          <input className="field" placeholder="IPv4" value={ip} onChange={(event) => setIp(event.target.value)} required />
          <input className="field" placeholder="Region" value={region} onChange={(event) => setRegion(event.target.value)} required />
          <select className="field" value={status} onChange={(event) => setStatus(event.target.value as ServerRow["status"])}>
            <option value="online">online</option>
            <option value="offline">offline</option>
            <option value="maintenance">maintenance</option>
          </select>
          <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
            <input type="checkbox" checked={failoverEnabled} onChange={(event) => setFailoverEnabled(event.target.checked)} />
            Failover Enabled
          </label>
          <button className="btn-primary md:col-span-2" type="submit" disabled={busy}>
            Add server
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Update Node Status / Failover</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={updateServer}>
          <input
            className="field"
            type="number"
            min={1}
            placeholder="Server ID"
            value={editId}
            onChange={(event) => setEditId(event.target.value)}
            required
          />
          <select className="field" value={editStatus} onChange={(event) => setEditStatus(event.target.value as "" | ServerRow["status"])}>
            <option value="">Status (unchanged)</option>
            <option value="online">online</option>
            <option value="offline">offline</option>
            <option value="maintenance">maintenance</option>
          </select>
          <select className="field md:col-span-2" value={editFailover} onChange={(event) => setEditFailover(event.target.value as "" | "true" | "false") }>
            <option value="">Failover flag (unchanged)</option>
            <option value="true">enable failover</option>
            <option value="false">disable failover</option>
          </select>
          <button className="btn-secondary md:col-span-2" type="submit" disabled={busy}>
            Update server
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Manual Provision Trigger</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={provision}>
          <input
            className="field"
            type="number"
            min={1}
            placeholder="User ID"
            value={provisionUserId}
            onChange={(event) => setProvisionUserId(event.target.value)}
            required
          />
          <input
            className="field"
            type="number"
            min={1}
            placeholder="Server ID (optional)"
            value={provisionServerId}
            onChange={(event) => setProvisionServerId(event.target.value)}
          />
          <button className="btn-secondary md:col-span-2" type="submit" disabled={busy}>
            Queue provisioning job
          </button>
        </form>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Server List</h2>
          <button className="btn-secondary" onClick={fetchServers}>
            Refresh
          </button>
        </div>
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2">ID</th>
                <th className="pb-2">IP</th>
                <th className="pb-2">Region</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Failover</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((server) => (
                <tr key={server.id} className="border-b border-slate-100">
                  <td className="py-2">{server.id}</td>
                  <td className="py-2">{server.ip}</td>
                  <td className="py-2">{server.region}</td>
                  <td className="py-2">{server.status}</td>
                  <td className="py-2">{server.failoverEnabled ? "on" : "off"}</td>
                  <td className="py-2">
                    <button className="btn-secondary py-1 text-xs" onClick={() => removeServer(server.id)}>
                      Remove
                    </button>
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
