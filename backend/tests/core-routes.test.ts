import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import { useTestContext } from "./helpers";
import { hashPassword } from "../src/utils/security";

async function login(app: FastifyInstance, email: string, password: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password }
  });

  expect(response.statusCode).toBe(200);
  return response.json().accessToken;
}

describe("core admin and dashboard routes", () => {
  const { app, repository, queue } = useTestContext();

  beforeAll(async () => {
    await app.ready();

    await repository.createUser({
      email: "admin@pnm.local",
      passwordHash: await hashPassword("AdminPass123"),
      role: "admin"
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates server and user, then exposes dashboard stats", async () => {
    const adminToken = await login(app, "admin@pnm.local", "AdminPass123");

    const createServerResponse = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        ip: "10.0.0.10",
        region: "us-east",
        status: "online",
        failoverEnabled: true
      }
    });

    expect(createServerResponse.statusCode).toBe(201);
    const serverId = createServerResponse.json().server.id;

    const createUserResponse = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        email: "member@pnm.local",
        password: "MemberPass123",
        role: "user",
        quota: 1024,
        serverId
      }
    });

    expect(createUserResponse.statusCode).toBe(201);
    expect(queue.add).toHaveBeenCalledTimes(1);

    const createdUserId = createUserResponse.json().user.id;

    const provisionResponse = await app.inject({
      method: "POST",
      url: "/api/provision",
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        userId: createdUserId,
        serverId
      }
    });

    expect(provisionResponse.statusCode).toBe(202);

    const statsResponse = await app.inject({
      method: "GET",
      url: "/api/dashboard/stats",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });

    expect(statsResponse.statusCode).toBe(200);
    const stats = statsResponse.json();
    expect(stats.userCount).toBeGreaterThanOrEqual(2);
    expect(stats.serverCount).toBeGreaterThanOrEqual(1);

    const userToken = await login(app, "member@pnm.local", "MemberPass123");
    const userDashboardResponse = await app.inject({
      method: "GET",
      url: "/api/dashboard/me",
      headers: {
        authorization: `Bearer ${userToken}`
      }
    });

    expect(userDashboardResponse.statusCode).toBe(200);
    expect(userDashboardResponse.json().subscription).not.toBeNull();
  });
});
