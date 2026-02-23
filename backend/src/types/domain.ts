export type UserRole = "admin" | "user";
export type ServerStatus = "online" | "offline" | "maintenance";

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

export interface Subscription {
  id: number;
  userId: number;
  startDate: Date;
  expiryDate: Date;
  quota: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServerNode {
  id: number;
  ip: string;
  region: string;
  status: ServerStatus;
  failoverEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TunnelSession {
  id: number;
  userId: number;
  serverId: number;
  startedAt: Date;
  networkUsage: number;
}

export interface AuthSession {
  id: string;
  userId: number;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface UserConfig {
  id: number;
  userId: number;
  serverId: number;
  configText: string;
  createdAt: Date;
}

export interface DashboardStats {
  userCount: number;
  activeSubscriptions: number;
  serverCount: number;
  activeSessions: number;
  totalTraffic: number;
}
