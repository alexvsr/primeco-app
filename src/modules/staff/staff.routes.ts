import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { prisma } from "../../config/prisma";
import { requireRoles } from "../../middleware/roles";

const router = Router();

const staffSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    hourlyRate: z.number().optional().nullable(),
    contractNumber: z.string().optional().nullable(),
    staffType: z.string().default("EXTRA"),
});

// Get all staff members
router.get("/staff-members", authMiddleware, async (req, res) => {
    const staff = await prisma.staffMember.findMany({
        orderBy: { lastName: 'asc' }
    });
    return res.json(staff);
});

// Alias for frontend compatibility
router.get("/staff", async (req, res) => {
    const staff = await prisma.staffMember.findMany({
        orderBy: { lastName: 'asc' }
    });
    return res.json(staff);
});

// Create staff member
router.post("/staff-members", authMiddleware, requireRoles("ADMIN"), async (req, res) => {
    const parsed = staffSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const staff = await prisma.staffMember.create({
        data: parsed.data
    });

    return res.status(201).json(staff);
});

// Update staff member
router.put("/staff-members/:id", authMiddleware, requireRoles("ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const parsed = staffSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const staff = await prisma.staffMember.update({
        where: { id },
        data: parsed.data
    });

    return res.json(staff);
});

// Delete staff member
router.delete("/staff-members/:id", authMiddleware, requireRoles("ADMIN"), async (req, res) => {
    const id = Number(req.params.id);

    // Delete assignments first
    await prisma.staffAssignment.deleteMany({
        where: { staffId: id }
    });

    // Delete staff member
    await prisma.staffMember.delete({
        where: { id }
    });

    return res.json({ message: "Staff member deleted" });
});

export default router;
