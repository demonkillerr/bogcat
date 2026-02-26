-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OptometristProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "roomNumber" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_OptometristProfile" ("date", "id", "locked", "name", "roomNumber") SELECT "date", "id", "locked", "name", "roomNumber" FROM "OptometristProfile";
DROP TABLE "OptometristProfile";
ALTER TABLE "new_OptometristProfile" RENAME TO "OptometristProfile";
CREATE UNIQUE INDEX "OptometristProfile_date_roomNumber_key" ON "OptometristProfile"("date", "roomNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
