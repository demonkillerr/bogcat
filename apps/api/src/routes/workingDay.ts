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

      // Attach lunch fields to each colleague entry
      const result = workingDay
        ? {
            ...workingDay,
            colleagues: workingDay.colleagues.map((cod) => ({
              id: cod.id,
              colleague: cod.colleague,
              onLunch: cod.onLunch,
              lunchStartedAt: cod.lunchStartedAt,
            })),
          }
        : null;

      return reply.send(result);
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

  // POST /working-days/lunch — toggle lunch for a colleague
  app.post<{ Body: { colleagueOnDayId: string; onLunch: boolean } }>(
    "/lunch",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "COORDINATOR" && role !== "ADMIN") {
        return reply.code(403).send({ error: "Only the coordinator or admin can manage lunch breaks" });
      }

      const { colleagueOnDayId, onLunch } = request.body;

      // Validate time window: lunch can only start between 12:30 and 14:30 (admin bypasses)
      if (onLunch && role !== "ADMIN") {
        const now = new Date();
        const hours = now.getHours();
        const mins = now.getMinutes();
        const currentMins = hours * 60 + mins;
        if (currentMins < 12 * 60 + 30 || currentMins >= 14 * 60 + 30) {
          return reply.code(400).send({ error: "Lunch breaks can only be started between 12:30 PM and 2:30 PM" });
        }
      }

      const cod = await prisma.colleagueOnDay.update({
        where: { id: colleagueOnDayId },
        data: {
          onLunch,
          lunchStartedAt: onLunch ? new Date() : null,
        },
        include: { colleague: true },
      });

      broadcast({ type: "STATUS_CHANGED", payload: { lunch: { colleagueId: cod.colleagueId, onLunch, lunchStartedAt: cod.lunchStartedAt } } });
      return reply.send(cod);
    }
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
