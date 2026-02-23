"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import DaySetupPanel from "@/components/coordinator/DaySetupPanel";
import ColleagueRow from "@/components/coordinator/ColleagueRow";
import ArrivalAlerts from "@/components/coordinator/ArrivalAlerts";
import { api, getRole } from "@/lib/api";
import { connectWs, addWsListener } from "@/lib/ws";
import type { Colleague, WorkingDay, PatientArrival, ActiveSession } from "@/lib/types";

export default function AdminDashboard() {
  const router = useRouter();

  const [allColleagues, setAllColleagues] = useState<Colleague[]>([]);
  const [workingDay, setWorkingDay] = useState<WorkingDay | null>(null);
  const [arrivals, setArrivals] = useState<PatientArrival[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"coordinator" | "sessions">("coordinator");

  useEffect(() => {
    const role = getRole();
    if (role !== "ADMIN") router.replace("/");
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [cols, day, arriv, sess] = await Promise.all([
        api.getColleagues(),
        api.getTodayWorkingDay(),
        api.getTodayArrivals(),
        api.getActiveSessions(),
      ]);
      setAllColleagues(cols);
      setWorkingDay(day);
      setArrivals(arriv);
      setSessions(sess);
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
      if (msg.type === "STATUS_CHANGED") {
        fetchData();
      }
      if (msg.type === "PATIENT_ARRIVED") {
        setArrivals((prev) => {
          const a = msg.payload as PatientArrival;
          return prev.some((x) => x.id === a.id) ? prev : [a, ...prev];
        });
      }
      if (msg.type === "SESSION_CHANGED") {
        api.getActiveSessions().then(setSessions).catch(console.error);
      }
    });

    return () => {
      remove();
    };
  }, [fetchData]);

  async function handleForceLogout(userId: string) {
    setLoggingOut(userId);
    try {
      await api.adminLogoutUser(userId);
      setSessions((prev) => prev.filter((s) => s.userId !== userId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoggingOut(null);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Admin">
        <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>
      </DashboardLayout>
    );
  }

  const workingColleagues = (workingDay?.colleagues ?? []).map((cod) => cod.colleague);
  const activeTasks = workingDay?.taskAllocations ?? [];

  function getActiveTask(colleagueId: string) {
    return (
      activeTasks.find(
        (t) => t.colleagueId === colleagueId && t.status !== "COMPLETED"
      ) ?? null
    );
  }

  const assignableWorking = workingColleagues.filter((c) => c.isAssignable);

  return (
    <DashboardLayout title="Admin">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("coordinator")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === "coordinator"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Coordinator View
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === "sessions"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Active Logins
          {sessions.length > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {sessions.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "coordinator" && (
        <>
          {/* Patient arrival alerts */}
          <ArrivalAlerts
            arrivals={arrivals}
            onAcknowledged={(id) =>
              setArrivals((prev) =>
                prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
              )
            }
          />

          {/* Day Setup — admin is never time-locked */}
          <div className="mb-6">
            <DaySetupPanel
              allColleagues={allColleagues}
              workingDayId={workingDay?.id ?? null}
              currentWorking={workingColleagues}
              locked={false}
              onSaved={(updated) =>
                setWorkingDay((prev) =>
                  prev
                    ? { ...prev, colleagues: updated.map((c) => ({ id: c.id, colleague: c })) }
                    : null
                )
              }
            />
          </div>

          {/* Task Board */}
          <div className="bg-white rounded-2xl shadow p-6">
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

            {!workingDay || workingColleagues.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                No working colleagues set for today. Use Day Setup above to add colleagues.
              </p>
            ) : (
              <>
                {assignableWorking.length === 0 && (
                  <p className="text-sm text-slate-400 italic mb-3">
                    No assignable colleagues working today.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {assignableWorking.map((c) => (
                    <ColleagueRow
                      key={c.id}
                      colleague={c}
                      activeTask={getActiveTask(c.id)}
                      workingDayId={workingDay.id}
                      onUpdated={fetchData}
                    />
                  ))}
                </div>

                {/* Non-assignable colleagues (e.g. Iqbal) */}
                {workingColleagues
                  .filter((c) => !c.isAssignable)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="mt-3 flex items-center gap-3 text-sm text-slate-400 italic"
                    >
                      <span>{c.name}</span>
                      <span className="text-xs">(Manager — not assigned tasks)</span>
                    </div>
                  ))}
              </>
            )}
          </div>
        </>
      )}

      {activeTab === "sessions" && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Active Logins</h2>
          <p className="text-sm text-slate-500 mb-4">
            Currently logged-in users. You can force logout any user below.
          </p>

          {sessions.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No active sessions.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border border-slate-200 rounded-xl px-5 py-4"
                >
                  <div>
                    <p className="font-semibold text-slate-800 capitalize">{s.username}</p>
                    <p className="text-xs text-slate-500">
                      Role: <span className="font-medium">{s.role}</span> · Logged in:{" "}
                      {new Date(s.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {s.role !== "ADMIN" ? (
                    <button
                      onClick={() => handleForceLogout(s.userId)}
                      disabled={loggingOut === s.userId}
                      className="text-xs bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold transition"
                    >
                      {loggingOut === s.userId ? "Logging out…" : "Force Logout"}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Current session</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
