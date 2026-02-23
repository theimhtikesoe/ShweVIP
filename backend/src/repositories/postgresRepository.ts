import { Pool } from "pg";
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

function mapUser(row: any): User {
  return {
    id: Number(row.id),
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: new Date(row.created_at)
  };
}

function mapSubscription(row: any): Subscription {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    startDate: new Date(row.start_date),
    expiryDate: new Date(row.expiry_date),
    quota: Number(row.quota),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function mapServer(row: any): ServerNode {
  return {
    id: Number(row.id),
    ip: row.ip,
    region: row.region,
    status: row.status,
    failoverEnabled: row.failover_enabled,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function mapAuthSession(row: any): AuthSession {
  return {
    id: row.id,
    userId: Number(row.user_id),
    refreshTokenHash: row.refresh_token_hash,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null
  };
}

function mapTunnelSession(row: any): TunnelSession {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    serverId: Number(row.server_id),
    startedAt: new Date(row.started_at),
    networkUsage: Number(row.network_usage)
  };
}

function mapUserConfig(row: any): UserConfig {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    serverId: Number(row.server_id),
    configText: row.config_text,
    createdAt: new Date(row.created_at)
  };
}

export class PostgresRepository implements DataRepository {
  constructor(private readonly pool: Pool) {}

  async createUser(input: CreateUserInput): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.email, input.passwordHash, input.role]
    );

    return mapUser(result.rows[0]);
  }

  async listUsers(): Promise<User[]> {
    const result = await this.pool.query(`SELECT * FROM users ORDER BY id ASC`);
    return result.rows.map(mapUser);
  }

  async getUserById(id: number): Promise<User | null> {
    const result = await this.pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async updateUser(id: number, input: UpdateUserInput): Promise<User | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.email !== undefined) {
      values.push(input.email);
      updates.push(`email = $${values.length}`);
    }

    if (input.role !== undefined) {
      values.push(input.role);
      updates.push(`role = $${values.length}`);
    }

    if (updates.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);
    const result = await this.pool.query(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async upsertSubscription(userId: number, input: UpsertSubscriptionInput): Promise<Subscription> {
    const result = await this.pool.query(
      `INSERT INTO subscriptions (user_id, start_date, expiry_date, quota)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         start_date = EXCLUDED.start_date,
         expiry_date = EXCLUDED.expiry_date,
         quota = EXCLUDED.quota,
         updated_at = NOW()
       RETURNING *`,
      [userId, input.startDate, input.expiryDate, input.quota]
    );

    return mapSubscription(result.rows[0]);
  }

  async getSubscriptionByUserId(userId: number): Promise<Subscription | null> {
    const result = await this.pool.query(`SELECT * FROM subscriptions WHERE user_id = $1`, [userId]);
    return result.rows[0] ? mapSubscription(result.rows[0]) : null;
  }

  async createServer(input: CreateServerInput): Promise<ServerNode> {
    const result = await this.pool.query(
      `INSERT INTO servers (ip, region, status, failover_enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.ip, input.region, input.status, input.failoverEnabled]
    );

    return mapServer(result.rows[0]);
  }

  async listServers(): Promise<ServerNode[]> {
    const result = await this.pool.query(`SELECT * FROM servers ORDER BY id ASC`);
    return result.rows.map(mapServer);
  }

  async getServerById(id: number): Promise<ServerNode | null> {
    const result = await this.pool.query(`SELECT * FROM servers WHERE id = $1`, [id]);
    return result.rows[0] ? mapServer(result.rows[0]) : null;
  }

  async getFirstOnlineServer(): Promise<ServerNode | null> {
    const result = await this.pool.query(
      `SELECT * FROM servers
       WHERE status = 'online'
       ORDER BY id ASC
       LIMIT 1`
    );

    return result.rows[0] ? mapServer(result.rows[0]) : null;
  }

  async updateServer(id: number, input: UpdateServerInput): Promise<ServerNode | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.ip !== undefined) {
      values.push(input.ip);
      updates.push(`ip = $${values.length}`);
    }

    if (input.region !== undefined) {
      values.push(input.region);
      updates.push(`region = $${values.length}`);
    }

    if (input.status !== undefined) {
      values.push(input.status);
      updates.push(`status = $${values.length}`);
    }

    if (input.failoverEnabled !== undefined) {
      values.push(input.failoverEnabled);
      updates.push(`failover_enabled = $${values.length}`);
    }

    if (updates.length === 0) {
      return this.getServerById(id);
    }

    values.push(id);
    const result = await this.pool.query(
      `UPDATE servers
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return result.rows[0] ? mapServer(result.rows[0]) : null;
  }

  async deleteServer(id: number): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM servers WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async createAuthSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const result = await this.pool.query(
      `INSERT INTO auth_sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.id,
        input.userId,
        input.refreshTokenHash,
        input.userAgent ?? null,
        input.ipAddress ?? null,
        input.expiresAt
      ]
    );

    return mapAuthSession(result.rows[0]);
  }

  async getAuthSessionById(id: string): Promise<AuthSession | null> {
    const result = await this.pool.query(`SELECT * FROM auth_sessions WHERE id = $1`, [id]);
    return result.rows[0] ? mapAuthSession(result.rows[0]) : null;
  }

  async listAuthSessionsByUserId(userId: number): Promise<AuthSession[]> {
    const result = await this.pool.query(
      `SELECT * FROM auth_sessions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(mapAuthSession);
  }

  async revokeAuthSession(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL`,
      [id]
    );
  }

  async createTunnelSession(userId: number, serverId: number, networkUsage: number): Promise<TunnelSession> {
    const result = await this.pool.query(
      `INSERT INTO sessions (user_id, server_id, network_usage)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, serverId, networkUsage]
    );

    return mapTunnelSession(result.rows[0]);
  }

  async listTunnelSessionsByUserId(userId: number): Promise<TunnelSession[]> {
    const result = await this.pool.query(
      `SELECT * FROM sessions
       WHERE user_id = $1
       ORDER BY started_at DESC`,
      [userId]
    );

    return result.rows.map(mapTunnelSession);
  }

  async saveUserConfig(userId: number, serverId: number, configText: string): Promise<UserConfig> {
    const result = await this.pool.query(
      `INSERT INTO user_configs (user_id, server_id, config_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, serverId, configText]
    );

    return mapUserConfig(result.rows[0]);
  }

  async getLatestUserConfig(userId: number): Promise<UserConfig | null> {
    const result = await this.pool.query(
      `SELECT * FROM user_configs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    return result.rows[0] ? mapUserConfig(result.rows[0]) : null;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const [users, subscriptions, servers, sessions] = await Promise.all([
      this.pool.query(`SELECT COUNT(*)::bigint AS count FROM users`),
      this.pool.query(
        `SELECT COUNT(*)::bigint AS count FROM subscriptions WHERE expiry_date >= CURRENT_DATE`
      ),
      this.pool.query(`SELECT COUNT(*)::bigint AS count FROM servers`),
      this.pool.query(
        `SELECT COUNT(*)::bigint AS active_count,
                COALESCE(SUM(network_usage), 0)::bigint AS total_traffic
         FROM sessions`
      )
    ]);

    return {
      userCount: Number(users.rows[0].count),
      activeSubscriptions: Number(subscriptions.rows[0].count),
      serverCount: Number(servers.rows[0].count),
      activeSessions: Number(sessions.rows[0].active_count),
      totalTraffic: Number(sessions.rows[0].total_traffic)
    };
  }
}
