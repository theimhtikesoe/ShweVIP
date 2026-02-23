import { FastifyInstance } from "fastify";
import { vi } from "vitest";
import { buildApp } from "../src/app";
import { InMemoryRepository } from "../src/repositories/inMemoryRepository";

export interface QueueMock {
  add: ReturnType<typeof vi.fn>;
}

export interface TestContext {
  app: FastifyInstance;
  repository: InMemoryRepository;
  queue: QueueMock;
}

export function useTestContext(): TestContext {
  const repository = new InMemoryRepository();
  const queue: QueueMock = {
    add: vi.fn(async () => ({ id: "job-1" }))
  };

  const app = buildApp({
    repository,
    provisionQueue: queue as any,
    logger: false
  });

  return { app, repository, queue };
}
