-- DropIndex
DROP INDEX IF EXISTS "Session_userId_key";

-- DropIndex
DROP INDEX IF EXISTS "OptometristProfile_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "OptometristProfile_date_roomNumber_key" ON "OptometristProfile"("date", "roomNumber");
