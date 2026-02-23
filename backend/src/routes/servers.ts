import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "../services/authGuard";

const createServerSchema = z.object({
  ip: z.string().regex(/^\\d{1,3}(\\.\\d{1,3}){3}$/, "Expected IPv4 address"),
  region: z.string().min(2),
  status: z.enum(["online", "offline", "maintenance"]).default("online"),
  failoverEnabled: z.boolean().default(false)
});

const updateServerSchema = z
  .object({
    ip: z
      .string()
      .regex(/^\\d{1,3}(\\.\\d{1,3}){3}$/, "Expected IPv4 address")
      .optional(),
    region: z.string().min(2).optional(),
    status: z.enum(["online", "offline", "maintenance"]).optional(),
    failoverEnabled: z.boolean().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const serversRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/servers",
    {
      preHandler: [authenticate, requireRole("admin")]
    },
    async () => {
      const servers = await fastify.repository.listServers();
      return { servers };
    }
  );

  fastify.post(
    "/api/servers",
    {
      preHandler: [authenticate, requireRole("admin")]
    },
    async (request, reply) => {
      const body = createServerSchema.parse(request.body);

      const server = await fastify.repository.createServer(body);
      return reply.code(201).send({ server });
    }
  );

  fastify.patch(
    "/api/servers/:id",
    {
      preHandler: [authenticate, requireRole("admin")]
    },
    async (request, reply) => {
      const params = idParamSchema.parse(request.params);
      const body = updateServerSchema.parse(request.body);

      const server = await fastify.repository.updateServer(params.id, body);

      if (!server) {
        throw reply.notFound("Server not found");
      }

      return { server };
    }
  );

  fastify.delete(
    "/api/servers/:id",
    {
      preHandler: [authenticate, requireRole("admin")]
    },
    async (request, reply) => {
      const params = idParamSchema.parse(request.params);
      const removed = await fastify.repository.deleteServer(params.id);

      if (!removed) {
        throw reply.notFound("Server not found");
      }

      return { success: true };
    }
  );
};

export default serversRoutes;
