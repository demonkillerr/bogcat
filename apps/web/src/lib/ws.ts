const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws";

let socket: WebSocket | null = null;
type Listener = (msg: { type: string; payload: unknown }) => void;
const listeners = new Set<Listener>();

export function connectWs() {
  if (socket && socket.readyState < 2) return; // already open or connecting

  socket = new WebSocket(WS_URL);

  socket.onopen = () => console.log("[WS] Connected");
  socket.onclose = () => {
    console.log("[WS] Disconnected — reconnecting in 3s");
    setTimeout(connectWs, 3000);
  };
  socket.onerror = (e) => console.error("[WS] Error", e);
  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      listeners.forEach((fn) => fn(msg));
    } catch {
      // ignore malformed messages
    }
  };
}

export function disconnectWs() {
  socket?.close();
  socket = null;
}

export function addWsListener(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
