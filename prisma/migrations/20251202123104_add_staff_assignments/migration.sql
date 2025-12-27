-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "buvetteId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffAssignment_eventId_buvetteId_staffId_key" ON "StaffAssignment"("eventId", "buvetteId", "staffId");

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_buvetteId_fkey" FOREIGN KEY ("buvetteId") REFERENCES "Buvette"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
