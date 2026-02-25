-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "hlsPath" TEXT,
ALTER COLUMN "videoPath" DROP NOT NULL;
