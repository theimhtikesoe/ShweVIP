import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().optional(),
  PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(16).optional(),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  PROVISION_SSH_USER: z.string().default("root"),
  PROVISION_SSH_PRIVATE_KEY: z.string().default("/run/secrets/pnm_ssh_key"),
  PROVISION_SSH_PRIVATE_KEY_B64: z.string().optional(),
  PROVISION_SERVICE_RELOAD_CMD: z.string().default("wg-quick save wg0"),
  PROVISION_DRY_RUN: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  WG_INTERFACE: z.string().default("wg0"),
  WG_SERVER_ENDPOINT: z.string().optional(),
  WG_SERVER_PORT: z.coerce.number().default(51820),
  WG_SERVER_PUBLIC_KEY: z.string().optional(),
  WG_ALLOWED_IPS: z.string().default("0.0.0.0/0"),
  WG_DNS: z.string().default("1.1.1.1"),
  WG_PERSISTENT_KEEPALIVE: z.coerce.number().default(25),
  WG_CLIENT_NETWORK_PREFIX: z.string().default("10.10"),
  WG_CLIENT_HOST_OFFSET: z.coerce.number().default(2)
});

const parsedEnv = envSchema.parse(process.env);
const runningTests =
  parsedEnv.NODE_ENV === "test" || process.env.VITEST === "true";

function requireEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

export const env = {
  ...parsedEnv,
  DATABASE_URL: runningTests
    ? parsedEnv.DATABASE_URL ?? "postgresql://test:test@localhost:5432/pnm_test"
    : requireEnv(parsedEnv.DATABASE_URL, "DATABASE_URL"),
  REDIS_URL: runningTests
    ? parsedEnv.REDIS_URL ?? "redis://localhost:6379"
    : requireEnv(parsedEnv.REDIS_URL, "REDIS_URL"),
  JWT_ACCESS_SECRET: runningTests
    ? parsedEnv.JWT_ACCESS_SECRET ??
      "test_access_secret_1234567890_test_access"
    : requireEnv(parsedEnv.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: runningTests
    ? parsedEnv.JWT_REFRESH_SECRET ??
      "test_refresh_secret_1234567890_test_refresh"
    : requireEnv(parsedEnv.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET"),
  BACKEND_PORT: parsedEnv.BACKEND_PORT ?? parsedEnv.PORT ?? 4000
};
