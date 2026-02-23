"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AppShell } from "@/components/AppShell";
import { apiRequest } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

interface DashboardResponse {
  subscription: {
    startDate: string;
    expiryDate: string;
    quota: number;
    isActive: boolean;
  } | null;
  usage: {
    totalBytes: number;
    sessionCount: number;
  };
  config: {
    generatedAt: string;
    serverId: number;
    downloadPath: string;
  } | null;
}

function bytesToGb(value: number): string {
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuthGuard();
  const [state, setState] = useState<DashboardResponse | null>(null);
  const [configText, setConfigText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [downloadingQr, setDownloadingQr] = useState(false);

  const load = async () => {
    setError(null);

    try {
      const response = await apiRequest<DashboardResponse>("/dashboard/me");
      setState(response);
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  const downloadConfig = async () => {
    setError(null);

    try {
      const config = await apiRequest<string>("/users/me/config");
      setConfigText(config);
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  const downloadQr = async () => {
    if (!user) {
      return;
    }

    setError(null);
    setDownloadingQr(true);

    try {
      const config = await apiRequest<string>("/users/me/config");
      setConfigText(config);

      const dataUrl = await QRCode.toDataURL(config, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 1024
      });

      const safeUserName = user.email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-");

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `wireguard-${safeUserName || `user-${user.id}`}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setDownloadingQr(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading || !user) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  return (
    <AppShell title="User Dashboard" user={user} onLogout={logout}>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Subscription</h2>
          <p className="mt-2 text-2xl font-semibold">
            {state?.subscription?.isActive ? "Active" : "Inactive"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Expires: {state?.subscription ? new Date(state.subscription.expiryDate).toLocaleDateString() : "-"}
          </p>
          <p className="text-sm text-slate-600">Quota: {state?.subscription ? bytesToGb(state.subscription.quota) : "-"}</p>
        </article>

        <article className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Usage</h2>
          <p className="mt-2 text-2xl font-semibold">{bytesToGb(state?.usage.totalBytes ?? 0)}</p>
          <p className="mt-2 text-sm text-slate-600">Sessions: {state?.usage.sessionCount ?? 0}</p>
        </article>

        <article className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Config</h2>
          <p className="mt-2 text-sm text-slate-600">
            {state?.config
              ? `Generated ${new Date(state.config.generatedAt).toLocaleString()}`
              : "No config has been generated yet."}
          </p>
          <div className="mt-4 space-y-2">
            <button className="btn-primary w-full" onClick={downloadConfig}>
              Download Config
            </button>
            <button className="btn-secondary w-full" onClick={downloadQr} disabled={downloadingQr}>
              {downloadingQr ? "Generating QR..." : "Download QR"}
            </button>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Configuration Preview</h2>
          <button className="btn-secondary" onClick={load}>
            Refresh summary
          </button>
        </div>

        <pre className="max-h-[360px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-emerald-300">
          {configText || "Click \"Download Config\" to view your generated tunnel configuration."}
        </pre>
      </section>
    </AppShell>
  );
}
