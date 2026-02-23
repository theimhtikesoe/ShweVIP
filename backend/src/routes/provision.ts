import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { enqueueProvisionJob } from "../queue/provisionQueue";
import { authenticate, requireRole } from "../services/authGuard";

const provisionBodySchema = z.object({
  userId: z.number().int().positive(),
  serverId: z.number().int().positive().optional()
});

const provisionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/provision",
    {
      preHandler: [authenticate, requireRole("admin")]
    },
    async (request, reply) => {
      const body = provisionBodySchema.parse(request.body);

      const user = await fastify.repository.getUserById(body.userId);
      if (!user) {
        throw reply.notFound("User not found");
      }

      const server = body.serverId
        ? await fastify.repository.getServerById(body.serverId)
        : await fastify.repository.getFirstOnlineServer();

      if (!server) {
        throw reply.badRequest("No available server for provisioning");
      }

      const jobId = await enqueueProvisionJob(fastify.provisionQueue, {
        userId: user.id,
        serverId: server.id,
        triggeredBy: "manual"
      });

      return reply.code(202).send({
        jobId,
        userId: user.id,
        serverId: server.id
      });
    }
  );
};

export default provisionRoutes;
