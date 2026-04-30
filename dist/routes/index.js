"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const timesheets_routes_1 = __importDefault(require("../modules/timesheets/timesheets.routes"));
const events_routes_1 = __importDefault(require("../modules/events/events.routes"));
const inventory_routes_1 = __importDefault(require("../modules/inventory/inventory.routes"));
const checklist_routes_1 = __importDefault(require("../modules/checklist/checklist.routes"));
const buvettes_routes_1 = __importDefault(require("../modules/buvettes/buvettes.routes"));
const admin_routes_1 = __importDefault(require("../modules/admin/admin.routes"));
const staff_routes_1 = __importDefault(require("../modules/staff/staff.routes"));
const prisma_1 = require("../config/prisma");
const router = (0, express_1.Router)();
// Routes alias pour compatibilité frontend
const assignmentsAlias = (0, express_1.Router)();
assignmentsAlias.get("/event/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;
        const assignments = await prisma_1.prisma.staffAssignment.findMany({
            where: { eventId: parseInt(eventId) },
            include: { staff: true, buvette: true }
        });
        return res.json(assignments);
    }
    catch (error) {
        console.error('Error fetching assignments:', error);
        return res.status(500).json({ error: 'Database connection error' });
    }
});
const inventoryAlias = (0, express_1.Router)();
inventoryAlias.get("/event/:eventId/buvette/:buvetteId", async (req, res) => {
    try {
        const { eventId, buvetteId } = req.params;
        const snapshots = await prisma_1.prisma.inventorySnapshot.findMany({
            where: {
                eventId: parseInt(eventId),
                buvetteId: parseInt(buvetteId)
            },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(snapshots);
    }
    catch (error) {
        console.error('Error fetching inventory:', error);
        return res.status(500).json({ error: 'Database connection error' });
    }
});
// Ping route that wakes up the database connection
const pingRoute = (0, express_1.Router)();
pingRoute.get("/", async (_req, res) => {
    try {
        // Simple query to wake up the database
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        return res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    }
    catch (error) {
        console.error('Database ping failed:', error);
        return res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});
router.use("/ping", pingRoute);
router.use("/auth", auth_routes_1.default);
router.use("/events", events_routes_1.default);
router.use("/buvettes", buvettes_routes_1.default);
router.use("/assignments", assignmentsAlias);
router.use("/inventory", inventoryAlias);
router.use("/", inventory_routes_1.default);
router.use("/", checklist_routes_1.default);
router.use("/", timesheets_routes_1.default);
router.use("/", admin_routes_1.default);
router.use("/", staff_routes_1.default);
exports.default = router;
