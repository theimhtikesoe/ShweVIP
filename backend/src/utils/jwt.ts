import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "../types/domain";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: "refresh";
}

export function signAccessToken(userId: number, role: UserRole): string {
  const payload: AccessTokenPayload = {
    sub: String(userId),
    role,
    type: "access"
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"]
  });
}

export function signRefreshToken(userId: number, sessionId: string): string {
  const payload: RefreshTokenPayload = {
    sub: String(userId),
    sid: sessionId,
    type: "refresh"
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function getExpiryDateFromToken(token: string): Date {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    throw new Error("Token is missing exp claim");
  }
  return new Date(decoded.exp * 1000);
}
