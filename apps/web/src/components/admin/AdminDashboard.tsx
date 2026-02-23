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

  const [activeTab, setActiveTab] = useState<"coordinator" | "sessions" | "settings">("coordinator");

  // Settings tab state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"OC" | "MANAGER">("OC");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      if (msg.type === "STATUS_CHANGED" || msg.type === "DAY_SETUP_CHANGED") {
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
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === "settings"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Settings
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
              onSaved={() => fetchData()}
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

      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Add new colleague */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Colleague</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSettingsError(null);
                setSettingsSuccess(null);
                if (!newName.trim()) {
                  setSettingsError("Name is required");
                  return;
                }
                setSavingSettings(true);
                try {
                  await api.addColleague({ name: newName.trim(), type: newType });
                  setAllColleagues(await api.getColleagues());
                  setNewName("");
                  setNewType("OC");
                  setSettingsSuccess(`${newName.trim()} added successfully`);
                  setTimeout(() => setSettingsSuccess(null), 3000);
                } catch (err: unknown) {
                  setSettingsError(err instanceof Error ? err.message : "Failed to add colleague");
                } finally {
                  setSavingSettings(false);
                }
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as "OC" | "MANAGER")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OC">Optical Consultant</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={savingSettings}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                {savingSettings ? "Adding…" : "Add Colleague"}
              </button>
            </form>
            {settingsError && (
              <p className="mt-3 text-sm text-red-600">{settingsError}</p>
            )}
            {settingsSuccess && (
              <p className="mt-3 text-sm text-green-600">✓ {settingsSuccess}</p>
            )}
          </div>

          {/* Colleague list */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              All Colleagues <span className="text-slate-400 text-sm font-normal">({allColleagues.length})</span>
            </h2>

            {allColleagues.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No colleagues added yet.</p>
            ) : (
              <div className="space-y-2">
                {allColleagues.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between border border-slate-200 rounded-xl px-5 py-3"
                  >
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <div className="flex items-center gap-3">
                      <select
                        value={c.type}
                        onChange={async (e) => {
                          const newRole = e.target.value as "OC" | "MANAGER";
                          try {
                            await api.updateColleague(c.id, { type: newRole });
                            setAllColleagues((prev) =>
                              prev.map((col) => col.id === c.id ? { ...col, type: newRole } : col)
                            );
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="text-xs border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="OC">OC</option>
                        <option value="MANAGER">Manager</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={c.isAssignable}
                          onChange={async (e) => {
                            const isAssignable = e.target.checked;
                            try {
                              await api.updateColleague(c.id, { isAssignable });
                              setAllColleagues((prev) =>
                                prev.map((col) => col.id === c.id ? { ...col, isAssignable } : col)
                              );
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="rounded"
                        />
                        Assignable
                      </label>
                      <button
                      onClick={async () => {
                        if (!confirm(`Remove ${c.name}? This will also delete their task history.`)) return;
                        setDeletingId(c.id);
                        try {
                          await api.deleteColleague(c.id);
                          setAllColleagues((prev) => prev.filter((col) => col.id !== c.id));
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      disabled={deletingId === c.id}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-semibold transition disabled:opacity-60"
                    >
                      {deletingId === c.id ? "Removing…" : "Remove"}
                    </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
