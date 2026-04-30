"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../config/prisma");
const roles_1 = require("../../middleware/roles");
const router = (0, express_1.Router)();
// Get all events with buvettes
router.get("/events/:id/buvettes", auth_1.authMiddleware, async (req, res) => {
    const eventId = Number(req.params.id);
    const buvettes = await prisma_1.prisma.eventBuvette.findMany({
        where: { eventId },
        include: { buvette: true }
    });
    return res.json(buvettes.map(eb => eb.buvette));
});
// Get buvettes filtered by sport
router.get("/buvettes/by-sport/:sport", auth_1.authMiddleware, async (req, res) => {
    const sport = req.params.sport.toUpperCase();
    const buvettes = await prisma_1.prisma.buvette.findMany({
        where: { sport, isActive: true },
        orderBy: { name: 'asc' }
    });
    return res.json(buvettes);
});
// Create event
router.post("/events", auth_1.authMiddleware, (0, roles_1.requireRoles)("ADMIN", "CHEF_OPS"), async (req, res) => {
    const { name, date, venue, sport, buvetteIds } = req.body;
    const event = await prisma_1.prisma.event.create({
        data: {
            name,
            date: new Date(date),
            venue,
            sport: sport.toUpperCase()
        }
    });
    // Link selected buvettes
    if (buvetteIds && buvetteIds.length > 0) {
        await prisma_1.prisma.eventBuvette.createMany({
            data: buvetteIds.map((buvetteId) => ({
                eventId: event.id,
                buvetteId
            }))
        });
    }
    return res.status(201).json(event);
});
// Get staff assignments for an event
router.get("/events/:id/staff-assignments", auth_1.authMiddleware, async (req, res) => {
    const eventId = Number(req.params.id);
    const assignments = await prisma_1.prisma.staffAssignment.findMany({
        where: { eventId },
        include: { staff: true, buvette: true }
    });
    return res.json(assignments);
});
// Assign staff to a buvette for an event
router.post("/events/:eventId/buvettes/:buvetteId/staff", auth_1.authMiddleware, (0, roles_1.requireRoles)("ADMIN", "CHEF_OPS"), async (req, res) => {
    try {
        const eventId = Number(req.params.eventId);
        const buvetteId = Number(req.params.buvetteId);
        const { staffId } = req.body;
        if (!staffId) {
            return res.status(400).json({ message: "staffId is required" });
        }
        // Verify all entities exist before creating assignment
        const [event, buvette, staff] = await Promise.all([
            prisma_1.prisma.event.findUnique({ where: { id: eventId } }),
            prisma_1.prisma.buvette.findUnique({ where: { id: buvetteId } }),
            prisma_1.prisma.staffMember.findUnique({ where: { id: Number(staffId) } })
        ]);
        if (!event)
            return res.status(400).json({ message: `Événement ${eventId} introuvable` });
        if (!buvette)
            return res.status(400).json({ message: `Buvette ${buvetteId} introuvable` });
        if (!staff)
            return res.status(400).json({ message: `Staff ${staffId} introuvable` });
        // Check if staff is already assigned to any buvette for this event
        const existingAssignment = await prisma_1.prisma.staffAssignment.findFirst({
            where: { eventId, staffId: Number(staffId) },
            include: { buvette: true }
        });
        if (existingAssignment) {
            return res.status(409).json({
                message: `${staff.firstName} ${staff.lastName} est déjà assigné(e) à ${existingAssignment.buvette.name}`
            });
        }
        // Count existing assignments for this buvette to determine slot index
        const existingCount = await prisma_1.prisma.staffAssignment.count({
            where: { eventId, buvetteId }
        });
        // Get arrival time based on buvette schedule
        const { getArrivalTimeForSlot } = await Promise.resolve().then(() => __importStar(require("../../config/buvette-schedules")));
        const arrivalTime = getArrivalTimeForSlot(buvette.name, existingCount);
        const slotIndex = existingCount + 1;
        const assignment = await prisma_1.prisma.staffAssignment.create({
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
    }
    catch (err) {
        console.error("Staff assignment error:", err);
        if (err.code === 'P2002') {
            return res.status(409).json({ message: "Ce membre est déjà assigné à cette buvette" });
        }
        return res.status(500).json({ message: err.message || "Erreur interne" });
    }
});
// Remove staff assignment
router.delete("/events/:eventId/buvettes/:buvetteId/staff/:staffId", auth_1.authMiddleware, (0, roles_1.requireRoles)("ADMIN", "CHEF_OPS"), async (req, res) => {
    const eventId = Number(req.params.eventId);
    const buvetteId = Number(req.params.buvetteId);
    const staffId = Number(req.params.staffId);
    await prisma_1.prisma.staffAssignment.deleteMany({
        where: { eventId, buvetteId, staffId }
    });
    return res.json({ message: "Assignment removed" });
});
// Update arrival time for a staff assignment
router.patch("/events/:eventId/buvettes/:buvetteId/staff/:staffId", auth_1.authMiddleware, (0, roles_1.requireRoles)("ADMIN", "CHEF_OPS"), async (req, res) => {
    const eventId = Number(req.params.eventId);
    const buvetteId = Number(req.params.buvetteId);
    const staffId = Number(req.params.staffId);
    const { arrivalTime } = req.body;
    const updated = await prisma_1.prisma.staffAssignment.updateMany({
        where: { eventId, buvetteId, staffId },
        data: { arrivalTime }
    });
    if (updated.count === 0) {
        return res.status(404).json({ message: "Assignment not found" });
    }
    return res.json({ message: "Arrival time updated", arrivalTime });
});
exports.default = router;
