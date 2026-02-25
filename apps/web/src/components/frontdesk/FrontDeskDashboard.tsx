"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { api, getRole } from "@/lib/api";
import { connectWs, addWsListener } from "@/lib/ws";
import { ARRIVAL_REASON_LABELS } from "@/lib/constants";
import type { PatientArrival, WorkingDay } from "@/lib/types";

const REASONS = ["SIGHT_TEST", "COLLECTION", "ADJUSTMENT"] as const;

export default function FrontDeskDashboard() {
  const router = useRouter();

  const [workingDay, setWorkingDay] = useState<WorkingDay | null>(null);
  const [arrivals, setArrivals] = useState<PatientArrival[]>([]);

  const [name, setName] = useState("");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("SIGHT_TEST");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard
  useEffect(() => {
    const role = getRole();
    if (role !== "FRONTDESK") router.replace("/");
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [day, arriv] = await Promise.all([
        api.getTodayWorkingDay(),
        api.getTodayArrivals(),
      ]);
      setWorkingDay(day);
      setArrivals(arriv);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    connectWs();

    const remove = addWsListener((msg) => {
      if (msg.type === "DAY_SETUP_CHANGED" || msg.type === "STATUS_CHANGED") {
        fetchData();
      }
      if (msg.type === "PATIENT_ARRIVED") {
        setArrivals((prev) => {
          const a = msg.payload as PatientArrival;
          return prev.some((x) => x.id === a.id) ? prev : [a, ...prev];
        });
      }
      if (msg.type === "PATIENT_ACKNOWLEDGED") {
        const a = msg.payload as PatientArrival;
        setArrivals((prev) =>
          prev.map((x) => (x.id === a.id ? { ...x, acknowledged: true } : x))
        );
      }
    });

    return () => {
      remove();
    };
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!workingDay) {
      setError("No working day has been set up today. Please ask the coordinator.");
      return;
    }

    setSubmitting(true);
    try {
      const arrival = await api.notifyArrival({
        name,
        reason,
        workingDayId: workingDay.id,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setArrivals((prev) =>
        prev.some((x) => x.id === arrival.id) ? prev : [arrival, ...prev]
      );
      setName("");
      setNotes("");
      setReason("SIGHT_TEST");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to notify");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Front Desk">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Arrival form */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">Register Patient Arrival</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Jane Smith"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Visit</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as typeof reason)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {ARRIVAL_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Patient is in a hurry, needs quick collection"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                ✓ Coordinator has been notified.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition"
            >
              {submitting ? "Notifying…" : "🔔 Notify Coordinator"}
            </button>
          </form>
        </div>

        {/* Today's arrivals log */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Today&apos;s Arrivals</h2>

          {arrivals.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No arrivals logged yet today.</p>
          ) : (
            <div className="space-y-2">
              {arrivals.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-4 py-2.5 bg-slate-50"
                >
                  <div>
                    <span className="font-medium text-slate-800">{a.name}</span>
                    {a.notes && (
                      <span className="ml-2 text-xs text-slate-400 italic">{a.notes}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">{ARRIVAL_REASON_LABELS[a.reason]}</span>
                    <span className="ml-3 text-xs text-slate-400">
                      {new Date(a.arrivedAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {a.acknowledged && (
                      <span className="ml-2 text-xs text-green-600 font-semibold">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
