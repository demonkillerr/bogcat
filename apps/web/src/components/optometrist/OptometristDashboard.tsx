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

  // Profile state
  const [profile, setProfile] = useState<OptometristProfile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileRoom, setProfileRoom] = useState<1 | 2 | 3 | 4>(1);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Call state
  const [calls, setCalls] = useState<OptometristCall[]>([]);
  const [workingDay, setWorkingDay] = useState<WorkingDay | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("POST_CHECKS");
  const [selectedTask, setSelectedTask] = useState<OptCallTaskType>("POST_CHECK_SINGLE_STIM");
  const [submitting, setSubmitting] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // 10AM lock
  const isAfter10AM = () => new Date().getHours() >= 10;
  const profileLocked = (profile?.locked ?? false) || (profile !== null && isAfter10AM());

  // Guard
  useEffect(() => {
    const role = getRole();
    if (role !== "OPTOMETRIST") router.replace("/");
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [prof, callsData, day] = await Promise.all([
        api.getOptometristProfile(),
        api.getTodayOptometristCalls(),
        api.getTodayWorkingDay(),
      ]);
      if (prof) {
        setProfile(prof);
        setProfileName(prof.name);
        setProfileRoom(prof.roomNumber as 1 | 2 | 3 | 4);
      }
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
    });

    return () => { remove(); };
  }, [fetchData]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setSavingProfile(true);
    try {
      const saved = await api.saveOptometristProfile({ name: profileName, roomNumber: profileRoom });
      setProfile(saved);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCall() {
    setCallError(null);
    if (!profile) {
      setCallError("Please save your name and room number first.");
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
        roomNumber: profile.roomNumber,
        optometristName: profile.name,
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

        {/* ── Profile card ── */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">My Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                disabled={profileLocked}
                placeholder="e.g. Dr. Smith"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>

            {/* Room selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Room Number</label>
              <div className="grid grid-cols-4 gap-2">
                {([1, 2, 3, 4] as const).map((room) => (
                  <button
                    key={room}
                    type="button"
                    disabled={profileLocked}
                    onClick={() => setProfileRoom(room)}
                    className={`py-2.5 rounded-lg text-sm font-semibold border transition ${
                      profileRoom === room
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    Room {room}
                  </button>
                ))}
              </div>
            </div>

            {/* Lock notice */}
            {profileLocked && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                🔒 Profile is locked for today (after 10:00 AM). Contact admin if changes are needed.
              </p>
            )}

            {profileError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                ✓ Profile saved.
              </div>
            )}

            {!profileLocked && (
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition"
              >
                {savingProfile ? "Saving…" : "Save Profile"}
              </button>
            )}
          </form>
        </div>

        {/* ── Call for assistance ── */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">Call for Assistance</h2>

          {!profile ? (
            <p className="text-sm text-slate-400 italic">Save your profile above before calling for assistance.</p>
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
                <span className="font-medium">Room {profile.roomNumber}</span>
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
