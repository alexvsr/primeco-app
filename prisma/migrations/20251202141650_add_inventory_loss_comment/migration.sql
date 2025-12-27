-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "comment" TEXT,
ADD COLUMN     "loss" DOUBLE PRECISION DEFAULT 0;
