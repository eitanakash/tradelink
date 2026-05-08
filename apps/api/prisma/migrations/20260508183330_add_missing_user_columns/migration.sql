-- AlterTable User
ALTER TABLE "User" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'User',
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Update existing users to have a non-null name (using email prefix)
UPDATE "User" SET "name" = COALESCE("firstName" || ' ' || "lastName", substring("email", 1, position('@' in "email") - 1), 'User')
WHERE "name" = 'User';
