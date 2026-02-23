import { Worker } from "bullmq";
import { Pool } from "pg";
import { env } from "./config/env";
import { createRedisConnection, PROVISION_QUEUE_NAME } from "./queue/provisionQueue";
import { PostgresRepository } from "./repositories/postgresRepository";
import { ProvisioningService } from "./services/provisioningService";
import { ProvisionJobData } from "./types/provision";

async function startWorker(): Promise<void> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const repository = new PostgresRepository(pool);
  const provisioningService = new ProvisioningService(repository);
  const connection = createRedisConnection(env.REDIS_URL);

  const worker = new Worker<ProvisionJobData>(
    PROVISION_QUEUE_NAME,
    async (job) => {
      const { userId, serverId } = job.data;
      await provisioningService.provisionUser(userId, serverId);
    },
    {
      connection,
      concurrency: 5
    }
  );

  worker.on("completed", (job) => {
    console.log(`Provisioning job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Provisioning job ${job?.id ?? "unknown"} failed`, error);
  });

  const shutdown = async (): Promise<void> => {
    await worker.close();
    await connection.quit();
    await pool.end();
  };

  process.on("SIGTERM", () => {
    shutdown().finally(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    shutdown().finally(() => process.exit(0));
  });
}

startWorker().catch((error) => {
  console.error("Worker failed", error);
  process.exit(1);
});
