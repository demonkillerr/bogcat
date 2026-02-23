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
  app.post<{ Body: { colleagueOnDayId: string; onLunch: boolean; startTime?: string } }>(
    "/lunch",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "COORDINATOR" && role !== "ADMIN") {
        return reply.code(403).send({ error: "Only the coordinator or admin can manage lunch breaks" });
      }

      const { colleagueOnDayId, onLunch, startTime } = request.body;

      // Build the lunchStartedAt value
      let lunchStartedAt: Date | null = null;
      if (onLunch) {
        if (startTime) {
          // startTime is "HH:MM" — combine with today's date
          const [h, m] = startTime.split(":").map(Number);
          lunchStartedAt = new Date();
          lunchStartedAt.setHours(h, m, 0, 0);
        } else {
          lunchStartedAt = new Date();
        }
      }

      // Validate time window: lunch can only start between 12:30 and 14:30 (admin bypasses)
      if (onLunch && role !== "ADMIN") {
        const checkTime = lunchStartedAt!;
        const currentMins = checkTime.getHours() * 60 + checkTime.getMinutes();
        if (currentMins < 12 * 60 + 30 || currentMins >= 14 * 60 + 30) {
          return reply.code(400).send({ error: "Lunch breaks can only be started between 12:30 PM and 2:30 PM" });
        }
      }

      const cod = await prisma.colleagueOnDay.update({
        where: { id: colleagueOnDayId },
        data: {
          onLunch,
          lunchStartedAt,
        },
        include: { colleague: true },
      });

      broadcast({ type: "STATUS_CHANGED", payload: { lunch: { colleagueId: cod.colleagueId, onLunch, lunchStartedAt: cod.lunchStartedAt } } });
      return reply.send(cod);
    }
  );

  // GET /working-days/stats?weekOf=YYYY-MM-DD — weekly statistics (admin only)
  app.get<{ Querystring: { weekOf?: string } }>(
    "/stats",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "ADMIN") {
        return reply.code(403).send({ error: "Only admin can view statistics" });
      }

      // Determine the week: Monday–Sunday containing the given date (default: this week)
      const anchor = request.query.weekOf ? new Date(request.query.weekOf) : new Date();
      const day = anchor.getDay(); // 0=Sun
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(anchor);
      monday.setDate(anchor.getDate() + diffToMon);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7); // exclusive upper bound

      // Fetch all working days in the range with full relations
      const days = await prisma.workingDay.findMany({
        where: { date: { gte: monday, lt: sunday } },
        include: {
          colleagues: { include: { colleague: true } },
          taskAllocations: { include: { colleague: true } },
          patientArrivals: true,
        },
        orderBy: { date: "asc" },
      });

      // Build per-day summaries
      const dailySummaries = days.map((wd) => ({
        date: wd.date,
        colleaguesWorking: wd.colleagues.map((cod) => ({
          name: cod.colleague.name,
          type: cod.colleague.type,
          onLunch: cod.onLunch,
          lunchStartedAt: cod.lunchStartedAt,
        })),
        tasks: wd.taskAllocations.map((ta) => ({
          taskType: ta.taskType,
          colleagueName: ta.colleague.name,
          status: ta.status,
          allocatedAt: ta.allocatedAt,
          durationMins: ta.durationMins,
        })),
        arrivals: wd.patientArrivals.map((pa) => ({
          name: pa.name,
          reason: pa.reason,
          arrivedAt: pa.arrivedAt,
        })),
      }));

      // Aggregates across the week
      const allTasks = days.flatMap((d) => d.taskAllocations);
      const allArrivals = days.flatMap((d) => d.patientArrivals);

      // Tasks by type
      const tasksByType: Record<string, number> = {};
      for (const t of allTasks) {
        tasksByType[t.taskType] = (tasksByType[t.taskType] ?? 0) + 1;
      }

      // Tasks by colleague
      const tasksByColleague: Record<string, Record<string, number>> = {};
      for (const t of allTasks) {
        const name = t.colleague.name;
        if (!tasksByColleague[name]) tasksByColleague[name] = {};
        tasksByColleague[name][t.taskType] = (tasksByColleague[name][t.taskType] ?? 0) + 1;
      }

      // Arrivals by reason
      const arrivalsByReason: Record<string, number> = {};
      for (const a of allArrivals) {
        arrivalsByReason[a.reason] = (arrivalsByReason[a.reason] ?? 0) + 1;
      }

      // Lunch data
      const allLunches = days.flatMap((d) =>
        d.colleagues
          .filter((cod) => cod.lunchStartedAt)
          .map((cod) => ({
            date: d.date,
            colleagueName: cod.colleague.name,
            lunchStartedAt: cod.lunchStartedAt,
          }))
      );

      return reply.send({
        weekStart: monday.toISOString(),
        weekEnd: new Date(sunday.getTime() - 1).toISOString(),
        totalDays: days.length,
        totalTasks: allTasks.length,
        totalArrivals: allArrivals.length,
        tasksByType,
        tasksByColleague,
        arrivalsByReason,
        lunches: allLunches,
        dailySummaries,
      });
    }
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
