"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import DaySetupPanel from "./DaySetupPanel";
import ColleagueRow from "./ColleagueRow";
import ArrivalAlerts from "./ArrivalAlerts";
import OptCallAlerts from "./OptCallAlerts";
import { api, getRole } from "@/lib/api";
import { connectWs, addWsListener } from "@/lib/ws";
import type { Colleague, WorkingDay, PatientArrival, OptometristCall } from "@/lib/types";

export default function CoordinatorDashboard() {
  const router = useRouter();

  const [allColleagues, setAllColleagues] = useState<Colleague[]>([]);
  const [workingDay, setWorkingDay] = useState<WorkingDay | null>(null);
  const [arrivals, setArrivals] = useState<PatientArrival[]>([]);
  const [optCalls, setOptCalls] = useState<OptometristCall[]>([]);
  const [loading, setLoading] = useState(true);

  // 10AM lock — check every minute
  const isLocked = useCallback(() => {
    const now = new Date();
    return now.getHours() >= 10;
  }, []);

  const [locked, setLocked] = useState(isLocked());

  // Guard: only coordinator can access this page
  useEffect(() => {
    const role = getRole();
    if (role !== "COORDINATOR") router.replace("/");
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [cols, day, arriv, optCallsData] = await Promise.all([
        api.getColleagues(),
        api.getTodayWorkingDay(),
        api.getTodayArrivals(),
        api.getTodayOptometristCalls(),
      ]);
      setAllColleagues(cols);
      setWorkingDay(day);
      setArrivals(arriv);
      setOptCalls(optCallsData);
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
      if (msg.type === "PATIENT_ACKNOWLEDGED") {
        const a = msg.payload as PatientArrival;
        setArrivals((prev) =>
          prev.map((x) => (x.id === a.id ? { ...x, acknowledged: true } : x))
        );
      }
      if (msg.type === "OPT_CALL") {
        const c = msg.payload as OptometristCall;
        setOptCalls((prev) =>
          prev.some((x) => x.id === c.id) ? prev : [c, ...prev]
        );
      }
      if (msg.type === "OPT_CALL_ACKNOWLEDGED") {
        const c = msg.payload as OptometristCall;
        setOptCalls((prev) =>
          prev.map((x) => (x.id === c.id ? c : x))
        );
      }
    });

    // Re-check lock every minute
    const lockInterval = setInterval(() => setLocked(isLocked()), 60_000);

    return () => {
      remove();
      clearInterval(lockInterval);
    };
  }, [fetchData, isLocked]);

  if (loading) {
    return (
      <DashboardLayout title="Coordinator">
        <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>
      </DashboardLayout>
    );
  }

  const workingColleagues = (workingDay?.colleagues ?? []).map((cod) => cod.colleague);
  const lunchMap = new Map(
    (workingDay?.colleagues ?? []).map((cod) => [
      cod.colleague.id,
      { onLunch: cod.onLunch, lunchStartedAt: cod.lunchStartedAt },
    ])
  );
  const activeTasks = workingDay?.taskAllocations ?? [];

  function getActiveTask(colleagueId: string) {
    return activeTasks.find(
      (t) => t.colleagueId === colleagueId && t.status !== "COMPLETED"
    ) ?? null;
  }

  const lunchEntries = (workingDay?.colleagues ?? []).map((cod) => ({
    codId: cod.id,
    colleague: cod.colleague,
    onLunch: cod.onLunch,
    lunchStartedAt: cod.lunchStartedAt,
  }));

  const assignableWorking = workingColleagues.filter((c) => c.isAssignable);

  return (
    <DashboardLayout title="Coordinator">
      {/* Optometrist call alerts */}
      <OptCallAlerts
        calls={optCalls}
        onAcknowledged={(id) =>
          setOptCalls((prev) =>
            prev.map((c) => (c.id === id ? { ...c, status: "ACKNOWLEDGED" as const } : c))
          )
        }
      />

      {/* Patient arrival alerts */}
      <ArrivalAlerts
        arrivals={arrivals}
        onAcknowledged={(id) =>
          setArrivals((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
        }
      />

      {/* Day Setup */}
      <div className="mb-6">
        <DaySetupPanel
          allColleagues={allColleagues}
          workingDayId={workingDay?.id ?? null}
          currentWorking={workingColleagues}
          locked={locked}
          onSaved={() => fetchData()}
          lunchEntries={lunchEntries}
          onLunchToggled={fetchData}
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
            No working colleagues set for today.{" "}
            {locked ? "Day setup was locked at 10:00 AM." : "Use Day Setup above to add colleagues."}
          </p>
        ) : (
          <>
            {assignableWorking.length === 0 && (
              <p className="text-sm text-slate-400 italic mb-3">No assignable colleagues working today.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {assignableWorking.map((c) => (
                <ColleagueRow
                  key={c.id}
                  colleague={c}
                  activeTask={getActiveTask(c.id)}
                  workingDayId={workingDay.id}
                  onUpdated={fetchData}
                  onLunch={lunchMap.get(c.id)?.onLunch}
                  lunchStartedAt={lunchMap.get(c.id)?.lunchStartedAt}
                />
              ))}
            </div>

            {/* Non-assignable colleagues (e.g. Iqbal) — shown as info only */}
            {workingColleagues.filter((c) => !c.isAssignable).map((c) => (
              <div key={c.id} className="mt-3 flex items-center gap-3 text-sm text-slate-400 italic">
                <span>{c.name}</span>
                <span className="text-xs">(Manager — not assigned tasks)</span>
              </div>
            ))}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
