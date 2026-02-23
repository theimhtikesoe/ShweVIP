import { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../utils/jwt";
import { UserRole } from "../types/domain";

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw reply.unauthorized("Missing bearer token");
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      throw new Error("Unexpected token type");
    }

    request.authUser = {
      id: Number(payload.sub),
      role: payload.role
    };
  } catch {
    throw reply.unauthorized("Invalid or expired token");
  }
}

export function requireRole(role: UserRole) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.authUser) {
      throw reply.unauthorized("Not authenticated");
    }

    if (request.authUser.role !== role) {
      throw reply.forbidden(`Requires ${role} role`);
    }
  };
}
