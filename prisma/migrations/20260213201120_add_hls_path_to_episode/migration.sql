/*
  Warnings:

  - Made the column `videoPath` on table `Episode` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Episode" ALTER COLUMN "videoPath" SET NOT NULL;
