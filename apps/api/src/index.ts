import Fastify from "fastify";
import cors from "@fastify/cors";
import jwtPlugin from "@fastify/jwt";
import websocket from "@fastify/websocket";
import { PrismaClient } from "@bogcat/db";

import { authRoutes } from "./routes/auth.js";
import { colleagueRoutes } from "./routes/colleagues.js";
import { workingDayRoutes } from "./routes/workingDay.js";
import { taskRoutes } from "./routes/tasks.js";
import { patientRoutes } from "./routes/patients.js";
import { wsHandler } from "./ws/handler.js";
import { startTimerLoop } from "./ws/timerLoop.js";

const app = Fastify({ logger: true });
export const prisma = new PrismaClient();

await app.register(cors, {
  origin: process.env.WEB_URL ?? "http://localhost:3000",
  credentials: true,
});

await app.register(jwtPlugin, {
  secret: process.env.JWT_SECRET ?? "bogcat-dev-secret",
});

await app.register(websocket);

// Decorate with authenticate helper used by route preHandlers
app.decorate(
  "authenticate",
  async (request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorised" });
    }
  }
);

// Routes
await app.register(authRoutes, { prefix: "/auth" });
await app.register(colleagueRoutes, { prefix: "/colleagues" });
await app.register(workingDayRoutes, { prefix: "/working-days" });
await app.register(taskRoutes, { prefix: "/tasks" });
await app.register(patientRoutes, { prefix: "/patients" });

// WebSocket endpoint
app.get("/ws", { websocket: true }, wsHandler);

// Health check
app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
console.log(`🚀 API listening on http://0.0.0.0:${port}`);

startTimerLoop();
