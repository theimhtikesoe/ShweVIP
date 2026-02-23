import { Pool } from "pg";
import { buildApp } from "./app";
import { env } from "./config/env";
import { createProvisionQueue } from "./queue/provisionQueue";
import { PostgresRepository } from "./repositories/postgresRepository";

async function start(): Promise<void> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const repository = new PostgresRepository(pool);
  const provisionQueue = createProvisionQueue(env.REDIS_URL);

  const app = buildApp({
    repository,
    provisionQueue,
    logger: env.NODE_ENV !== "test"
  });

  const shutdown = async (): Promise<void> => {
    await app.close();
    await provisionQueue.close();
    await pool.end();
  };

  process.on("SIGTERM", () => {
    shutdown().finally(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    shutdown().finally(() => process.exit(0));
  });

  await app.listen({
    host: "0.0.0.0",
    port: env.BACKEND_PORT
  });
}

start().catch((error) => {
  console.error("Failed to start API server", error);
  process.exit(1);
});
