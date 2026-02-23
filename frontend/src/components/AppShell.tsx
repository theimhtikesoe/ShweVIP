"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { AuthUser } from "@/lib/api";

interface AppShellProps {
  title: string;
  user: AuthUser;
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({ title, user, onLogout, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200 text-ink">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Private Network Manager</h1>
            <p className="text-sm text-slate-600">{title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
              {user.role}
            </span>
            <span className="text-sm text-slate-600">{user.email}</span>
            <button
              onClick={onLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        <nav className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ul className="space-y-2 text-sm">
            {user.role === "admin" ? (
              <>
                <li>
                  <Link href="/admin/users" className="block rounded-md px-3 py-2 hover:bg-slate-100">
                    User Management
                  </Link>
                </li>
                <li>
                  <Link href="/admin/servers" className="block rounded-md px-3 py-2 hover:bg-slate-100">
                    Server Management
                  </Link>
                </li>
              </>
            ) : null}
            <li>
              <Link href="/dashboard" className="block rounded-md px-3 py-2 hover:bg-slate-100">
                Dashboard
              </Link>
            </li>
          </ul>
        </nav>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
