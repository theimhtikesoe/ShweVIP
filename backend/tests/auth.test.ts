import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestContext } from "./helpers";
import { hashPassword } from "../src/utils/security";

describe("auth routes", () => {
  const { app, repository } = useTestContext();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("logs in and lists active sessions", async () => {
    const password = "SecurePass123";

    await repository.createUser({
      email: "admin@pnm.local",
      passwordHash: await hashPassword(password),
      role: "admin"
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "admin@pnm.local",
        password
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    const loginBody = loginResponse.json();
    expect(loginBody.accessToken).toBeTypeOf("string");
    expect(loginBody.refreshToken).toBeTypeOf("string");

    const sessionsResponse = await app.inject({
      method: "GET",
      url: "/api/auth/sessions",
      headers: {
        authorization: `Bearer ${loginBody.accessToken}`
      }
    });

    expect(sessionsResponse.statusCode).toBe(200);
    const sessionsBody = sessionsResponse.json();
    expect(sessionsBody.sessions).toHaveLength(1);
    expect(sessionsBody.sessions[0].isActive).toBe(true);
  });

  it("revokes refresh token on logout", async () => {
    const password = "UserPass123";

    await repository.createUser({
      email: "user@pnm.local",
      passwordHash: await hashPassword(password),
      role: "user"
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "user@pnm.local",
        password
      }
    });

    const loginBody = loginResponse.json();

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      payload: {
        refreshToken: loginBody.refreshToken
      }
    });

    expect(logoutResponse.statusCode).toBe(200);

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: {
        refreshToken: loginBody.refreshToken
      }
    });

    expect(refreshResponse.statusCode).toBe(401);
  });
});
