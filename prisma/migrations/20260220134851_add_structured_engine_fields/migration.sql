-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_therapistId_fkey";

-- DropForeignKey
ALTER TABLE "CrisisAlert" DROP CONSTRAINT "CrisisAlert_clientId_fkey";

-- DropForeignKey
ALTER TABLE "CrisisAlert" DROP CONSTRAINT "CrisisAlert_therapistId_fkey";

-- DropForeignKey
ALTER TABLE "DailyCheckIn" DROP CONSTRAINT "DailyCheckIn_userId_fkey";

-- DropForeignKey
ALTER TABLE "TherapistNote" DROP CONSTRAINT "TherapistNote_clientId_fkey";

-- DropForeignKey
ALTER TABLE "TherapistNote" DROP CONSTRAINT "TherapistNote_therapistId_fkey";

-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CrisisAlert" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "severity" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "resolvedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DailyCheckIn" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "date" SET NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedGoals" SET NOT NULL,
ALTER COLUMN "totalGoals" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GratitudeEntry" ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "content" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "acknowledgment" TEXT,
ADD COLUMN     "groundingMode" BOOLEAN,
ADD COLUMN     "groundingTurns" INTEGER,
ADD COLUMN     "isCrisisResponse" BOOLEAN DEFAULT false,
ADD COLUMN     "layerProgress" JSONB,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "patternNote" TEXT,
ADD COLUMN     "progressScore" INTEGER,
ADD COLUMN     "question" TEXT,
ADD COLUMN     "thoughtPattern" TEXT,
ALTER COLUMN "sessionId" SET NOT NULL,
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "content" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MoodEntry" ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "mood" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "coreBeliefAlreadyDetected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "groundingMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "groundingTurns" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastIntentUsed" TEXT,
ADD COLUMN     "lastQuestionType" TEXT,
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "currentLayer" SET NOT NULL,
ALTER COLUMN "isCompleted" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TherapistNote" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "isPrivate" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "clerkId" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "playing_with_neon";

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodEntry" ADD CONSTRAINT "MoodEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GratitudeEntry" ADD CONSTRAINT "GratitudeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckIn" ADD CONSTRAINT "DailyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapistNote" ADD CONSTRAINT "TherapistNote_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapistNote" ADD CONSTRAINT "TherapistNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisAlert" ADD CONSTRAINT "CrisisAlert_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisAlert" ADD CONSTRAINT "CrisisAlert_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

