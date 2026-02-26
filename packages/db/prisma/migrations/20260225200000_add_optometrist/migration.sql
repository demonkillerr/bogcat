-- CreateTable
CREATE TABLE "OptometristProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "roomNumber" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "OptometristProfile_date_key" ON "OptometristProfile"("date");

-- CreateTable
CREATE TABLE "OptometristCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingDayId" TEXT NOT NULL,
    "roomNumber" INTEGER NOT NULL,
    "optometristName" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    CONSTRAINT "OptometristCall_workingDayId_fkey" FOREIGN KEY ("workingDayId") REFERENCES "WorkingDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
