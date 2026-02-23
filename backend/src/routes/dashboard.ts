import { FastifyPluginAsync } from "fastify";
import { authenticate, requireRole } from "../services/authGuard";

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/dashboard/stats",
    {
      preHandler: [authenticate, requireRole("admin")]
    },
    async () => {
      const stats = await fastify.repository.getDashboardStats();
      const servers = await fastify.repository.listServers();

      return {
        ...stats,
        serverStatusBreakdown: {
          online: servers.filter((server) => server.status === "online").length,
          offline: servers.filter((server) => server.status === "offline").length,
          maintenance: servers.filter((server) => server.status === "maintenance").length
        }
      };
    }
  );

  fastify.get(
    "/api/dashboard/me",
    {
      preHandler: [authenticate]
    },
    async (request) => {
      const userId = request.authUser!.id;

      const [subscription, sessions, latestConfig] = await Promise.all([
        fastify.repository.getSubscriptionByUserId(userId),
        fastify.repository.listTunnelSessionsByUserId(userId),
        fastify.repository.getLatestUserConfig(userId)
      ]);

      const totalUsage = sessions.reduce((total, session) => total + session.networkUsage, 0);
      const activeSubscription =
        subscription !== null && subscription.expiryDate.getTime() > Date.now();

      return {
        subscription: subscription
          ? {
              startDate: subscription.startDate,
              expiryDate: subscription.expiryDate,
              quota: subscription.quota,
              isActive: activeSubscription
            }
          : null,
        usage: {
          totalBytes: totalUsage,
          sessionCount: sessions.length
        },
        config: latestConfig
          ? {
              generatedAt: latestConfig.createdAt,
              serverId: latestConfig.serverId,
              downloadPath: "/api/users/me/config"
            }
          : null
      };
    }
  );
};

export default dashboardRoutes;
