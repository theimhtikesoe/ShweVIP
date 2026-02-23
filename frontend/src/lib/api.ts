"use client";

export interface AuthUser {
  id: number;
  email: string;
  role: "admin" | "user";
}

export interface AuthState {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const AUTH_STORAGE_KEY = "pnm-auth";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAuthState(): AuthState | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function setAuthState(value: AuthState): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
}

export function clearAuthState(): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function refreshAccessToken(state: AuthState): Promise<AuthState | null> {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken: state.refreshToken })
  });

  if (!response.ok) {
    clearAuthState();
    return null;
  }

  const body = (await response.json()) as { accessToken: string };
  const updated: AuthState = {
    ...state,
    accessToken: body.accessToken
  };

  setAuthState(updated);
  return updated;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const raw = await response.text();

    try {
      const body = JSON.parse(raw) as { message?: string };
      throw new Error(body.message ?? "Request failed");
    } catch {
      throw new Error(raw || "Request failed");
    }
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = true
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let authState = getAuthState();
  if (requiresAuth && authState?.accessToken) {
    headers.set("Authorization", `Bearer ${authState.accessToken}`);
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && requiresAuth && authState?.refreshToken) {
    authState = await refreshAccessToken(authState);

    if (authState?.accessToken) {
      headers.set("Authorization", `Bearer ${authState.accessToken}`);
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
      });
    }
  }

  return parseResponse<T>(response);
}
