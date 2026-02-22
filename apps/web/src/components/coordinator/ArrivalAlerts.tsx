"use client";

import type { PatientArrival } from "@/lib/types";
import { ARRIVAL_REASON_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";

interface Props {
  arrivals: PatientArrival[];
  onAcknowledged: (id: string) => void;
}

export default function ArrivalAlerts({ arrivals, onAcknowledged }: Props) {
  const unacknowledged = arrivals.filter((a) => !a.acknowledged);

  if (unacknowledged.length === 0) return null;

  async function handleAck(id: string) {
    try {
      await api.acknowledgeArrival(id);
      onAcknowledged(id);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-2 mb-4">
      {unacknowledged.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 bg-yellow-50 border border-yellow-300 rounded-xl px-5 py-3 shadow animate-pulse"
        >
          <span className="text-xl">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">
              New patient arrival — {ARRIVAL_REASON_LABELS[a.reason] ?? a.reason}
            </p>
            <p className="text-sm text-yellow-700">
              <strong>{a.name}</strong> · DOB: {new Date(a.dob).toLocaleDateString("en-GB")} ·{" "}
              {new Date(a.arrivedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <button
            onClick={() => handleAck(a.id)}
            className="text-xs text-yellow-700 hover:text-yellow-900 border border-yellow-400 rounded px-2 py-1 font-semibold transition"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
