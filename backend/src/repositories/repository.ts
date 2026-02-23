import {
  AuthSession,
  DashboardStats,
  ServerNode,
  ServerStatus,
  Subscription,
  TunnelSession,
  User,
  UserConfig,
  UserRole
} from "../types/domain";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  role?: UserRole;
}

export interface UpsertSubscriptionInput {
  startDate: Date;
  expiryDate: Date;
  quota: number;
}

export interface CreateServerInput {
  ip: string;
  region: string;
  status: ServerStatus;
  failoverEnabled: boolean;
}

export interface UpdateServerInput {
  ip?: string;
  region?: string;
  status?: ServerStatus;
  failoverEnabled?: boolean;
}

export interface CreateAuthSessionInput {
  id: string;
  userId: number;
  refreshTokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
}

export interface DataRepository {
  createUser(input: CreateUserInput): Promise<User>;
  listUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: number, input: UpdateUserInput): Promise<User | null>;

  upsertSubscription(userId: number, input: UpsertSubscriptionInput): Promise<Subscription>;
  getSubscriptionByUserId(userId: number): Promise<Subscription | null>;

  createServer(input: CreateServerInput): Promise<ServerNode>;
  listServers(): Promise<ServerNode[]>;
  getServerById(id: number): Promise<ServerNode | null>;
  getFirstOnlineServer(): Promise<ServerNode | null>;
  updateServer(id: number, input: UpdateServerInput): Promise<ServerNode | null>;
  deleteServer(id: number): Promise<boolean>;

  createAuthSession(input: CreateAuthSessionInput): Promise<AuthSession>;
  getAuthSessionById(id: string): Promise<AuthSession | null>;
  listAuthSessionsByUserId(userId: number): Promise<AuthSession[]>;
  revokeAuthSession(id: string): Promise<void>;

  createTunnelSession(userId: number, serverId: number, networkUsage: number): Promise<TunnelSession>;
  listTunnelSessionsByUserId(userId: number): Promise<TunnelSession[]>;

  saveUserConfig(userId: number, serverId: number, configText: string): Promise<UserConfig>;
  getLatestUserConfig(userId: number): Promise<UserConfig | null>;

  getDashboardStats(): Promise<DashboardStats>;
}
