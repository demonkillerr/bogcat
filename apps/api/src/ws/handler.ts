import type { WebSocket } from "@fastify/websocket";
import type { FastifyRequest } from "fastify";

// All currently connected WebSocket clients
const clients = new Set<WebSocket>();

export function wsHandler(socket: WebSocket, _request: FastifyRequest) {
  clients.add(socket);

  socket.on("close", () => {
    clients.delete(socket);
  });

  socket.on("error", () => {
    clients.delete(socket);
  });
}

export function broadcast(message: unknown) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(data);
    }
  }
}
