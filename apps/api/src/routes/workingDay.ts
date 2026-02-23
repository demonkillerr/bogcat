import type { FastifyInstance } from "fastify";
import { prisma } from "../index.js";
import { broadcast } from "../ws/handler.js";

export async function workingDayRoutes(app: FastifyInstance) {
  // GET /working-days/today — get or create today's working day
  app.get(
    "/today",
    { preHandler: [app.authenticate] },
    async (_request, reply) => {
      const today = startOfToday();
      const workingDay = await prisma.workingDay.findUnique({
        where: { date: today },
        include: {
          colleagues: { include: { colleague: true } },
          taskAllocations: {
            where: { status: { not: "COMPLETED" } },
            include: { colleague: true },
            orderBy: { allocatedAt: "asc" },
          },
        },
      });
      return reply.send(workingDay ?? null);
    }
  );

  // POST /working-days/today/colleagues — set colleagues for today (only before 10AM)
  app.post<{ Body: { colleagueIds: string[] } }>(
    "/today/colleagues",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "COORDINATOR" && role !== "ADMIN") {
        return reply.code(403).send({ error: "Only the coordinator or admin can set up the working day" });
      }

      // Server-side 10AM lock check (admin bypasses)
      if (role !== "ADMIN") {
        const now = new Date();
        const lockHour = 10;
        if (now.getHours() >= lockHour) {
          return reply
            .code(403)
            .send({ error: "Working day setup is locked after 10:00 AM" });
        }
      }

      const today = startOfToday();
      const { colleagueIds } = request.body;

      // Upsert today's WorkingDay
      const workingDay = await prisma.workingDay.upsert({
        where: { date: today },
        update: {},
        create: { date: today },
      });

      // Replace ColleagueOnDay entries atomically
      await prisma.$transaction([
        prisma.colleagueOnDay.deleteMany({ where: { workingDayId: workingDay.id } }),
        prisma.colleagueOnDay.createMany({
          data: colleagueIds.map((colleagueId) => ({
            workingDayId: workingDay.id,
            colleagueId,
          })),
        }),
      ]);

      const updated = await prisma.workingDay.findUnique({
        where: { id: workingDay.id },
        include: { colleagues: { include: { colleague: true } } },
      });

      broadcast({ type: "DAY_SETUP_CHANGED", payload: { workingDayId: workingDay.id } });
      return reply.send(updated);
    }
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
