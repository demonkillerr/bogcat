import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../index.js";

export async function authenticate(
  request: FastifyRequest,
  reply: Parameters<Parameters<FastifyInstance["addHook"]>[1]>[1]
) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: "Unauthorised" });
  }
}
