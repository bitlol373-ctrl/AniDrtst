-- AlterTable
ALTER TABLE "Episode" ALTER COLUMN "videoPath" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "passwordHash" TEXT;
