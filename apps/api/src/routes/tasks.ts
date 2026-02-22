import type { FastifyInstance } from "fastify";
import { TaskType } from "@prisma/client";
import { prisma } from "../index.js";
import { broadcast } from "../ws/handler.js";

// Duration map in minutes
export const TASK_DURATIONS: Record<TaskType, number> = {
  PRE_SCREENING_FULL_SIGHT_TEST: 15,
  PRE_SCREENING_SUPPLEMENTARY: 10,
  POST_CHECKS: 10,
  DISPENSING_SINGLE_VISION: 30,
  DISPENSING_VARIFOCALS: 30,
  COLLECTION: 10,
  EGOS: 30,
  FILE_PULLING: 60,
  SCANNING: 60,
};

export async function taskRoutes(app: FastifyInstance) {
  // POST /tasks/assign
  app.post<{
    Body: { colleagueId: string; taskType: TaskType; workingDayId: string };
  }>(
    "/assign",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "COORDINATOR") {
        return reply.code(403).send({ error: "Only the coordinator can assign tasks" });
      }

      const { colleagueId, taskType, workingDayId } = request.body;

      // Check colleague is assignable
      const colleague = await prisma.colleague.findUnique({ where: { id: colleagueId } });
      if (!colleague?.isAssignable) {
        return reply.code(400).send({ error: "This colleague cannot be assigned tasks" });
      }

      // Check colleague is not already busy
      const activeTask = await prisma.taskAllocation.findFirst({
        where: { colleagueId, status: { in: ["ACTIVE", "EXTENDED"] } },
      });
      if (activeTask) {
        return reply.code(409).send({ error: "Colleague is already busy with another task" });
      }

      const durationMins = TASK_DURATIONS[taskType] ?? 15;
      const allocation = await prisma.taskAllocation.create({
        data: { workingDayId, colleagueId, taskType, durationMins },
        include: { colleague: true },
      });

      broadcast({ type: "STATUS_CHANGED", payload: { allocation } });
      return reply.send(allocation);
    }
  );

  // POST /tasks/:id/complete — mark task as complete, colleague becomes free
  app.post<{ Params: { id: string } }>(
    "/:id/complete",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "COORDINATOR") {
        return reply.code(403).send({ error: "Only the coordinator can complete tasks" });
      }

      const allocation = await prisma.taskAllocation.update({
        where: { id: request.params.id },
        data: { status: "COMPLETED" },
        include: { colleague: true },
      });

      broadcast({ type: "STATUS_CHANGED", payload: { allocation } });
      return reply.send(allocation);
    }
  );

  // POST /tasks/:id/extend — extend the task by additional minutes
  app.post<{ Params: { id: string }; Body: { extraMins: number } }>(
    "/:id/extend",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "COORDINATOR") {
        return reply.code(403).send({ error: "Only the coordinator can extend tasks" });
      }

      const existing = await prisma.taskAllocation.findUniqueOrThrow({
        where: { id: request.params.id },
      });

      // Calculate the new extendedUntil
      const baseDeadline =
        existing.extendedUntil ??
        new Date(existing.allocatedAt.getTime() + existing.durationMins * 60_000);
      const newDeadline = new Date(baseDeadline.getTime() + request.body.extraMins * 60_000);

      const allocation = await prisma.taskAllocation.update({
        where: { id: request.params.id },
        data: { extendedUntil: newDeadline, status: "EXTENDED" },
        include: { colleague: true },
      });

      broadcast({ type: "STATUS_CHANGED", payload: { allocation } });
      return reply.send(allocation);
    }
  );

  // POST /tasks/:id/reallocate — change the task type
  app.post<{ Params: { id: string }; Body: { taskType: TaskType } }>(
    "/:id/reallocate",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "COORDINATOR") {
        return reply.code(403).send({ error: "Only the coordinator can reallocate tasks" });
      }

      const newType = request.body.taskType;
      const durationMins = TASK_DURATIONS[newType] ?? 15;

      const allocation = await prisma.taskAllocation.update({
        where: { id: request.params.id },
        data: {
          taskType: newType,
          durationMins,
          allocatedAt: new Date(),
          extendedUntil: null,
          status: "ACTIVE",
        },
        include: { colleague: true },
      });

      broadcast({ type: "STATUS_CHANGED", payload: { allocation } });
      return reply.send(allocation);
    }
  );
}
