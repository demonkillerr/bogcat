-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PatientArrival" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "arrivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PatientArrival_workingDayId_fkey" FOREIGN KEY ("workingDayId") REFERENCES "WorkingDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PatientArrival" ("id", "workingDayId", "name", "reason", "arrivedAt", "acknowledged") SELECT "id", "workingDayId", "name", "reason", "arrivedAt", "acknowledged" FROM "PatientArrival";
DROP TABLE "PatientArrival";
ALTER TABLE "new_PatientArrival" RENAME TO "PatientArrival";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
