"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { api, getRole } from "@/lib/api";
import { connectWs, addWsListener } from "@/lib/ws";
import { TASK_LABELS, ARRIVAL_REASON_LABELS } from "@/lib/constants";
import type { WorkingDay, PatientArrival } from "@/lib/types";

export default function AdminDashboard() {
  const router = useRouter();
  const [workingDay, setWorkingDay] = useState<WorkingDay | null>(null);
  const [arrivals, setArrivals] = useState<PatientArrival[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = getRole();
    if (role !== "ADMIN") router.replace("/");
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    connectWs();
    const remove = addWsListener((msg) => {
      if (msg.type === "STATUS_CHANGED" || msg.type === "PATIENT_ARRIVED") {
        fetchData();
      }
    });
    return () => remove();
  }, [fetchData]);

  if (loading) {
    return (
      <DashboardLayout title="Admin (Read-only)">
        <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>
      </DashboardLayout>
    );
  }

  const workingColleagues = (workingDay?.colleagues ?? []).map((cod) => cod.colleague);
  const activeTasks = workingDay?.taskAllocations ?? [];

  function getActiveTask(colleagueId: string) {
    return activeTasks.find((t) => t.colleagueId === colleagueId && t.status !== "COMPLETED") ?? null;
  }

  return (
    <DashboardLayout title="Admin (Read-only)">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task board — read-only */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Task Board</h2>
            <span className="text-sm text-slate-400">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>

          {workingColleagues.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No working colleagues set for today.</p>
          ) : (
            <div className="space-y-2">
              {workingColleagues.map((c) => {
                const task = getActiveTask(c.id);
                const isFree = !task;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between rounded-xl border px-5 py-3 ${
                      isFree ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div>
                      <span className="font-medium text-slate-800">{c.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{c.type === "OC" ? "OC" : "Manager"}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isFree
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-red-100 text-red-700 border border-red-300"
                        }`}
                      >
                        {isFree ? "FREE" : "BUSY"}
                      </span>
                      {task && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {TASK_LABELS[task.taskType] ?? task.taskType}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Patient arrivals log */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Patient Arrivals</h2>

          {arrivals.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No arrivals today.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {arrivals.map((a) => (
                <div
                  key={a.id}
                  className="border border-slate-100 rounded-lg px-4 py-2.5 bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-800">{a.name}</p>
                  <p className="text-xs text-slate-500">
                    DOB: {new Date(a.dob).toLocaleDateString("en-GB")} ·{" "}
                    {ARRIVAL_REASON_LABELS[a.reason]} ·{" "}
                    {new Date(a.arrivedAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {a.acknowledged && (
                      <span className="ml-2 text-green-600 font-semibold">✓ Ack'd</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
