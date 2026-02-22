"use client";

import { useState, useEffect } from "react";

/** Returns a live mm:ss string counting down (or up if overdue) from the deadline */
export function useCountdown(
  allocatedAt: string,
  durationMins: number,
  extendedUntil: string | null
): { display: string; overdue: boolean } {
  const deadline = extendedUntil
    ? new Date(extendedUntil).getTime()
    : new Date(allocatedAt).getTime() + durationMins * 60_000;

  const [remaining, setRemaining] = useState(deadline - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(deadline - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const overdue = remaining < 0;
  const abs = Math.abs(remaining);
  const totalSecs = Math.floor(abs / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const display = `${overdue ? "-" : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return { display, overdue };
}
