-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Colleague" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isAssignable" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "WorkingDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ColleagueOnDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingDayId" TEXT NOT NULL,
    "colleagueId" TEXT NOT NULL,
    CONSTRAINT "ColleagueOnDay_workingDayId_fkey" FOREIGN KEY ("workingDayId") REFERENCES "WorkingDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ColleagueOnDay_colleagueId_fkey" FOREIGN KEY ("colleagueId") REFERENCES "Colleague" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingDayId" TEXT NOT NULL,
    "colleagueId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "allocatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMins" INTEGER NOT NULL,
    "extendedUntil" DATETIME,
    CONSTRAINT "TaskAllocation_workingDayId_fkey" FOREIGN KEY ("workingDayId") REFERENCES "WorkingDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaskAllocation_colleagueId_fkey" FOREIGN KEY ("colleagueId") REFERENCES "Colleague" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatientArrival" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "arrivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PatientArrival_workingDayId_fkey" FOREIGN KEY ("workingDayId") REFERENCES "WorkingDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_userId_key" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Colleague_name_key" ON "Colleague"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingDay_date_key" ON "WorkingDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ColleagueOnDay_workingDayId_colleagueId_key" ON "ColleagueOnDay"("workingDayId", "colleagueId");
