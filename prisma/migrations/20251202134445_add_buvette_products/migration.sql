-- CreateTable
CREATE TABLE "BuvetteProduct" (
    "id" SERIAL NOT NULL,
    "buvetteId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "displayOrder" INTEGER,

    CONSTRAINT "BuvetteProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuvetteProduct_buvetteId_productId_key" ON "BuvetteProduct"("buvetteId", "productId");

-- AddForeignKey
ALTER TABLE "BuvetteProduct" ADD CONSTRAINT "BuvetteProduct_buvetteId_fkey" FOREIGN KEY ("buvetteId") REFERENCES "Buvette"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuvetteProduct" ADD CONSTRAINT "BuvetteProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
