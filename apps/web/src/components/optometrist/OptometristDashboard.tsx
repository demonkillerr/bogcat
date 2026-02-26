"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { api, getRole } from "@/lib/api";
import { connectWs, addWsListener } from "@/lib/ws";
import { OPT_CALL_LABELS } from "@/lib/constants";
import type { OptometristCall, OptometristProfile, WorkingDay } from "@/lib/types";

type MainTab = "POST_CHECKS" | "DISPENSE";
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

export default function OptometristDashboard() {
  const router = useRouter();

  // All profiles for today (multiple optometrists)
  const [profiles, setProfiles] = useState<OptometristProfile[]>([]);

  // This optometrist's own profile (set after claiming a room)
  const [myProfile, setMyProfile] = useState<OptometristProfile | null>(null);

  // Room claim form
  const [claimName, setClaimName] = useState("");
  const [claimRoom, setClaimRoom] = useState<1 | 2 | 3 | 4 | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Call state
  const [calls, setCalls] = useState<OptometristCall[]>([]);
  const [workingDay, setWorkingDay] = useState<WorkingDay | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("POST_CHECKS");
  const [selectedTask, setSelectedTask] = useState<OptCallTaskType>("POST_CHECK_SINGLE_STIM");
  const [submitting, setSubmitting] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // Guard
  useEffect(() => {
    const role = getRole();
    if (role !== "OPTOMETRIST") router.replace("/");
  }, [router]);

  const fetchProfiles = useCallback(async () => {
    try {
      const profs: OptometristProfile[] = await api.getOptometristProfiles();
      setProfiles(profs);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [profs, callsData, day] = await Promise.all([
        api.getOptometristProfiles(),
        api.getTodayOptometristCalls(),
        api.getTodayWorkingDay(),
      ]);
      setProfiles(profs as OptometristProfile[]);
      setCalls(callsData);
      setWorkingDay(day);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    connectWs();

    const remove = addWsListener((msg) => {
      if (msg.type === "OPT_CALL_ACKNOWLEDGED") {
        const call = msg.payload as OptometristCall;
        setCalls((prev) => prev.map((c) => (c.id === call.id ? call : c)));
      }
      if (msg.type === "OPT_PROFILES_UPDATED") {
        fetchProfiles();
      }
    });

    return () => { remove(); };
  }, [fetchData, fetchProfiles]);

  const takenRooms = new Set(profiles.map((p) => p.roomNumber));
  const availableRooms = ([1, 2, 3, 4] as const).filter((r) => !takenRooms.has(r));

  async function handleClaimRoom(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    if (!claimRoom) {
      setProfileError("Please select a room.");
      return;
    }
    if (!claimName.trim()) {
      setProfileError("Please enter your name.");
      return;
    }
    setSavingProfile(true);
    try {
      const saved = await api.saveOptometristProfile({ name: claimName.trim(), roomNumber: claimRoom });
      setMyProfile(saved);
      setProfiles((prev) => [...prev.filter((p) => p.id !== saved.id), saved]);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to claim room");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCall() {
    setCallError(null);
    if (!myProfile) {
      setCallError("Please claim a room first.");
      return;
    }
    if (!workingDay) {
      setCallError("No working day has been set up today. Please ask the coordinator.");
      return;
    }
    setSubmitting(true);
    try {
      const call = await api.submitOptometristCall({
        workingDayId: workingDay.id,
        roomNumber: myProfile.roomNumber,
        optometristName: myProfile.name,
        taskType: selectedTask,
      });
      setCalls((prev) => [call, ...prev]);
      setCallSuccess(true);
      setTimeout(() => setCallSuccess(false), 4000);
    } catch (err: unknown) {
      setCallError(err instanceof Error ? err.message : "Failed to submit call");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Optometrist">
      <div className="max-w-lg mx-auto space-y-6">

        {/* ── Room allocation overview ── */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Today&apos;s Room Allocations</h2>
          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as const).map((room) => {
              const owner = profiles.find((p) => p.roomNumber === room);
              const isMine = myProfile?.roomNumber === room;
              return (
                <div
                  key={room}
                  className={`rounded-lg border p-3 text-center text-sm ${
                    isMine
                      ? "bg-blue-50 border-blue-400"
                      : owner
                        ? "bg-slate-50 border-slate-200"
                        : "bg-green-50 border-green-200"
                  }`}
                >
                  <p className="font-semibold text-slate-700">Room {room}</p>
                  {owner ? (
                    <p className={`text-xs mt-1 ${isMine ? "text-blue-600 font-semibold" : "text-slate-500"}`}>
                      {isMine ? `${owner.name} (You)` : owner.name}
                    </p>
                  ) : (
                    <p className="text-xs mt-1 text-green-600">Available</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Room claim form (shown only if this optometrist hasn't claimed a room yet) ── */}
        {!myProfile && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Claim Your Room</h2>
            <p className="text-sm text-slate-500 mb-4">Enter your name and select an available room. Once saved, your room is locked for the day.</p>

            {availableRooms.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                All 4 rooms are taken for today. Contact admin if you need to make changes.
              </p>
            ) : (
              <form onSubmit={handleClaimRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={claimName}
                    onChange={(e) => setClaimName(e.target.value)}
                    required
                    placeholder="e.g. Craig Donald"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Room</label>
                  <div className="grid grid-cols-4 gap-2">
                    {([1, 2, 3, 4] as const).map((room) => {
                      const taken = takenRooms.has(room);
                      return (
                        <button
                          key={room}
                          type="button"
                          disabled={taken}
                          onClick={() => setClaimRoom(room)}
                          className={`py-2.5 rounded-lg text-sm font-semibold border transition ${
                            claimRoom === room
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : taken
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          Room {room}
                          {taken && <span className="block text-xs font-normal mt-0.5">Taken</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {profileError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {profileError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingProfile || !claimRoom}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition"
                >
                  {savingProfile ? "Claiming…" : "🔒 Claim Room & Lock"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Your profile card (shown after claiming) ── */}
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
            <p className="text-sm text-slate-400 italic">Claim a room above before calling for assistance.</p>
          ) : (
            <div className="space-y-4">

              {/* Main tabs: Post Checks / Dispense */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMainTab("POST_CHECKS");
                    setSelectedTask("POST_CHECK_SINGLE_STIM");
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition ${
                    mainTab === "POST_CHECKS"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Post Checks
                </button>
                <button
                  onClick={() => {
                    setMainTab("DISPENSE");
                    setSelectedTask("DISPENSE_SINGLE_VISION");
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition ${
                    mainTab === "DISPENSE"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Dispense
                </button>
              </div>

              {/* Sub-type selection */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {mainTab === "POST_CHECKS" ? "Post Check Type" : "Dispense Type"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(mainTab === "POST_CHECKS" ? POST_CHECK_TYPES : DISPENSE_TYPES).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTask(t)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition text-left ${
                        selectedTask === t
                          ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {OPT_CALL_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current selection summary */}
              <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600 border border-slate-200">
                <span className="font-medium">Room {myProfile.roomNumber}</span>
                {" · "}
                <span>{mainTab === "POST_CHECKS" ? "Post Check" : "Dispense"}</span>
                {" · "}
                <span className="font-medium text-blue-700">{OPT_CALL_LABELS[selectedTask]}</span>
              </div>

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
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition"
              >
                {submitting ? "Calling…" : `🔔 Call — ${OPT_CALL_LABELS[selectedTask]}`}
              </button>
            </div>
          )}
        </div>

        {/* ── Today's calls log ── */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Today&apos;s Calls</h2>

          {calls.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No calls logged yet today.</p>
          ) : (
            <div className="space-y-2">
              {calls.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-4 py-2.5 bg-slate-50"
                >
                  <div>
                    <span className="font-medium text-slate-800">Room {c.roomNumber}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="text-slate-600">{OPT_CALL_LABELS[c.taskType]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-xs text-slate-400">
                      {new Date(c.createdAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {c.status === "ACKNOWLEDGED" ? (
                      <span className="text-xs text-green-600 font-semibold">✓ Seen</span>
                    ) : (
                      <span className="text-xs text-amber-500 font-medium">Pending</span>
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
