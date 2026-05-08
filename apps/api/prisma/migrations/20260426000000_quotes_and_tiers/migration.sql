-- Create Quote table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Quote" (
    "id" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- Add columns only if they don't already exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='Quote' AND column_name='coverLetter') THEN
    ALTER TABLE "Quote" ADD COLUMN "coverLetter" TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='Quote' AND column_name='updatedAt') THEN
    ALTER TABLE "Quote" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Drop old columns if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='Quote' AND column_name='amount') THEN
    ALTER TABLE "Quote" DROP COLUMN "amount";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='Quote' AND column_name='notes') THEN
    ALTER TABLE "Quote" DROP COLUMN "notes";
  END IF;
END $$;

-- CreateTable QuoteTier
CREATE TABLE IF NOT EXISTS "QuoteTier" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "inclusions" TEXT[],
    "exclusions" TEXT[],
    "warranty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable QuoteQuestion
CREATE TABLE IF NOT EXISTS "QuoteQuestion" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteQuestion_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys safely
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='Quote_jobId_fkey') THEN
    ALTER TABLE "Quote" ADD CONSTRAINT "Quote_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='Quote_contractorId_fkey') THEN
    ALTER TABLE "Quote" ADD CONSTRAINT "Quote_contractorId_fkey"
    FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='QuoteTier_quoteId_fkey') THEN
    ALTER TABLE "QuoteTier" ADD CONSTRAINT "QuoteTier_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='QuoteQuestion_quoteId_fkey') THEN
    ALTER TABLE "QuoteQuestion" ADD CONSTRAINT "QuoteQuestion_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterForeignKey FileUpload safely
ALTER TABLE "FileUpload" DROP CONSTRAINT IF EXISTS "FileUpload_jobId_fkey";
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FileUpload" DROP CONSTRAINT IF EXISTS "FileUpload_quoteId_fkey";
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_quoteId_fkey"
FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
