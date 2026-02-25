-- CreateEnum
CREATE TYPE "AnimeSource" AS ENUM ('COMMUNITY', 'DSTUDIO');

-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "source" "AnimeSource" NOT NULL DEFAULT 'COMMUNITY';
