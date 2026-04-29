-- AlterTable: Add new fields to ContractorProfile
ALTER TABLE "ContractorProfile"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "headline" TEXT,
  ADD COLUMN "yearsExperience" INTEGER,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "totalReviews" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalJobs" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "memberSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex for slug uniqueness
CREATE UNIQUE INDEX "ContractorProfile_slug_key" ON "ContractorProfile"("slug");

-- AlterTable: Add completion fields to Job
ALTER TABLE "Job"
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "clientMarkedComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contractorMarkedComplete" BOOLEAN NOT NULL DEFAULT false;

-- Add NEW_REVIEW to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE 'NEW_REVIEW';

-- CreateTable: Review
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "qualityRating" INTEGER NOT NULL,
    "communicationRating" INTEGER NOT NULL,
    "timelinessRating" INTEGER NOT NULL,
    "valueRating" INTEGER NOT NULL,
    "contractorReply" TEXT,
    "contractorRepliedAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_jobId_key" ON "Review"("jobId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
