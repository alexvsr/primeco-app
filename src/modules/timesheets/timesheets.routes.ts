import { Router } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth";
import { prisma } from "../../config/prisma";
import { requireRoles } from "../../middleware/roles";

const router = Router();

const shiftSchema = z.object({
  staff_id: z.number().int(),
  position: z.string().min(1),
  start_time: z.string(),
  end_time: z.string(),
  break_minutes: z.number().int().min(0).max(240).default(0),
  notes: z.string().optional(),
});

const timesheetCreateSchema = z.object({
  buvette_id: z.number().int(),
  responsable_id: z.number().int(),
  shifts: z.array(shiftSchema),
});

function computeHours(start: string, end: string, breakMinutes: number) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60) - breakMinutes / 60;
  return Math.round(diff * 100) / 100;
}

router.get("/events/:eventId/timesheets", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const eventId = Number(req.params.eventId);
  const timesheets = await prisma.timesheet.findMany({
    where: { eventId },
    include: { shifts: true, buvette: true },
  });
  return res.json(timesheets);
});

router.post("/events/:eventId/timesheets", authMiddleware, requireRoles("RB"), async (req: AuthenticatedRequest, res) => {
  const eventId = Number(req.params.eventId);
  const parsed = timesheetCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
  const data = parsed.data;

  const created = await prisma.$transaction(async (tx) => {
    const timesheet = await tx.timesheet.create({
      data: {
        eventId,
        buvetteId: data.buvette_id,
        responsableId: data.responsable_id,
        status: "DRAFT",
      },
    });

    await tx.shift.createMany({
      data: data.shifts.map((s) => ({
        timesheetId: timesheet.id,
        staffId: s.staff_id,
        position: s.position,
        startTime: new Date(s.start_time),
        endTime: new Date(s.end_time),
        breakMinutes: s.break_minutes,
        hoursWorked: computeHours(s.start_time, s.end_time, s.break_minutes),
        notes: s.notes || null,
      })),
    });
    return timesheet;
  });

  const full = await prisma.timesheet.findUnique({
    where: { id: created.id },
    include: { shifts: true },
  });
  return res.status(201).json(full);
});

router.get("/timesheets/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: { shifts: true, buvette: true, event: true },
  });
  if (!timesheet) return res.status(404).json({ message: "Not found" });
  return res.json(timesheet);
});

router.put("/timesheets/:id", authMiddleware, requireRoles("RB"), async (req, res) => {
  const id = Number(req.params.id);
  const timesheet = await prisma.timesheet.findUnique({ where: { id } });
  if (!timesheet) return res.status(404).json({ message: "Not found" });
  if (timesheet.status === "VALIDATED") return res.status(400).json({ message: "Cannot edit validated timesheet" });

  const shiftsInput = z.array(shiftSchema).safeParse(req.body.shifts);
  if (!shiftsInput.success) return res.status(400).json({ message: shiftsInput.error.message });
  const shifts = shiftsInput.data;

  await prisma.$transaction(async (tx) => {
    await tx.shift.deleteMany({ where: { timesheetId: id } });
    await tx.shift.createMany({
      data: shifts.map((s) => ({
        timesheetId: id,
        staffId: s.staff_id,
        position: s.position,
        startTime: new Date(s.start_time),
        endTime: new Date(s.end_time),
        breakMinutes: s.break_minutes,
        hoursWorked: computeHours(s.start_time, s.end_time, s.break_minutes),
        notes: s.notes || null,
      })),
    });
    await tx.timesheet.update({
      where: { id },
      data: { status: "DRAFT" },
    });
  });

  const updated = await prisma.timesheet.findUnique({ where: { id }, include: { shifts: true } });
  return res.json(updated);
});

router.post("/timesheets/:id/submit", authMiddleware, requireRoles("RB"), async (req, res) => {
  const id = Number(req.params.id);
  const timesheet = await prisma.timesheet.update({ where: { id }, data: { status: "SUBMITTED" } });
  return res.json(timesheet);
});

router.post("/timesheets/:id/validate", authMiddleware, requireRoles("CHEF_OPS"), async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const userId = req.user?.sub;
  const timesheet = await prisma.timesheet.update({
    where: { id },
    data: { status: "VALIDATED", validatedById: userId || null, validatedAt: new Date() },
  });
  return res.json(timesheet);
});

router.post("/timesheets/:id/shifts", authMiddleware, requireRoles("RB"), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = shiftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
  const s = parsed.data;
  const shift = await prisma.shift.create({
    data: {
      timesheetId: id,
      staffId: s.staff_id,
      position: s.position,
      startTime: new Date(s.start_time),
      endTime: new Date(s.end_time),
      breakMinutes: s.break_minutes,
      hoursWorked: computeHours(s.start_time, s.end_time, s.break_minutes),
      notes: s.notes || null,
    },
  });
  return res.status(201).json(shift);
});

router.get("/staff", authMiddleware, async (req, res) => {
  const eventId = req.query.eventId ? Number(req.query.eventId) : undefined;
  const buvetteId = req.query.buvetteId ? Number(req.query.buvetteId) : undefined;

  // If eventId and buvetteId are provided, filter by assignment
  if (eventId && buvetteId) {
    const assignments = await prisma.staffAssignment.findMany({
      where: { eventId, buvetteId },
      include: {
        staff: true
      }
    });

    const assignedStaff = assignments.map(a => ({
      id: `staff_${a.staff.id}`,
      original_id: a.staff.id,
      type: 'staff',
      firstName: a.staff.firstName,
      lastName: a.staff.lastName,
      email: a.staff.email,
      displayName: `${a.staff.firstName} ${a.staff.lastName} (Staff)`
    }));

    // Also get users (managers) - they can work at any buvette
    const users = await prisma.user.findMany({
      include: { roles: { include: { role: true } } }
    });

    const allStaff = [
      ...assignedStaff,
      ...users.map(u => ({
        id: `user_${u.id}`,
        original_id: u.id,
        type: 'user',
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        displayName: `${u.firstName} ${u.lastName} (Responsable)`
      }))
    ];

    return res.json(allStaff);
  }

  // Otherwise return all staff + users (admin view)
  const staffMembers = await prisma.staffMember.findMany();

  // Get users (managers/responsables)
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } }
  });

  // Combine both lists with type indicator
  const combined = [
    ...staffMembers.map(s => ({
      id: `staff_${s.id}`,
      original_id: s.id,
      type: 'staff',
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      displayName: `${s.firstName} ${s.lastName} (Staff)`
    })),
    ...users.map(u => ({
      id: `user_${u.id}`,
      original_id: u.id,
      type: 'user',
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      displayName: `${u.firstName} ${u.lastName} (Responsable)`
    }))
  ];

  return res.json(combined);
});

export default router;
