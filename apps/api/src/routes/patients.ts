import type { FastifyInstance } from "fastify";
import { ArrivalReason } from "@bogcat/db";
import { prisma } from "../index.js";
import { broadcast } from "../ws/handler.js";

export async function patientRoutes(app: FastifyInstance) {
  // POST /patients/arrive — front desk notifies coordinator of new arrival
  app.post<{
    Body: { name: string; dob: string; reason: ArrivalReason; workingDayId: string };
  }>(
    "/arrive",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "FRONTDESK") {
        return reply.code(403).send({ error: "Only front desk can register patient arrivals" });
      }

      const { name, dob, reason, workingDayId } = request.body;

      const arrival = await prisma.patientArrival.create({
        data: {
          workingDayId,
          name,
          dob: new Date(dob),
          reason,
        },
      });

      broadcast({ type: "PATIENT_ARRIVED", payload: arrival });
      return reply.send(arrival);
    }
  );

  // GET /patients/today — all arrivals for today (coordinator / admin)
  app.get(
    "/today",
    { preHandler: [app.authenticate] },
    async (_request, reply) => {
      const today = startOfToday();
      const workingDay = await prisma.workingDay.findUnique({ where: { date: today } });
      if (!workingDay) return reply.send([]);

      const arrivals = await prisma.patientArrival.findMany({
        where: { workingDayId: workingDay.id },
        orderBy: { arrivedAt: "asc" },
      });
      return reply.send(arrivals);
    }
  );

  // PATCH /patients/:id/acknowledge
  app.patch<{ Params: { id: string } }>(
    "/:id/acknowledge",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const arrival = await prisma.patientArrival.update({
        where: { id: request.params.id },
        data: { acknowledged: true },
      });
      return reply.send(arrival);
    }
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
