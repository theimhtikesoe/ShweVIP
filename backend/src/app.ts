import Fastify, { FastifyError, FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { Queue } from "bullmq";
import { ZodError } from "zod";
import { DataRepository } from "./repositories/repository";
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import provisionRoutes from "./routes/provision";
import serversRoutes from "./routes/servers";
import usersRoutes from "./routes/users";
import { ProvisionJobData } from "./types/provision";

export interface BuildAppOptions {
  repository: DataRepository;
  provisionQueue: Queue<ProvisionJobData>;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true
  });

  app.register(sensible);
  app.register(cors, {
    origin: true,
    credentials: false
  });

  app.decorate("repository", options.repository);
  app.decorate("provisionQueue", options.provisionQueue);

  app.get("/api/health", async () => ({ ok: true }));

  app.register(authRoutes);
  app.register(usersRoutes);
  app.register(serversRoutes);
  app.register(dashboardRoutes);
  app.register(provisionRoutes);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: "Validation error",
        issues: error.issues
      });
    }

    const fastifyError = error as FastifyError;
    if (typeof fastifyError.statusCode === "number") {
      return reply.code(fastifyError.statusCode).send({ message: fastifyError.message });
    }

    app.log.error(error);
    return reply.code(500).send({ message: "Internal server error" });
  });

  return app;
}
