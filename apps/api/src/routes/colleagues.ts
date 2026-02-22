import type { FastifyInstance } from "fastify";
import { prisma } from "../index.js";

export async function colleagueRoutes(app: FastifyInstance) {
  // GET /colleagues — return all colleagues (authenticated)
  app.get(
    "/",
    { preHandler: [app.authenticate] },
    async (_request, reply) => {
      const colleagues = await prisma.colleague.findMany({
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });
      return reply.send(colleagues);
    }
  );
}
