import type { FastifyInstance } from "fastify";
import { OptCallTaskType } from "@prisma/client";
import { prisma } from "../index.js";
import { broadcast } from "../ws/handler.js";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isAfter10AM(): boolean {
  const now = new Date();
  return now.getHours() >= 10;
}

export async function optometristRoutes(app: FastifyInstance) {
  // ─── Profile ─────────────────────────────────────────────────────────────

  // GET /optometrist/profile/today — get today's optometrist profile
  app.get(
    "/profile/today",
    { preHandler: [app.authenticate] },
    async (_request, reply) => {
      const today = startOfToday();
      const profile = await prisma.optometristProfile.findUnique({
        where: { date: today },
      });
      return reply.send(profile ?? null);
    }
  );

  // POST /optometrist/profile — create or update today's profile
  app.post<{ Body: { name: string; roomNumber: number } }>(
    "/profile",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "OPTOMETRIST" && role !== "ADMIN") {
        return reply.code(403).send({ error: "Only optometrist or admin can update the optometrist profile" });
      }

      const today = startOfToday();
      const existing = await prisma.optometristProfile.findUnique({ where: { date: today } });

      // Enforce 10AM lock unless admin
      if (existing?.locked && role !== "ADMIN") {
        return reply.code(403).send({ error: "Profile is locked for today (after 10:00 AM). Contact admin to make changes." });
      }

      const { name, roomNumber } = request.body;
      if (!name?.trim()) return reply.code(400).send({ error: "Name is required" });
      if (![1, 2, 3, 4].includes(roomNumber)) return reply.code(400).send({ error: "Room number must be 1–4" });

      // Lock when the profile is saved after 10AM
      const locked = isAfter10AM();

      const profile = await prisma.optometristProfile.upsert({
        where: { date: today },
        create: { date: today, name: name.trim(), roomNumber, locked },
        update: { name: name.trim(), roomNumber, ...(role === "ADMIN" ? {} : { locked }) },
      });

      broadcast({ type: "OPT_PROFILE_UPDATED", payload: profile });
      return reply.send(profile);
    }
  );

  // ─── Calls ────────────────────────────────────────────────────────────────

  // POST /optometrist/calls — submit a call for assistance
  app.post<{
    Body: {
      workingDayId: string;
      roomNumber: number;
      optometristName: string;
      taskType: OptCallTaskType;
    };
  }>(
    "/calls",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "OPTOMETRIST" && role !== "ADMIN") {
        return reply.code(403).send({ error: "Only optometrist or admin can submit calls" });
      }

      const { workingDayId, roomNumber, optometristName, taskType } = request.body;

      const call = await prisma.optometristCall.create({
        data: { workingDayId, roomNumber, optometristName, taskType },
      });

      broadcast({ type: "OPT_CALL", payload: call });
      return reply.send(call);
    }
  );

  // GET /optometrist/calls/today — get today's calls (coordinator / admin / optometrist)
  app.get(
    "/calls/today",
    { preHandler: [app.authenticate] },
    async (_request, reply) => {
      const today = startOfToday();
      const workingDay = await prisma.workingDay.findUnique({ where: { date: today } });
      if (!workingDay) return reply.send([]);

      const calls = await prisma.optometristCall.findMany({
        where: { workingDayId: workingDay.id },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(calls);
    }
  );

  // PATCH /optometrist/calls/:id/acknowledge — acknowledge a call
  app.patch<{ Params: { id: string } }>(
    "/calls/:id/acknowledge",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "COORDINATOR" && role !== "ADMIN") {
        return reply.code(403).send({ error: "Only coordinator or admin can acknowledge calls" });
      }

      const call = await prisma.optometristCall.update({
        where: { id: request.params.id },
        data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
      });

      broadcast({ type: "OPT_CALL_ACKNOWLEDGED", payload: call });
      return reply.send(call);
    }
  );
}
