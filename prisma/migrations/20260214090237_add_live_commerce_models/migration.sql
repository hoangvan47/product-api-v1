-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'LIVE', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'PRODUCT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('LIVE', 'STORE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sellerId" INTEGER,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';

-- Ensure a fallback seller exists for legacy product rows
INSERT INTO "User" ("email", "password", "createdAt", "updatedAt")
VALUES ('system@shop.local', 'system-seeded', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;

-- Backfill sellerId from demo account first
UPDATE "Product"
SET "sellerId" = (SELECT "id" FROM "User" WHERE "email" = 'demo@shop.local' LIMIT 1)
WHERE "sellerId" IS NULL;

-- Fallback to first available user if demo account is missing
UPDATE "Product"
SET "sellerId" = (SELECT "id" FROM "User" ORDER BY "id" ASC LIMIT 1)
WHERE "sellerId" IS NULL;

-- Enforce non-null sellerId after backfill
ALTER TABLE "Product" ALTER COLUMN "sellerId" SET NOT NULL;

-- CreateTable
CREATE TABLE "LiveChatMessage" (
    "id" SERIAL NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderUserId" INTEGER,
    "senderLabel" TEXT,
    "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "message" TEXT NOT NULL,
    "productId" INTEGER,
    "productData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveProductMention" (
    "id" SERIAL NOT NULL,
    "roomId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveProductMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "source" "OrderSource" NOT NULL DEFAULT 'STORE',
    "roomId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveProductMention" ADD CONSTRAINT "LiveProductMention_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
