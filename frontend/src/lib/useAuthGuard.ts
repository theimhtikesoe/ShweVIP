"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthUser, clearAuthState, getAuthState } from "./api";

export function useAuthGuard(requiredRole?: AuthUser["role"]) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = getAuthState();

    if (!state) {
      router.replace("/login");
      return;
    }

    if (requiredRole && state.user.role !== requiredRole) {
      router.replace(state.user.role === "admin" ? "/admin/users" : "/dashboard");
      return;
    }

    setUser(state.user);
    setLoading(false);
  }, [requiredRole, router]);

  const logout = (): void => {
    clearAuthState();
    router.replace("/login");
  };

  return { user, loading, logout };
}
