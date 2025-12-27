import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth";
import { prisma } from "../../config/prisma";
import { requireRoles } from "../../middleware/roles";

const router = Router();

// Get all events with buvettes
router.get("/events/:id/buvettes", authMiddleware, async (req, res) => {
    const eventId = Number(req.params.id);
    const buvettes = await prisma.eventBuvette.findMany({
        where: { eventId },
        include: { buvette: true }
    });
    return res.json(buvettes.map(eb => eb.buvette));
});

// Get buvettes filtered by sport
router.get("/buvettes/by-sport/:sport", authMiddleware, async (req, res) => {
    const sport = req.params.sport.toUpperCase();
    const buvettes = await prisma.buvette.findMany({
        where: { sport, isActive: true },
        orderBy: { name: 'asc' }
    });
    return res.json(buvettes);
});

// Create event
router.post("/events", authMiddleware, requireRoles("ADMIN", "CHEF_OPS"), async (req, res) => {
    const { name, date, venue, sport, buvetteIds } = req.body;

    const event = await prisma.event.create({
        data: {
            name,
            date: new Date(date),
            venue,
            sport: sport.toUpperCase()
        }
    });

    // Link selected buvettes
    if (buvetteIds && buvetteIds.length > 0) {
        await prisma.eventBuvette.createMany({
            data: buvetteIds.map((buvetteId: number) => ({
                eventId: event.id,
                buvetteId
            }))
        });
    }

    return res.status(201).json(event);
});

// Get staff assignments for an event
router.get("/events/:id/staff-assignments", authMiddleware, async (req, res) => {
    const eventId = Number(req.params.id);
    const assignments = await prisma.staffAssignment.findMany({
        where: { eventId },
        include: { staff: true, buvette: true }
    });
    return res.json(assignments);
});

// Assign staff to a buvette for an event
router.post("/events/:eventId/buvettes/:buvetteId/staff", authMiddleware, requireRoles("ADMIN", "CHEF_OPS"), async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);
        const buvetteId = Number(req.params.buvetteId);
        const { staffId } = req.body;

        if (!staffId) {
            return res.status(400).json({ message: "staffId is required" });
        }

        // Verify all entities exist before creating assignment
        const [event, buvette, staff] = await Promise.all([
            prisma.event.findUnique({ where: { id: eventId } }),
            prisma.buvette.findUnique({ where: { id: buvetteId } }),
            prisma.staffMember.findUnique({ where: { id: Number(staffId) } })
        ]);

        if (!event) return res.status(400).json({ message: `Événement ${eventId} introuvable` });
        if (!buvette) return res.status(400).json({ message: `Buvette ${buvetteId} introuvable` });
        if (!staff) return res.status(400).json({ message: `Staff ${staffId} introuvable` });

        // Check if staff is already assigned to any buvette for this event
        const existingAssignment = await prisma.staffAssignment.findFirst({
            where: { eventId, staffId: Number(staffId) },
            include: { buvette: true }
        });

        if (existingAssignment) {
            return res.status(409).json({
                message: `${staff.firstName} ${staff.lastName} est déjà assigné(e) à ${existingAssignment.buvette.name}`
            });
        }

        // Count existing assignments for this buvette to determine slot index
        const existingCount = await prisma.staffAssignment.count({
            where: { eventId, buvetteId }
        });

        // Get arrival time based on buvette schedule
        const { getArrivalTimeForSlot } = await import("../../config/buvette-schedules");
        const arrivalTime = getArrivalTimeForSlot(buvette.name, existingCount);
        const slotIndex = existingCount + 1;

        const assignment = await prisma.staffAssignment.create({
            data: {
                eventId,
                buvetteId,
                staffId: Number(staffId),
                arrivalTime,
                slotIndex
            },
            include: { staff: true, buvette: true }
        });

        console.log(`Assigned ${staff.firstName} ${staff.lastName} to ${buvette.name} at ${arrivalTime} (slot ${slotIndex})`);

        return res.status(201).json(assignment);
    } catch (err: any) {
        console.error("Staff assignment error:", err);
        if (err.code === 'P2002') {
            return res.status(409).json({ message: "Ce membre est déjà assigné à cette buvette" });
        }
        return res.status(500).json({ message: err.message || "Erreur interne" });
    }
});

// Remove staff assignment
router.delete("/events/:eventId/buvettes/:buvetteId/staff/:staffId", authMiddleware, requireRoles("ADMIN", "CHEF_OPS"), async (req, res) => {
    const eventId = Number(req.params.eventId);
    const buvetteId = Number(req.params.buvetteId);
    const staffId = Number(req.params.staffId);

    await prisma.staffAssignment.deleteMany({
        where: { eventId, buvetteId, staffId }
    });

    return res.json({ message: "Assignment removed" });
});

// Update arrival time for a staff assignment
router.patch("/events/:eventId/buvettes/:buvetteId/staff/:staffId", authMiddleware, requireRoles("ADMIN", "CHEF_OPS"), async (req, res) => {
    const eventId = Number(req.params.eventId);
    const buvetteId = Number(req.params.buvetteId);
    const staffId = Number(req.params.staffId);
    const { arrivalTime } = req.body;

    const updated = await prisma.staffAssignment.updateMany({
        where: { eventId, buvetteId, staffId },
        data: { arrivalTime }
    });

    if (updated.count === 0) {
        return res.status(404).json({ message: "Assignment not found" });
    }

    return res.json({ message: "Arrival time updated", arrivalTime });
});

export default router;
