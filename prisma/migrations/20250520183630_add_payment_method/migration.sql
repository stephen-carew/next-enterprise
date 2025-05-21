/*
  Warnings:

  - Added the required column `paymentMethod` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRING');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "minQuantity" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "supplier" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAlert" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentRequest_tableId_idx" ON "PaymentRequest"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
