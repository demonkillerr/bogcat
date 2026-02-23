-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ColleagueOnDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingDayId" TEXT NOT NULL,
    "colleagueId" TEXT NOT NULL,
    "onLunch" BOOLEAN NOT NULL DEFAULT false,
    "lunchStartedAt" DATETIME,
    CONSTRAINT "ColleagueOnDay_workingDayId_fkey" FOREIGN KEY ("workingDayId") REFERENCES "WorkingDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ColleagueOnDay_colleagueId_fkey" FOREIGN KEY ("colleagueId") REFERENCES "Colleague" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ColleagueOnDay" ("colleagueId", "id", "workingDayId") SELECT "colleagueId", "id", "workingDayId" FROM "ColleagueOnDay";
DROP TABLE "ColleagueOnDay";
ALTER TABLE "new_ColleagueOnDay" RENAME TO "ColleagueOnDay";
CREATE UNIQUE INDEX "ColleagueOnDay_workingDayId_colleagueId_key" ON "ColleagueOnDay"("workingDayId", "colleagueId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
