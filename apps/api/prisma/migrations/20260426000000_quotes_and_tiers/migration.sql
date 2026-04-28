-- AlterTable: Remove amount/notes, add coverLetter/updatedAt
ALTER TABLE "Quote" DROP COLUMN "amount",
DROP COLUMN "notes",
ADD COLUMN     "coverLetter" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "QuoteTier" (
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

-- CreateTable
CREATE TABLE "QuoteQuestion" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteQuestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuoteTier" ADD CONSTRAINT "QuoteTier_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteQuestion" ADD CONSTRAINT "QuoteQuestion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterForeignKey: FileUpload.jobId -> SET NULL
ALTER TABLE "FileUpload" DROP CONSTRAINT IF EXISTS "FileUpload_jobId_fkey";
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterForeignKey: FileUpload.quoteId -> SET NULL
ALTER TABLE "FileUpload" DROP CONSTRAINT IF EXISTS "FileUpload_quoteId_fkey";
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
