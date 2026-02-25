"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { TASK_LABELS, ARRIVAL_REASON_LABELS, COLLEAGUE_TYPE_LABELS } from "@/lib/constants";
import type { WeeklyStats as WeeklyStatsType } from "@/lib/types";

function sundayOfWeek(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // roll back to Sunday
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function WeeklyStats() {
  const [weekOf, setWeekOf] = useState(sundayOfWeek(new Date()));
  const [stats, setStats] = useState<WeeklyStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWeeklyStats(date);
      setStats(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(weekOf);
  }, [weekOf, fetchStats]);

  function shiftWeek(delta: number) {
    const d = new Date(weekOf);
    d.setDate(d.getDate() + delta * 7);
    setWeekOf(sundayOfWeek(d));
  }

  if (loading) {
    return <div className="text-slate-400 text-center py-12">Loading statistics…</div>;
  }
  if (error) {
    return <div className="text-red-600 text-center py-12">{error}</div>;
  }
  if (!stats) return null;

  // Sort colleagues by total tasks descending
  const colleagueEntries = Object.entries(stats.tasksByColleague).sort(
    (a, b) => {
      const totalA = Object.values(a[1]).reduce((s, n) => s + n, 0);
      const totalB = Object.values(b[1]).reduce((s, n) => s + n, 0);
      return totalB - totalA;
    }
  );

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => shiftWeek(-1)}
          className="text-sm bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition"
        >
          ← Prev
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {formatDate(stats.weekStart)} — {formatDate(stats.weekEnd)}
        </span>
        <button
          onClick={() => shiftWeek(1)}
          className="text-sm bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition"
        >
          Next →
        </button>
      </div>

      {stats.totalDays === 0 ? (
        <p className="text-sm text-slate-400 italic">No data recorded for this week.</p>
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Working Days" value={stats.totalDays} />
            <StatCard label="Total Tasks" value={stats.totalTasks} />
            <StatCard label="Patient Arrivals" value={stats.totalArrivals} />
            <StatCard label="Lunch Breaks" value={stats.lunches.length} />
          </div>

          {/* Tasks by type */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-md font-semibold text-slate-800 mb-3">Tasks by Type</h3>
            {Object.keys(stats.tasksByType).length === 0 ? (
              <p className="text-sm text-slate-400 italic">No tasks recorded.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.tasksByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{TASK_LABELS[type] ?? type}</span>
                      <span className="text-sm font-semibold text-slate-800">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Tasks by colleague */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-md font-semibold text-slate-800 mb-3">Tasks by Colleague</h3>
            {colleagueEntries.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No tasks recorded.</p>
            ) : (
              <div className="space-y-4">
                {colleagueEntries.map(([name, tasks]) => {
                  const total = Object.values(tasks).reduce((s, n) => s + n, 0);
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-800">{name}</span>
                        <span className="text-xs text-slate-500">{total} total</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(tasks)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count]) => (
                            <span
                              key={type}
                              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full"
                            >
                              {TASK_LABELS[type] ?? type}: {count}
                            </span>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Arrivals by reason */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-md font-semibold text-slate-800 mb-3">Arrivals by Reason</h3>
            {Object.keys(stats.arrivalsByReason).length === 0 ? (
              <p className="text-sm text-slate-400 italic">No arrivals recorded.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.arrivalsByReason)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">
                        {ARRIVAL_REASON_LABELS[reason] ?? reason}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Lunch history */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-md font-semibold text-slate-800 mb-3">
              Lunch Break History
            </h3>
            {stats.lunches.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No lunch breaks recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {stats.lunches.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2"
                  >
                    <span className="text-slate-700">{l.colleagueName}</span>
                    <span className="text-xs text-slate-500">
                      {formatDate(l.date)} at {formatTime(l.lunchStartedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily breakdown */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-md font-semibold text-slate-800 mb-4">Daily Breakdown</h3>
            <div className="space-y-6">
              {stats.dailySummaries.map((day) => (
                <div key={day.date} className="border border-slate-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">
                    {formatDate(day.date)}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Colleagues */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5">
                        Colleagues ({day.colleaguesWorking.length})
                      </p>
                      {day.colleaguesWorking.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">None</p>
                      ) : (
                        <div className="space-y-1">
                          {day.colleaguesWorking.map((c, i) => (
                            <div key={i} className="text-xs text-slate-700 flex items-center gap-1">
                              <span>{c.name}</span>
                              <span className="text-slate-400">
                                ({COLLEAGUE_TYPE_LABELS[c.type] ?? c.type})
                              </span>
                              {c.lunchStartedAt && (
                                <span className="text-yellow-600 ml-auto">
                                  🍽 {formatTime(c.lunchStartedAt)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tasks */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5">
                        Tasks ({day.tasks.length})
                      </p>
                      {day.tasks.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">None</p>
                      ) : (
                        <div className="space-y-1">
                          {day.tasks.map((t, i) => (
                            <div key={i} className="text-xs text-slate-700">
                              <span className="font-medium">{t.colleagueName}</span>
                              {" — "}
                              {TASK_LABELS[t.taskType] ?? t.taskType}
                              <span className="text-slate-400 ml-1">
                                ({formatTime(t.allocatedAt)})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Arrivals */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5">
                        Arrivals ({day.arrivals.length})
                      </p>
                      {day.arrivals.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">None</p>
                      ) : (
                        <div className="space-y-1">
                          {day.arrivals.map((a, i) => (
                            <div key={i} className="text-xs text-slate-700">
                              <span className="font-medium">{a.name}</span>
                              {" — "}
                              {ARRIVAL_REASON_LABELS[a.reason] ?? a.reason}
                              <span className="text-slate-400 ml-1">
                                ({formatTime(a.arrivedAt)})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 text-center">
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
