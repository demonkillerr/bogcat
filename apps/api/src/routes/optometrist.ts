import type { FastifyInstance } from "fastify";
import { OptCallTaskType } from "@prisma/client";
import { prisma } from "../index.js";
import { broadcast } from "../ws/handler.js";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function optometristRoutes(app: FastifyInstance) {
  // ─── Profiles ────────────────────────────────────────────────────────────

  // GET /optometrist/profiles/today — get all optometrist profiles for today
  app.get(
    "/profiles/today",
    { preHandler: [app.authenticate] },
    async (_request, reply) => {
      const today = startOfToday();
      const profiles = await prisma.optometristProfile.findMany({
        where: { date: today },
        orderBy: { roomNumber: "asc" },
      });
      return reply.send(profiles);
    }
  );

  // POST /optometrist/profile — claim a room for today (creates a new profile, locked immediately)
  app.post<{ Body: { name: string; roomNumber: number } }>(
    "/profile",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "OPTOMETRIST" && role !== "ADMIN") {
        return reply.code(403).send({ error: "Only optometrist or admin can create profiles" });
      }

      const { name, roomNumber } = request.body;
      if (!name?.trim()) return reply.code(400).send({ error: "Name is required" });
      if (![1, 2, 3, 4].includes(roomNumber)) return reply.code(400).send({ error: "Room number must be 1–4" });

      const today = startOfToday();

      // Check if the room is already taken today
      const existing = await prisma.optometristProfile.findUnique({
        where: { date_roomNumber: { date: today, roomNumber } },
      });

      if (existing) {
        if (role === "ADMIN") {
          // Admin can overwrite
          const updated = await prisma.optometristProfile.update({
            where: { id: existing.id },
            data: { name: name.trim() },
          });
          broadcast({ type: "OPT_PROFILES_UPDATED", payload: null });
          return reply.send(updated);
        }
        return reply.code(409).send({ error: `Room ${roomNumber} is already taken by ${existing.name}.` });
      }

      // Create new profile — locked immediately
      const profile = await prisma.optometristProfile.create({
        data: { date: today, name: name.trim(), roomNumber, locked: true },
      });

      broadcast({ type: "OPT_PROFILES_UPDATED", payload: null });
      return reply.send(profile);
    }
  );

  // PATCH /optometrist/profile/:id — admin only: update a profile
  app.patch<{ Params: { id: string }; Body: { name?: string; roomNumber?: number } }>(
    "/profile/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "ADMIN") {
        return reply.code(403).send({ error: "Only admin can edit locked profiles" });
      }

      const { name, roomNumber } = request.body;
      const today = startOfToday();

      // If changing room number, check for conflicts
      if (roomNumber !== undefined) {
        if (![1, 2, 3, 4].includes(roomNumber)) {
          return reply.code(400).send({ error: "Room number must be 1–4" });
        }
        const conflict = await prisma.optometristProfile.findFirst({
          where: { date: today, roomNumber, id: { not: request.params.id } },
        });
        if (conflict) {
          return reply.code(409).send({ error: `Room ${roomNumber} is already taken by ${conflict.name}.` });
        }
      }

      const profile = await prisma.optometristProfile.update({
        where: { id: request.params.id },
        data: {
          ...(name?.trim() ? { name: name.trim() } : {}),
          ...(roomNumber !== undefined ? { roomNumber } : {}),
        },
      });

      broadcast({ type: "OPT_PROFILES_UPDATED", payload: null });
      return reply.send(profile);
    }
  );

  // DELETE /optometrist/profile/:id — admin only: remove a profile
  app.delete<{ Params: { id: string } }>(
    "/profile/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "ADMIN") {
        return reply.code(403).send({ error: "Only admin can remove profiles" });
      }

      await prisma.optometristProfile.delete({ where: { id: request.params.id } });
      broadcast({ type: "OPT_PROFILES_UPDATED", payload: null });
      return reply.send({ message: "Profile removed" });
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
