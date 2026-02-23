import { prisma } from "../index.js";
import { broadcast } from "./handler.js";

const CHECK_INTERVAL_MS = 30_000; // check every 30 seconds

export function startTimerLoop() {
  setInterval(async () => {
    try {
      await checkExpiredTasks();
      await checkExpiredLunches();
    } catch (err) {
      console.error("Timer loop error:", err);
    }
  }, CHECK_INTERVAL_MS);

  console.log("⏱  Timer loop started (checks every 30s)");
}

async function checkExpiredTasks() {
  const now = new Date();

  const active = await prisma.taskAllocation.findMany({
    where: { status: { in: ["ACTIVE", "EXTENDED"] } },
    include: { colleague: true },
  });

  for (const allocation of active) {
    const deadline =
      allocation.extendedUntil ??
      new Date(allocation.allocatedAt.getTime() + allocation.durationMins * 60_000);

    if (now >= deadline) {
      const updated = await prisma.taskAllocation.update({
        where: { id: allocation.id },
        data: { status: "COMPLETED" },
        include: { colleague: true },
      });

      broadcast({ type: "STATUS_CHANGED", payload: { allocation: updated } });
      console.log(`⏰ Auto-completed: ${allocation.colleague.name} — ${allocation.taskType}`);
    }
  }
}

const LUNCH_DURATION_MS = 30 * 60_000; // 30 minutes

async function checkExpiredLunches() {
  const now = new Date();

  const onLunch = await prisma.colleagueOnDay.findMany({
    where: { onLunch: true, lunchStartedAt: { not: null } },
    include: { colleague: true },
  });

  for (const cod of onLunch) {
    const deadline = new Date(cod.lunchStartedAt!.getTime() + LUNCH_DURATION_MS);
    if (now >= deadline) {
      await prisma.colleagueOnDay.update({
        where: { id: cod.id },
        data: { onLunch: false, lunchStartedAt: null },
      });

      broadcast({ type: "STATUS_CHANGED", payload: { lunch: { colleagueId: cod.colleagueId, onLunch: false, lunchStartedAt: null } } });
      console.log(`🍽  Auto-ended lunch: ${cod.colleague.name}`);
    }
  }
}
