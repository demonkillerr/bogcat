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

  // POST /colleagues — admin only: add a new colleague
  app.post<{ Body: { name: string; type: "OC" | "SENIOR_OC" | "MANAGER"; isAssignable?: boolean } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "ADMIN") {
        return reply.code(403).send({ error: "Only admin can add colleagues" });
      }

      const { name, type, isAssignable } = request.body;

      if (!name || !type) {
        return reply.code(400).send({ error: "Name and type are required" });
      }

      const existing = await prisma.colleague.findUnique({ where: { name } });
      if (existing) {
        return reply.code(409).send({ error: `Colleague "${name}" already exists` });
      }

      const colleague = await prisma.colleague.create({
        data: { name, type, isAssignable: isAssignable ?? true },
      });

      return reply.send(colleague);
    }
  );

  // PATCH /colleagues/:id — admin only: update colleague role/assignability
  app.patch<{ Params: { id: string }; Body: { type?: "OC" | "SENIOR_OC" | "MANAGER"; isAssignable?: boolean } }>(
    "/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "ADMIN") {
        return reply.code(403).send({ error: "Only admin can update colleagues" });
      }

      const { id } = request.params;
      const { type, isAssignable } = request.body;

      const data: Record<string, unknown> = {};
      if (type !== undefined) data.type = type;
      if (isAssignable !== undefined) data.isAssignable = isAssignable;

      const colleague = await prisma.colleague.update({
        where: { id },
        data,
      });

      return reply.send(colleague);
    }
  );

  // DELETE /colleagues/:id — admin only: remove a colleague
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "ADMIN") {
        return reply.code(403).send({ error: "Only admin can remove colleagues" });
      }

      const { id } = request.params;

      // Remove related records first (ColleagueOnDay, TaskAllocation)
      await prisma.$transaction([
        prisma.taskAllocation.deleteMany({ where: { colleagueId: id } }),
        prisma.colleagueOnDay.deleteMany({ where: { colleagueId: id } }),
        prisma.colleague.delete({ where: { id } }),
      ]);

      return reply.send({ message: "Colleague removed" });
    }
  );
}
