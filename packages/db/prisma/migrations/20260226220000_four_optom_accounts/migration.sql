-- Revert to single-session: re-add unique constraint on Session.userId
CREATE UNIQUE INDEX "Session_userId_key" ON "Session"("userId");

-- Add optional notes column to OptometristCall
ALTER TABLE "OptometristCall" ADD COLUMN "notes" TEXT;
