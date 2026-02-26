import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../index.js";
import { broadcast } from "../ws/handler.js";

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post<{ Body: { username: string; password: string } }>(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body;

      // 1. Validate password against env hash
      const hashedPassword = process.env.HASHED_PASSWORD;
      if (!hashedPassword) {
        return reply.code(500).send({ error: "Server misconfiguration: HASHED_PASSWORD not set" });
      }

      const passwordMatch = await bcrypt.compare(password, hashedPassword);
      if (!passwordMatch) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      // 2. Find the user account
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      // 3. Enforce single-session per account
      const existingSession = await prisma.session.findUnique({
        where: { userId: user.id },
      });

      if (existingSession) {
        return reply.code(409).send({
          error: `Account "${username}" is already logged in. Only one login is allowed at a time.`,
        });
      }

      // 4. Sign JWT
      const token = app.jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        { expiresIn: "12h" }
      );

      // 5. Persist session
      const session = await prisma.session.create({
        data: { userId: user.id, token },
      });

      broadcast({ type: "SESSION_CHANGED", payload: { event: "login", username: user.username } });
      return reply.send({ token, role: user.role, userId: user.id, sessionId: session.id });
    }
  );

  // POST /auth/logout
  app.post(
    "/logout",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as { userId: string; username: string };
      const token = request.headers.authorization?.replace("Bearer ", "");
      if (token) {
        await prisma.session.deleteMany({ where: { userId: payload.userId, token } });
      }
      broadcast({ type: "SESSION_CHANGED", payload: { event: "logout", username: payload.username } });
      return reply.send({ message: "Logged out successfully" });
    }
  );

  // GET /auth/sessions — admin only: list all active sessions
  app.get(
    "/sessions",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "ADMIN") {
        return reply.code(403).send({ error: "Only admin can view active sessions" });
      }

      const sessions = await prisma.session.findMany({
        include: { user: { select: { id: true, username: true, role: true } } },
        orderBy: { createdAt: "asc" },
      });

      const result = sessions.map((s: { id: string; createdAt: Date; user: { id: string; username: string; role: string } }) => ({
        id: s.id,
        userId: s.user.id,
        username: s.user.username,
        role: s.user.role,
        createdAt: s.createdAt,
      }));

      return reply.send(result);
    }
  );

  // DELETE /auth/sessions/:sessionId — admin only: force logout a specific session
  app.delete<{ Params: { sessionId: string } }>(
    "/sessions/:sessionId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role: string }).role;
      if (role !== "ADMIN") {
        return reply.code(403).send({ error: "Only admin can force logout users" });
      }

      const { sessionId } = request.params;

      // Find the session to get userId for broadcast
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });
      if (!session) {
        return reply.code(404).send({ error: "Session not found" });
      }

      // Prevent admin from force-logging out themselves
      const currentToken = request.headers.authorization?.replace("Bearer ", "");
      if (session.token === currentToken) {
        return reply.code(400).send({ error: "Cannot force logout yourself. Use the regular logout." });
      }

      await prisma.session.delete({ where: { id: sessionId } });
      broadcast({ type: "SESSION_CHANGED", payload: { event: "force_logout", userId: session.userId } });
      broadcast({ type: "FORCE_LOGOUT", payload: { sessionId, userId: session.userId } });
      return reply.send({ message: "Session terminated" });
    }
  );
}

// Extend FastifyInstance to include `authenticate`
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply
    ) => Promise<void>;
  }
}
