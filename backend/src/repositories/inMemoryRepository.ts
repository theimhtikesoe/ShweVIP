import { randomUUID } from "node:crypto";
import {
  AuthSession,
  DashboardStats,
  ServerNode,
  Subscription,
  TunnelSession,
  User,
  UserConfig
} from "../types/domain";
import {
  CreateAuthSessionInput,
  CreateServerInput,
  CreateUserInput,
  DataRepository,
  UpdateServerInput,
  UpdateUserInput,
  UpsertSubscriptionInput
} from "./repository";

export class InMemoryRepository implements DataRepository {
  private userIdCounter = 1;
  private subscriptionIdCounter = 1;
  private serverIdCounter = 1;
  private tunnelSessionIdCounter = 1;
  private configIdCounter = 1;

  private users: User[] = [];
  private subscriptions: Subscription[] = [];
  private servers: ServerNode[] = [];
  private authSessions: AuthSession[] = [];
  private tunnelSessions: TunnelSession[] = [];
  private userConfigs: UserConfig[] = [];

  async createUser(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: this.userIdCounter++,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      createdAt: new Date()
    };

    this.users.push(user);
    return user;
  }

  async listUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async updateUser(id: number, input: UpdateUserInput): Promise<User | null> {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      return null;
    }

    if (input.email !== undefined) {
      user.email = input.email;
    }

    if (input.role !== undefined) {
      user.role = input.role;
    }

    return user;
  }

  async upsertSubscription(userId: number, input: UpsertSubscriptionInput): Promise<Subscription> {
    const existing = this.subscriptions.find((item) => item.userId === userId);

    if (existing) {
      existing.startDate = input.startDate;
      existing.expiryDate = input.expiryDate;
      existing.quota = input.quota;
      existing.updatedAt = new Date();
      return existing;
    }

    const subscription: Subscription = {
      id: this.subscriptionIdCounter++,
      userId,
      startDate: input.startDate,
      expiryDate: input.expiryDate,
      quota: input.quota,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.subscriptions.push(subscription);
    return subscription;
  }

  async getSubscriptionByUserId(userId: number): Promise<Subscription | null> {
    return this.subscriptions.find((item) => item.userId === userId) ?? null;
  }

  async createServer(input: CreateServerInput): Promise<ServerNode> {
    const server: ServerNode = {
      id: this.serverIdCounter++,
      ip: input.ip,
      region: input.region,
      status: input.status,
      failoverEnabled: input.failoverEnabled,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.servers.push(server);
    return server;
  }

  async listServers(): Promise<ServerNode[]> {
    return [...this.servers];
  }

  async getServerById(id: number): Promise<ServerNode | null> {
    return this.servers.find((item) => item.id === id) ?? null;
  }

  async getFirstOnlineServer(): Promise<ServerNode | null> {
    return this.servers.find((item) => item.status === "online") ?? null;
  }

  async updateServer(id: number, input: UpdateServerInput): Promise<ServerNode | null> {
    const server = this.servers.find((item) => item.id === id);
    if (!server) {
      return null;
    }

    if (input.ip !== undefined) {
      server.ip = input.ip;
    }

    if (input.region !== undefined) {
      server.region = input.region;
    }

    if (input.status !== undefined) {
      server.status = input.status;
    }

    if (input.failoverEnabled !== undefined) {
      server.failoverEnabled = input.failoverEnabled;
    }

    server.updatedAt = new Date();
    return server;
  }

  async deleteServer(id: number): Promise<boolean> {
    const index = this.servers.findIndex((item) => item.id === id);
    if (index < 0) {
      return false;
    }

    this.servers.splice(index, 1);
    return true;
  }

  async createAuthSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const session: AuthSession = {
      id: input.id || randomUUID(),
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
      revokedAt: null
    };

    this.authSessions.push(session);
    return session;
  }

  async getAuthSessionById(id: string): Promise<AuthSession | null> {
    return this.authSessions.find((item) => item.id === id) ?? null;
  }

  async listAuthSessionsByUserId(userId: number): Promise<AuthSession[]> {
    return this.authSessions
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async revokeAuthSession(id: string): Promise<void> {
    const session = this.authSessions.find((item) => item.id === id);
    if (session) {
      session.revokedAt = new Date();
    }
  }

  async createTunnelSession(userId: number, serverId: number, networkUsage: number): Promise<TunnelSession> {
    const session: TunnelSession = {
      id: this.tunnelSessionIdCounter++,
      userId,
      serverId,
      startedAt: new Date(),
      networkUsage
    };

    this.tunnelSessions.push(session);
    return session;
  }

  async listTunnelSessionsByUserId(userId: number): Promise<TunnelSession[]> {
    return this.tunnelSessions
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async saveUserConfig(userId: number, serverId: number, configText: string): Promise<UserConfig> {
    const config: UserConfig = {
      id: this.configIdCounter++,
      userId,
      serverId,
      configText,
      createdAt: new Date()
    };

    this.userConfigs.push(config);
    return config;
  }

  async getLatestUserConfig(userId: number): Promise<UserConfig | null> {
    const sorted = this.userConfigs
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return sorted[0] ?? null;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const activeSubscriptions = this.subscriptions.filter(
      (item) => item.expiryDate.getTime() >= Date.now()
    ).length;

    const totalTraffic = this.tunnelSessions.reduce((acc, item) => acc + item.networkUsage, 0);

    return {
      userCount: this.users.length,
      activeSubscriptions,
      serverCount: this.servers.length,
      activeSessions: this.tunnelSessions.length,
      totalTraffic
    };
  }
}
