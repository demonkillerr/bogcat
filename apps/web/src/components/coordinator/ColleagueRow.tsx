"use client";

import { useState } from "react";
import { TASK_LABELS, TASK_TYPES } from "@/lib/constants";
import { useCountdown } from "@/hooks/useCountdown";
import type { Colleague, TaskAllocation } from "@/lib/types";
import { api } from "@/lib/api";

interface Props {
  colleague: Colleague;
  activeTask: TaskAllocation | null;
  workingDayId: string;
  onUpdated: () => void;
}

export default function ColleagueRow({ colleague, activeTask, workingDayId, onUpdated }: Props) {
  const isFree = !activeTask;
  const [assigning, setAssigning] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>(TASK_TYPES[0]);
  const [extendMins, setExtendMins] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    setLoading(true);
    setError(null);
    try {
      await api.assignTask({ colleagueId: colleague.id, taskType: selectedTask, workingDayId });
      setAssigning(false);
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    if (!activeTask) return;
    setLoading(true);
    try {
      await api.completeTask(activeTask.id);
      onUpdated();
    } finally {
      setLoading(false);
    }
  }

  async function handleExtend() {
    if (!activeTask) return;
    setLoading(true);
    setError(null);
    try {
      await api.extendTask(activeTask.id, extendMins);
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleReallocate() {
    if (!activeTask) return;
    setLoading(true);
    setError(null);
    try {
      await api.reallocateTask(activeTask.id, selectedTask);
      setAssigning(false);
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition ${
        isFree
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-semibold text-slate-800">{colleague.name}</span>
          <span className="ml-2 text-xs text-slate-400">{colleague.type === "OC" ? "OC" : "Manager"}</span>
        </div>
        <StatusBadge free={isFree} />
      </div>

      {/* Busy state */}
      {!isFree && activeTask && (
        <div className="mb-3">
          <p className="text-sm text-slate-700 font-medium">
            {TASK_LABELS[activeTask.taskType] ?? activeTask.taskType}
          </p>
          <CountdownDisplay task={activeTask} />
        </div>
      )}

      {/* Actions */}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {isFree && !assigning && (
        <button
          onClick={() => setAssigning(true)}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition"
        >
          Assign Task
        </button>
      )}

      {assigning && (
        <div className="space-y-2">
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_LABELS[t]}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {isFree ? (
              <button
                onClick={handleAssign}
                disabled={loading}
                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-semibold transition"
              >
                {loading ? "…" : "Assign"}
              </button>
            ) : (
              <button
                onClick={handleReallocate}
                disabled={loading}
                className="text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-semibold transition"
              >
                {loading ? "…" : "Reallocate"}
              </button>
            )}
            <button
              onClick={() => setAssigning(false)}
              className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isFree && !assigning && (
        <div className="flex flex-wrap gap-2 mt-1">
          <button
            onClick={handleComplete}
            disabled={loading}
            className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-semibold transition"
          >
            Mark Free
          </button>
          <button
            onClick={() => setAssigning(true)}
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-semibold transition"
          >
            Reallocate
          </button>
          <div className="flex items-center gap-1">
            <select
              value={extendMins}
              onChange={(e) => setExtendMins(Number(e.target.value))}
              className="text-xs border border-slate-300 rounded px-1 py-1"
            >
              {[5, 10, 15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>{m}m</option>
              ))}
            </select>
            <button
              onClick={handleExtend}
              disabled={loading}
              className="text-xs bg-slate-600 hover:bg-slate-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-semibold transition"
            >
              Extend
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ free }: { free: boolean }) {
  return (
    <span
      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
        free
          ? "bg-green-100 text-green-700 border border-green-300"
          : "bg-red-100 text-red-700 border border-red-300"
      }`}
    >
      {free ? "FREE" : "BUSY"}
    </span>
  );
}

function CountdownDisplay({ task }: { task: TaskAllocation }) {
  const { display, overdue } = useCountdown(task.allocatedAt, task.durationMins, task.extendedUntil);
  return (
    <span
      className={`text-sm font-mono font-bold ${overdue ? "text-red-600 animate-pulse" : "text-slate-600"}`}
    >
      {overdue ? `Overdue ${display}` : `${display} remaining`}
    </span>
  );
}
