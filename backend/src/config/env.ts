import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().optional(),
  PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  PROVISION_SSH_USER: z.string().default("root"),
  PROVISION_SSH_PRIVATE_KEY: z.string().default("/run/secrets/pnm_ssh_key"),
  PROVISION_SERVICE_RELOAD_CMD: z.string().default("systemctl reload wg-quick@wg0"),
  PROVISION_DRY_RUN: z
    .string()
    .optional()
    .transform((value) => value !== "false")
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  BACKEND_PORT: parsedEnv.BACKEND_PORT ?? parsedEnv.PORT ?? 4000
};
