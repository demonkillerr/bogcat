import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Load .env from the monorepo root (relative to this file, not CWD)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

import Fastify from "fastify";
import cors from "@fastify/cors";
import jwtPlugin from "@fastify/jwt";
import websocket from "@fastify/websocket";
import { PrismaClient } from "@prisma/client";

import { authRoutes } from "./routes/auth.js";
import { colleagueRoutes } from "./routes/colleagues.js";
import { workingDayRoutes } from "./routes/workingDay.js";
import { taskRoutes } from "./routes/tasks.js";
import { patientRoutes } from "./routes/patients.js";
import { optometristRoutes } from "./routes/optometrist.js";
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

      // Verify session still exists in DB (enables admin force-logout)
      const payload = request.user as { userId: string };
      const token = request.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return reply.code(401).send({ error: "Unauthorised" });
      }
      const session = await prisma.session.findFirst({
        where: { userId: payload.userId, token },
      });
      if (!session) {
        return reply.code(401).send({ error: "Session revoked" });
      }
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
await app.register(optometristRoutes, { prefix: "/optometrist" });

// WebSocket endpoint
app.get("/ws", { websocket: true }, wsHandler);

// Health check
app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
console.log(`🚀 API listening on http://0.0.0.0:${port}`);

startTimerLoop();
