import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { enqueueProvisionJob } from "../queue/provisionQueue";
import { authenticate, requireRole } from "../services/authGuard";
import { parseDateInput } from "../utils/date";
import { hashPassword } from "../utils/security";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "user"]).default("user"),
  subscriptionExpiry: z.string().optional(),
  quota: z.number().int().positive().default(50_000_000_000),
  serverId: z.number().int().positive().optional()
});

const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    role: z.enum(["admin", "user"]).optional(),
    subscriptionExpiry: z.string().optional(),
    quota: z.number().int().positive().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/users",
    {
      preHandler: [authenticate, requireRole("admin")]
    },
    async () => {
      const users = await fastify.repository.listUsers();

      const userRows = await Promise.all(
        users.map(async (user) => {
          const subscription = await fastify.repository.getSubscriptionByUserId(user.id);

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            subscription: subscription
              ? {
                  startDate: subscription.startDate,
                  expiryDate: subscription.expiryDate,
                  quota: subscription.quota,
                  isActive: subscription.expiryDate.getTime() > Date.now()
                }
              : null
          };
        })
      );

      return { users: userRows };
    }
  );

  fastify.post(
    "/api/users",
    {
      preHandler: [authenticate, requireRole("admin")]
    },
    async (request, reply) => {
      const body = createUserSchema.parse(request.body);

      const existing = await fastify.repository.getUserByEmail(body.email);
      if (existing) {
        throw reply.conflict("Email already exists");
      }

      const passwordHash = await hashPassword(body.password);
      const user = await fastify.repository.createUser({
        email: body.email,
        passwordHash,
        role: body.role
      });

      const startDate = new Date();
      const expiryDate = body.subscriptionExpiry
        ? parseDateInput(body.subscriptionExpiry)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const subscription = await fastify.repository.upsertSubscription(user.id, {
        startDate,
        expiryDate,
        quota: body.quota
      });

      const server = body.serverId
        ? await fastify.repository.getServerById(body.serverId)
        : await fastify.repository.getFirstOnlineServer();

      let provisionJobId: string | null = null;

      if (server) {
        provisionJobId = await enqueueProvisionJob(fastify.provisionQueue, {
          userId: user.id,
          serverId: server.id,
          triggeredBy: "auto"
        });
      }

      return reply.code(201).send({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        },
        subscription,
        provisionJobId
      });
    }
  );

  fastify.patch(
    "/api/users/:id",
    {
      preHandler: [authenticate, requireRole("admin")]
    },
    async (request, reply) => {
      const params = idParamSchema.parse(request.params);
      const body = updateUserSchema.parse(request.body);

      const user = await fastify.repository.updateUser(params.id, {
        email: body.email,
        role: body.role
      });

      if (!user) {
        throw reply.notFound("User not found");
      }

      let subscription = await fastify.repository.getSubscriptionByUserId(user.id);

      if (body.subscriptionExpiry || body.quota !== undefined) {
        const startDate = subscription?.startDate ?? new Date();
        const expiryDate = body.subscriptionExpiry
          ? parseDateInput(body.subscriptionExpiry)
          : subscription?.expiryDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const quota = body.quota ?? subscription?.quota ?? 50_000_000_000;

        subscription = await fastify.repository.upsertSubscription(user.id, {
          startDate,
          expiryDate,
          quota
        });
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        },
        subscription
      };
    }
  );

  fastify.get(
    "/api/users/me/config",
    {
      preHandler: [authenticate]
    },
    async (request, reply) => {
      const config = await fastify.repository.getLatestUserConfig(request.authUser!.id);

      if (!config) {
        throw reply.notFound("No generated config for this user yet");
      }

      reply.type("text/plain");
      return config.configText;
    }
  );
};

export default usersRoutes;
