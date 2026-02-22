import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../index.js";

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

      // 3. Enforce single-session: reject if session already exists
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
      await prisma.session.create({
        data: { userId: user.id, token },
      });

      return reply.send({ token, role: user.role });
    }
  );

  // POST /auth/logout
  app.post(
    "/logout",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as { userId: string };
      await prisma.session.deleteMany({ where: { userId: payload.userId } });
      return reply.send({ message: "Logged out successfully" });
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
