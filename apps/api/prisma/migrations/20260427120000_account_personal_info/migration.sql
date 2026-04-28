-- AlterTable: add new user profile fields
ALTER TABLE "User"
ADD COLUMN "firstName"    TEXT,
ADD COLUMN "lastName"     TEXT,
ADD COLUMN "phone"        TEXT,
ADD COLUMN "avatar"       TEXT,
ADD COLUMN "addressLine1" TEXT,
ADD COLUMN "addressLine2" TEXT,
ADD COLUMN "city"         TEXT,
ADD COLUMN "state"        TEXT,
ADD COLUMN "country"      TEXT DEFAULT 'US',
ADD COLUMN "zipCode"      TEXT,
ADD COLUMN "updatedAt"    TIMESTAMP(3),
ADD COLUMN "deletedAt"    TIMESTAMP(3);

-- DataMigration: split existing name into firstName / lastName
UPDATE "User"
SET
  "firstName" = CASE
    WHEN position(' ' IN "name") > 0
      THEN LEFT("name", position(' ' IN "name") - 1)
    ELSE "name"
  END,
  "lastName" = CASE
    WHEN position(' ' IN "name") > 0
      THEN SUBSTRING("name" FROM position(' ' IN "name") + 1)
    ELSE ''
  END;

-- Populate updatedAt from createdAt for existing rows
UPDATE "User" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Make updatedAt NOT NULL after backfill
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET NOT NULL;
