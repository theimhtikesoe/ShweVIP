import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../services/authGuard";
import { getExpiryDateFromToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { createSessionId, hashToken, verifyPassword } from "../utils/security";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/api/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await fastify.repository.getUserByEmail(body.email);

    if (!user) {
      throw reply.unauthorized("Invalid credentials");
    }

    const isValidPassword = await verifyPassword(body.password, user.passwordHash);
    if (!isValidPassword) {
      throw reply.unauthorized("Invalid credentials");
    }

    const sessionId = createSessionId();
    const refreshToken = signRefreshToken(user.id, sessionId);
    const refreshTokenHash = hashToken(refreshToken);

    await fastify.repository.createAuthSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      userAgent: request.headers["user-agent"] ?? null,
      ipAddress: request.ip,
      expiresAt: getExpiryDateFromToken(refreshToken)
    });

    const accessToken = signAccessToken(user.id, user.role);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  });

  fastify.post("/api/auth/refresh", async (request, reply) => {
    const body = refreshSchema.parse(request.body);

    try {
      const payload = verifyRefreshToken(body.refreshToken);
      if (payload.type !== "refresh") {
        throw new Error("Unexpected token type");
      }

      const session = await fastify.repository.getAuthSessionById(payload.sid);
      if (!session) {
        throw reply.unauthorized("Session not found");
      }

      if (session.revokedAt || session.expiresAt.getTime() < Date.now()) {
        throw reply.unauthorized("Session expired");
      }

      if (session.userId !== Number(payload.sub)) {
        throw reply.unauthorized("Invalid refresh token");
      }

      if (hashToken(body.refreshToken) !== session.refreshTokenHash) {
        throw reply.unauthorized("Invalid refresh token");
      }

      const user = await fastify.repository.getUserById(session.userId);
      if (!user) {
        throw reply.unauthorized("User not found");
      }

      return {
        accessToken: signAccessToken(user.id, user.role)
      };
    } catch {
      throw reply.unauthorized("Invalid refresh token");
    }
  });

  fastify.post("/api/auth/logout", async (request, reply) => {
    const body = refreshSchema.parse(request.body);

    try {
      const payload = verifyRefreshToken(body.refreshToken);
      await fastify.repository.revokeAuthSession(payload.sid);
    } catch {
      // Logout should still return success even if token is already expired.
    }

    return { success: true };
  });

  fastify.get(
    "/api/auth/sessions",
    {
      preHandler: [authenticate]
    },
    async (request) => {
      const sessions = await fastify.repository.listAuthSessionsByUserId(request.authUser!.id);

      return {
        sessions: sessions.map((session) => ({
          id: session.id,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          revokedAt: session.revokedAt,
          isActive: !session.revokedAt && session.expiresAt.getTime() > Date.now()
        }))
      };
    }
  );
};

export default authRoutes;
