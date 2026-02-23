import { Queue } from "bullmq";
import IORedis from "ioredis";
import { ProvisionJobData } from "../types/provision";

export const PROVISION_QUEUE_NAME = "pnm-provision";

export function createRedisConnection(redisUrl: string): IORedis {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null
  });
}

export function createProvisionQueue(redisUrl: string): Queue<ProvisionJobData> {
  const connection = createRedisConnection(redisUrl);

  return new Queue<ProvisionJobData>(PROVISION_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: 200,
      removeOnFail: 200,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    }
  });
}

export async function enqueueProvisionJob(
  queue: Queue<ProvisionJobData>,
  data: ProvisionJobData
): Promise<string> {
  const job = await queue.add("provision-user", data);
  return String(job.id);
}
