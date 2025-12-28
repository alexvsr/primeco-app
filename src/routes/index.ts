import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import timesheetsRouter from "../modules/timesheets/timesheets.routes";
import eventsRouter from "../modules/events/events.routes";
import inventoryRouter from "../modules/inventory/inventory.routes";
import checklistRouter from "../modules/checklist/checklist.routes";
import buvettesRouter from "../modules/buvettes/buvettes.routes";
import adminRouter from "../modules/admin/admin.routes";
import staffRouter from "../modules/staff/staff.routes";
import { prisma } from "../config/prisma";

const router = Router();

// Routes alias pour compatibilité frontend
const assignmentsAlias = Router();
assignmentsAlias.get("/event/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;
        const assignments = await prisma.staffAssignment.findMany({
            where: { eventId: parseInt(eventId) },
            include: { staff: true, buvette: true }
        });
        return res.json(assignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return res.status(500).json({ error: 'Database connection error' });
    }
});

const inventoryAlias = Router();
inventoryAlias.get("/event/:eventId/buvette/:buvetteId", async (req, res) => {
    try {
        const { eventId, buvetteId } = req.params;
        const snapshots = await prisma.inventorySnapshot.findMany({
            where: {
                eventId: parseInt(eventId),
                buvetteId: parseInt(buvetteId)
            },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(snapshots);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return res.status(500).json({ error: 'Database connection error' });
    }
});

// Ping route that wakes up the database connection
const pingRoute = Router();
pingRoute.get("/", async (_req, res) => {
    try {
        // Simple query to wake up the database
        await prisma.$queryRaw`SELECT 1`;
        return res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('Database ping failed:', error);
        return res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

router.use("/ping", pingRoute);
router.use("/auth", authRouter);
router.use("/events", eventsRouter);
router.use("/buvettes", buvettesRouter);
router.use("/assignments", assignmentsAlias);
router.use("/inventory", inventoryAlias);
router.use("/", inventoryRouter);
router.use("/", checklistRouter);
router.use("/", timesheetsRouter);
router.use("/", adminRouter);
router.use("/", staffRouter);

export default router;
