-- AlterTable ContractorProfile
ALTER TABLE "ContractorProfile" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'US';

-- Update to use homeCountry if available
UPDATE "ContractorProfile" SET "state" = "homeCountry" WHERE "homeCountry" IS NOT NULL AND "homeCountry" != '';
