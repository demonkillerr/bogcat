"use client";

import type { OptometristCall } from "@/lib/types";
import { OPT_CALL_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";

interface Props {
  calls: OptometristCall[];
  onAcknowledged: (id: string) => void;
}

export default function OptCallAlerts({ calls, onAcknowledged }: Props) {
  const pending = calls.filter((c) => c.status === "PENDING");

  if (pending.length === 0) return null;

  async function handleAck(id: string) {
    try {
      await api.acknowledgeOptCall(id);
      onAcknowledged(id);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-2 mb-4">
      {pending.map((c) => (
        <div
          key={c.id}
          className="flex items-start gap-3 bg-purple-50 border border-purple-300 rounded-xl px-5 py-3 shadow animate-pulse"
        >
          <span className="text-xl">👁️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-800">
              Room {c.roomNumber} — {OPT_CALL_LABELS[c.taskType] ?? c.taskType}
            </p>
            <p className="text-sm text-purple-700">
              <strong>{c.optometristName}</strong>
              {" · "}
              {new Date(c.createdAt).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <button
            onClick={() => handleAck(c.id)}
            className="text-xs text-purple-700 hover:text-purple-900 border border-purple-400 rounded px-2 py-1 font-semibold transition"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
