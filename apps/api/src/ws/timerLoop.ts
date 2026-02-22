import { prisma } from "../index.js";
import { broadcast } from "./handler.js";

const CHECK_INTERVAL_MS = 30_000; // check every 30 seconds

export function startTimerLoop() {
  setInterval(async () => {
    const now = new Date();

    // Find all active/extended allocations whose deadline has passed
    const expired = await prisma.taskAllocation.findMany({
      where: {
        status: { in: ["ACTIVE", "EXTENDED"] },
      },
      include: { colleague: true },
    });

    for (const allocation of expired) {
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
        console.log(`⏰ Auto-completed task for ${allocation.colleague.name}: ${allocation.taskType}`);
      }
    }
  }, CHECK_INTERVAL_MS);

  console.log("⏱  Timer loop started (checks every 30s)");
}
