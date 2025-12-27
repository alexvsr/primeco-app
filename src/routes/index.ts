import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import timesheetsRouter from "../modules/timesheets/timesheets.routes";
import eventsRouter from "../modules/events/events.routes";
import inventoryRouter from "../modules/inventory/inventory.routes";
import checklistRouter from "../modules/checklist/checklist.routes";
import buvettesRouter from "../modules/buvettes/buvettes.routes";
import adminRouter from "../modules/admin/admin.routes";
import staffRouter from "../modules/staff/staff.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/events", eventsRouter);
router.use("/buvettes", buvettesRouter);
router.use("/", inventoryRouter);
router.use("/", checklistRouter);
router.use("/", timesheetsRouter);
router.use("/", adminRouter);
router.use("/", staffRouter);

export default router;
