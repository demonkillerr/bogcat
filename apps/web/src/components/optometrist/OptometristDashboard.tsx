"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { api, getRole, getUsername } from "@/lib/api";
import { connectWs, addWsListener } from "@/lib/ws";
import { OPT_CALL_LABELS } from "@/lib/constants";
import type { OptometristProfile, WorkingDay } from "@/lib/types";

type OptCallTaskType =
  | "POST_CHECK_SINGLE_STIM"
  | "POST_CHECK_MULTI_STIM"
  | "POST_CHECK_ZATA_24_2"
  | "POST_CHECK_PRESSURES"
  | "POST_CHECK_FUNDUS_PHOTOS"
  | "POST_CHECK_CLINICAL_OCT"
  | "POST_CHECK_CLINICAL_OPTOMAP"
  | "DISPENSE_SINGLE_VISION"
  | "DISPENSE_VARIFOCAL";

const POST_CHECK_TYPES: OptCallTaskType[] = [
  "POST_CHECK_SINGLE_STIM",
  "POST_CHECK_MULTI_STIM",
  "POST_CHECK_ZATA_24_2",
  "POST_CHECK_PRESSURES",
  "POST_CHECK_FUNDUS_PHOTOS",
  "POST_CHECK_CLINICAL_OCT",
  "POST_CHECK_CLINICAL_OPTOMAP",
];

const DISPENSE_TYPES: OptCallTaskType[] = [
  "DISPENSE_SINGLE_VISION",
  "DISPENSE_VARIFOCAL",
];

/** Extract room number from stored username, e.g. "optometrist_room2" → 2 */
function getRoomFromUsername(): number | null {
  const username = getUsername();
  if (!username) return null;
  const match = username.match(/^optometrist_room(\d)$/);
  return match ? Number(match[1]) : null;
}

export default function OptometristDashboard() {
  const router = useRouter();
  const roomNumber = getRoomFromUsername();

  // Profile state
  const [myProfile, setMyProfile] = useState<OptometristProfile | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Call state
  const [workingDay, setWorkingDay] = useState<WorkingDay | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<OptCallTaskType>>(new Set());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // Guard
  useEffect(() => {
    const role = getRole();
    if (role !== "OPTOMETRIST") router.replace("/");
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [profiles, day] = await Promise.all([
        api.getOptometristProfiles(),
        api.getTodayWorkingDay(),
      ]);
      setWorkingDay(day);
      // Find this account's profile (by room number)
      if (roomNumber) {
        const mine = (profiles as OptometristProfile[]).find(
          (p) => p.roomNumber === roomNumber
        );
        if (mine) setMyProfile(mine);
      }
    } catch (e) {
      console.error(e);
    }
  }, [roomNumber]);

  useEffect(() => {
    fetchData();
    connectWs();

    const remove = addWsListener((msg) => {
      if (msg.type === "OPT_PROFILES_UPDATED") {
        fetchData();
      }
    });

    return () => { remove(); };
  }, [fetchData]);

  function toggleTask(task: OptCallTaskType) {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(task)) next.delete(task);
      else next.add(task);
      return next;
    });
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    if (!nameInput.trim()) {
      setProfileError("Please enter your name.");
      return;
    }
    setSavingProfile(true);
    try {
      const saved = await api.saveOptometristProfile({ name: nameInput.trim() });
      setMyProfile(saved);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCall() {
    setCallError(null);
    if (!myProfile) {
      setCallError("Please enter your name first.");
      return;
    }
    if (!workingDay) {
      setCallError("No working day has been set up today. Please ask the coordinator.");
      return;
    }
    if (selectedTasks.size === 0) {
      setCallError("Please select at least one task.");
      return;
    }

    setSubmitting(true);
    try {
      const tasks = Array.from(selectedTasks);
      // Submit one call per selected task
      await Promise.all(
        tasks.map((taskType) =>
          api.submitOptometristCall({
            workingDayId: workingDay.id,
            roomNumber: myProfile.roomNumber,
            optometristName: myProfile.name,
            taskType,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          })
        )
      );
      setSelectedTasks(new Set());
      setNotes("");
      setCallSuccess(true);
      setTimeout(() => setCallSuccess(false), 4000);
    } catch (err: unknown) {
      setCallError(err instanceof Error ? err.message : "Failed to submit call");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedLabels = Array.from(selectedTasks).map((t) => OPT_CALL_LABELS[t]);

  return (
    <DashboardLayout title={`Optometrist — Room ${roomNumber ?? "?"}`}>
      <div className="max-w-lg mx-auto space-y-6">

        {/* ── Room badge ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
          <p className="text-sm text-blue-600 font-semibold">Your Room</p>
          <p className="text-4xl font-bold text-blue-700 mt-1">{roomNumber ?? "—"}</p>
        </div>

        {/* ── Name entry (shown if no profile yet) ── */}
        {!myProfile && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Enter Your Name</h2>
            <p className="text-sm text-slate-500 mb-4">
              This will be locked for the rest of the day once saved.
            </p>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  placeholder="e.g. Craig Donald"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {profileError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {profileError}
                </div>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition"
              >
                {savingProfile ? "Saving…" : "🔒 Save & Lock"}
              </button>
            </form>
          </div>
        )}

        {/* ── Locked profile card ── */}
        {myProfile && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-semibold">Your Assignment</p>
                <p className="text-lg font-bold text-slate-800">{myProfile.name}</p>
                <p className="text-sm text-slate-600">Room {myProfile.roomNumber}</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                🔒 Locked
              </span>
            </div>
          </div>
        )}

        {/* ── Call for assistance ── */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">Call for Assistance</h2>

          {!myProfile ? (
            <p className="text-sm text-slate-400 italic">Enter your name above before calling for assistance.</p>
          ) : (
            <div className="space-y-5">

              {/* Post Checks — multi-select toggles */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Post Checks
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {POST_CHECK_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTask(t)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition text-left ${
                        selectedTasks.has(t)
                          ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {selectedTasks.has(t) && <span className="mr-1">✓</span>}
                      {OPT_CALL_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dispense — multi-select toggles */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Dispense
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DISPENSE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTask(t)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition text-left ${
                        selectedTasks.has(t)
                          ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {selectedTasks.has(t) && <span className="mr-1">✓</span>}
                      {OPT_CALL_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Additional Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Patient is free to go home after checks"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Selection summary */}
              {selectedTasks.size > 0 && (
                <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600 border border-slate-200">
                  <span className="font-medium">Room {myProfile.roomNumber}</span>
                  {" · "}
                  <span className="font-medium text-blue-700">{selectedLabels.join(", ")}</span>
                </div>
              )}

              {callError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {callError}
                </div>
              )}
              {callSuccess && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                  ✓ Coordinator has been notified.
                </div>
              )}

              <button
                onClick={handleCall}
                disabled={submitting || selectedTasks.size === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition"
              >
                {submitting
                  ? "Calling…"
                  : selectedTasks.size === 0
                    ? "Select at least one task"
                    : `🔔 Call — ${selectedTasks.size} task${selectedTasks.size > 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
