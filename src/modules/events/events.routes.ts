import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth";
import { prisma } from "../../config/prisma";
import { z } from "zod";
import { requireRoles } from "../../middleware/roles";

const router = Router();

const eventSchema = z.object({
  name: z.string().min(1),
  date: z.string(),
  venue: z.string().optional(),
  opening_time: z.string().optional(),
  match_time: z.string().optional(),
  notes: z.string().optional(),
});

// Public route - list events with buvettes (for responsable login)
router.get("/", async (_req, res) => {
  const events = await prisma.event.findMany({
    include: {
      buvettes: {
        include: {
          buvette: true
        }
      }
    },
    orderBy: { date: 'desc' }
  });
  return res.json(events);
});

router.post("/", authMiddleware, requireRoles("CHEF_OPS", "ADMIN"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    date: z.string(),
    venue: z.string().optional(),
    sport: z.string().optional(),
    opening_time: z.string().optional(),
    match_time: z.string().optional(),
    notes: z.string().optional(),
    buvetteIds: z.array(z.number()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
  const body = parsed.data;

  const event = await prisma.event.create({
    data: {
      name: body.name,
      date: new Date(body.date),
      venue: body.venue,
      sport: body.sport?.toUpperCase(),
      openingTime: body.opening_time ? new Date(body.opening_time) : null,
      matchTime: body.match_time ? new Date(body.match_time) : null,
      notes: body.notes,
    },
  });

  // Link selected buvettes if provided
  if (body.buvetteIds && body.buvetteIds.length > 0) {
    await prisma.eventBuvette.createMany({
      data: body.buvetteIds.map((buvetteId: number) => ({
        eventId: event.id,
        buvetteId
      }))
    });
  }

  return res.status(201).json(event);
});

router.get("/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const event = await prisma.event.findUnique({
    where: { id },
    include: { buvettes: { include: { buvette: true, responsable: true } } },
  });
  if (!event) return res.status(404).json({ message: "Event not found" });
  return res.json(event);
});

// Public route - get buvettes for an event (for responsable login)
// Public route - get buvettes for an event (for responsable login)
router.get("/:id/buvettes", async (req, res) => {
  const id = Number(req.params.id);
  const links = await prisma.eventBuvette.findMany({
    where: { eventId: id },
    include: { buvette: true, responsable: true },
  });
  return res.json(links);
});

// Public route - get staff assignments for an event (for responsable login)
router.get("/:id/assignments", async (req, res) => {
  const id = Number(req.params.id);
  const assignments = await prisma.staffAssignment.findMany({
    where: { eventId: id },
    include: { staff: true, buvette: true }
  });
  return res.json(assignments);
});

router.post("/:id/buvettes", authMiddleware, requireRoles("CHEF_OPS"), async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    buvette_id: z.number().int(),
    responsable_id: z.number().int(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
  const link = await prisma.eventBuvette.upsert({
    where: { eventId_buvetteId: { eventId: id, buvetteId: parsed.data.buvette_id } },
    update: { responsableId: parsed.data.responsable_id },
    create: {
      eventId: id,
      buvetteId: parsed.data.buvette_id,
      responsableId: parsed.data.responsable_id,
    },
  });
  return res.status(201).json(link);
});

// Timesheet submission schemas
const shiftSchema = z.object({
  staffId: z.number().int(),
  position: z.string().min(1),
  startTime: z.string(), // HH:MM
  endTime: z.string(),   // HH:MM
  breakMinutes: z.number().int().min(0).max(240).default(0),
  notes: z.string().optional(),
});

const submissionSchema = z.object({
  buvetteId: z.number().int(),
  shifts: z.array(shiftSchema)
});

function computeHours(start: Date, end: Date, breakMinutes: number) {
  const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60) - breakMinutes / 60;
  return Math.round(diff * 100) / 100;
}

// Public route - get timesheet for an event/buvette (for responsable login)
router.get("/:id/timesheets", async (req, res) => {
  const eventId = Number(req.params.id);
  const buvetteId = req.query.buvetteId ? Number(req.query.buvetteId) : undefined;

  if (!buvetteId) return res.status(400).json({ message: "buvetteId is required" });

  const timesheet = await prisma.timesheet.findFirst({
    where: {
      eventId,
      buvetteId
    },
    include: {
      shifts: true
    }
  });

  return res.json(timesheet || null); // Return null if not found (client will use assignments)
});

// Public route - submit timesheet (for responsable login)
router.post("/:id/timesheets", async (req, res) => {
  const eventId = Number(req.params.id);

  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
  const data = parsed.data;

  // Get event for date
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ message: "Event not found" });
  const dateStr = event.date.toISOString().split('T')[0];

  // Try to find the responsable assigned to this buvette
  const eventBuvette = await prisma.eventBuvette.findUnique({
    where: {
      eventId_buvetteId: {
        eventId,
        buvetteId: data.buvetteId
      }
    }
  });

  const created = await prisma.$transaction(async (tx) => {
    // Check for existing timesheet
    let timesheet = await tx.timesheet.findFirst({
      where: { eventId, buvetteId: data.buvetteId }
    });

    if (timesheet) {
      // Update existing
      await tx.timesheet.update({
        where: { id: timesheet.id },
        data: {
          status: "SUBMITTED",
          responsableId: eventBuvette?.responsableId || timesheet.responsableId
        }
      });
      // Clear old shifts
      await tx.shift.deleteMany({ where: { timesheetId: timesheet.id } });
    } else {
      // Create new
      timesheet = await tx.timesheet.create({
        data: {
          eventId,
          buvetteId: data.buvetteId,
          responsableId: eventBuvette?.responsableId || null,
          status: "SUBMITTED",
        },
      });
    }

    // Create shifts
    await tx.shift.createMany({
      data: data.shifts.map((s) => {
        const startDateTime = new Date(`${dateStr}T${s.startTime}:00`);
        let endDateTime = new Date(`${dateStr}T${s.endTime}:00`);

        // Handle overnight shifts
        if (endDateTime < startDateTime) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        return {
          timesheetId: timesheet.id,
          staffId: s.staffId,
          position: s.position,
          startTime: startDateTime,
          endTime: endDateTime,
          breakMinutes: s.breakMinutes,
          hoursWorked: computeHours(startDateTime, endDateTime, s.breakMinutes),
          notes: s.notes || null,
        };
      }),
    });

    return timesheet;
  });

  return res.status(201).json(created);
});

// --- INVENTORY ROUTES ---

// Public route - Get inventory for event/buvette
router.get("/:eventId/buvettes/:buvetteId/inventory", async (req, res) => {
  const eventId = Number(req.params.eventId);
  const buvetteId = Number(req.params.buvetteId);

  // 1. Get products assigned to this buvette
  const buvetteProducts = await prisma.buvetteProduct.findMany({
    where: { buvetteId },
    include: { product: true },
    orderBy: { displayOrder: 'asc' }
  });

  // 2. Get existing inventory deltas (main data source now)
  const deltas = await prisma.inventoryDelta.findMany({
    where: { eventId, buvetteId }
  });

  // 3. Merge data
  const inventory = buvetteProducts.map(bp => {
    const delta = deltas.find(d => d.productId === bp.productId);
    return {
      productId: bp.product.id,
      name: bp.product.name,
      category: bp.product.category || 'Divers',
      unit: bp.product.unit || 'PCE',
      initialQty: delta?.initialQty ?? null,
      finalQty: delta?.finalQty ?? null,
      restockQty: delta?.restockQuantity ?? null,
      isRestocked: delta?.isRestocked ?? false,
      hasShortage: delta?.hasShortage ?? false,
      shortageQty: delta?.shortageQty ?? null,
      deltaId: delta?.id ?? null
    };
  });

  return res.json({
    products: inventory,
    eventId,
    buvetteId
  });
});

// Public route - Save inventory (complete workflow)
router.post("/:eventId/buvettes/:buvetteId/inventory", async (req, res) => {
  const eventId = Number(req.params.eventId);
  const buvetteId = Number(req.params.buvetteId);

  const schema = z.object({
    items: z.array(z.object({
      productId: z.number().int(),
      initialQty: z.number().nullable().optional(),
      finalQty: z.number().nullable().optional(),
      restockQty: z.number().nullable().optional(),
      isRestocked: z.boolean().optional(),
      hasShortage: z.boolean().optional(),
      shortageQty: z.number().nullable().optional()
    }))
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  // Upsert each item into InventoryDelta
  const results = await prisma.$transaction(
    parsed.data.items.map(item =>
      prisma.inventoryDelta.upsert({
        where: {
          eventId_buvetteId_productId: {
            eventId,
            buvetteId,
            productId: item.productId
          }
        },
        update: {
          initialQty: item.initialQty ?? undefined,
          finalQty: item.finalQty ?? undefined,
          restockQuantity: item.restockQty ?? undefined,
          isRestocked: item.isRestocked ?? false,
          hasShortage: item.hasShortage ?? false,
          shortageQty: item.shortageQty ?? undefined
        },
        create: {
          eventId,
          buvetteId,
          productId: item.productId,
          initialQty: item.initialQty ?? null,
          finalQty: item.finalQty ?? null,
          restockQuantity: item.restockQty ?? null,
          isRestocked: item.isRestocked ?? false,
          hasShortage: item.hasShortage ?? false,
          shortageQty: item.shortageQty ?? null
        }
      })
    )
  );

  return res.json({
    success: true,
    count: results.length
  });
});

// Admin route - Get all shortages across buvettes for an event
router.get("/:eventId/shortages", async (req, res) => {
  const eventId = Number(req.params.eventId);

  const shortages = await prisma.inventoryDelta.findMany({
    where: {
      eventId,
      hasShortage: true
    },
    include: {
      product: true,
      buvette: true
    },
    orderBy: [
      { buvetteId: 'asc' },
      { productId: 'asc' }
    ]
  });

  return res.json(shortages);
});

// =====================================================
// ADMIN SUMMARY ENDPOINTS
// =====================================================

// Admin - Timesheets summary (hours by staff member)
router.get("/:eventId/timesheets/summary", authMiddleware, async (req, res) => {
  const eventId = Number(req.params.eventId);

  const timesheets = await prisma.timesheet.findMany({
    where: { eventId },
    include: {
      buvette: true,
      shifts: {
        include: {
          staff: true
        }
      }
    }
  });

  // Aggregate hours by staff
  const staffHours: Record<number, { staffId: number; name: string; totalHours: number; shifts: any[] }> = {};
  const buvetteSummary: Record<number, { buvetteId: number; name: string; status: string; totalHours: number; shiftCount: number }> = {};

  for (const ts of timesheets) {
    if (!buvetteSummary[ts.buvetteId]) {
      buvetteSummary[ts.buvetteId] = {
        buvetteId: ts.buvetteId,
        name: ts.buvette.name,
        status: ts.status,
        totalHours: 0,
        shiftCount: 0
      };
    }
    buvetteSummary[ts.buvetteId].status = ts.status;

    for (const shift of ts.shifts) {
      const staffId = shift.staffId;
      if (!staffHours[staffId]) {
        staffHours[staffId] = {
          staffId,
          name: shift.staff ? `${shift.staff.firstName} ${shift.staff.lastName}` : `Staff #${staffId}`,
          totalHours: 0,
          shifts: []
        };
      }
      staffHours[staffId].totalHours += shift.hoursWorked || 0;
      staffHours[staffId].shifts.push({
        buvette: ts.buvette.name,
        start: shift.startTime,
        end: shift.endTime,
        hours: shift.hoursWorked
      });

      buvetteSummary[ts.buvetteId].totalHours += shift.hoursWorked || 0;
      buvetteSummary[ts.buvetteId].shiftCount += 1;
    }
  }

  return res.json({
    byStaff: Object.values(staffHours).sort((a, b) => b.totalHours - a.totalHours),
    byBuvette: Object.values(buvetteSummary)
  });
});

// Admin - Inventory summary (all buvettes)
router.get("/:eventId/inventory/summary", authMiddleware, async (req, res) => {
  const eventId = Number(req.params.eventId);

  const deltas = await prisma.inventoryDelta.findMany({
    where: { eventId },
    include: {
      product: true,
      buvette: true
    }
  });

  // Group by buvette
  const byBuvette: Record<number, any> = {};

  for (const d of deltas) {
    if (!byBuvette[d.buvetteId]) {
      byBuvette[d.buvetteId] = {
        buvetteId: d.buvetteId,
        buvetteName: d.buvette.name,
        productCount: 0,
        restockedCount: 0,
        shortageCount: 0,
        items: []
      };
    }
    byBuvette[d.buvetteId].productCount += 1;
    if (d.isRestocked) byBuvette[d.buvetteId].restockedCount += 1;
    if (d.hasShortage) byBuvette[d.buvetteId].shortageCount += 1;
    byBuvette[d.buvetteId].items.push({
      product: d.product.name,
      initial: d.initialQty,
      final: d.finalQty,
      restock: d.restockQuantity,
      shortage: d.shortageQty,
      isRestocked: d.isRestocked,
      hasShortage: d.hasShortage
    });
  }

  return res.json(Object.values(byBuvette));
});

// Admin - Checklists summary (all buvettes)
router.get("/:eventId/checklists/summary", authMiddleware, async (req, res) => {
  const eventId = Number(req.params.eventId);

  const checklists = await prisma.checklistResponse.findMany({
    where: { eventId },
    include: {
      buvette: true,
      template: true,
      items: true
    }
  });

  // Group by buvette
  const byBuvette: Record<number, any> = {};

  for (const cl of checklists) {
    if (!byBuvette[cl.buvetteId]) {
      byBuvette[cl.buvetteId] = {
        buvetteId: cl.buvetteId,
        buvetteName: cl.buvette.name,
        opening: null,
        closing: null
      };
    }

    const summary = {
      templateName: cl.template.name,
      status: cl.status,
      completedAt: cl.filledAt,
      totalItems: cl.items.length,
      okCount: cl.items.filter(i => i.value === true).length,
      issueCount: cl.items.filter(i => i.value === false).length
    };

    // Detect opening/closing based on template name
    const templateLower = cl.template.name.toLowerCase();
    if (templateLower.includes('ouverture') || templateLower.includes('opening')) {
      byBuvette[cl.buvetteId].opening = summary;
    } else if (templateLower.includes('fermeture') || templateLower.includes('closing')) {
      byBuvette[cl.buvetteId].closing = summary;
    }
  }

  return res.json(Object.values(byBuvette));
});

// Admin - Detailed timesheets with staff status per buvette
router.get("/:eventId/timesheets/detailed", authMiddleware, async (req, res) => {
  const eventId = Number(req.params.eventId);

  // Get all buvettes for this event
  const eventBuvettes = await prisma.eventBuvette.findMany({
    where: { eventId },
    include: { buvette: true, responsable: true }
  });

  // Get all staff assignments for this event
  const assignments = await prisma.staffAssignment.findMany({
    where: { eventId },
    include: { staff: true, buvette: true }
  });

  // Get all timesheets and shifts for this event
  const timesheets = await prisma.timesheet.findMany({
    where: { eventId },
    include: {
      buvette: true,
      shifts: {
        include: { staff: true }
      }
    }
  });

  // Build detailed data per buvette
  const buvetteDetails = eventBuvettes.map(eb => {
    const buvetteAssignments = assignments.filter(a => a.buvetteId === eb.buvetteId);
    const buvetteTimesheet = timesheets.find(ts => ts.buvetteId === eb.buvetteId);

    // Map each assigned staff to their status
    const staffStatus = buvetteAssignments.map(assignment => {
      const shift = buvetteTimesheet?.shifts.find(s => s.staffId === assignment.staffId);
      return {
        staffId: assignment.staffId,
        name: `${assignment.staff.firstName} ${assignment.staff.lastName}`,
        email: assignment.staff.email,
        hasClocked: !!shift,
        startTime: shift?.startTime || null,
        endTime: shift?.endTime || null,
        breakMinutes: shift?.breakMinutes || 0,
        hoursWorked: shift?.hoursWorked || 0,
        position: shift?.position || 'Extra'
      };
    });

    return {
      buvetteId: eb.buvetteId,
      buvetteName: eb.buvette.name,
      responsable: eb.responsable ? `${eb.responsable.firstName} ${eb.responsable.lastName}` : null,
      timesheetStatus: buvetteTimesheet?.status || 'NONE',
      assignedCount: staffStatus.length,
      clockedCount: staffStatus.filter(s => s.hasClocked).length,
      totalHours: staffStatus.reduce((sum, s) => sum + s.hoursWorked, 0),
      staff: staffStatus
    };
  });

  return res.json(buvetteDetails);
});

// Admin - Hours export data (formatted for Hotelis CSV/PDF)
router.get("/:eventId/hours/export", authMiddleware, async (req, res) => {
  const eventId = Number(req.params.eventId);

  // Get event info
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ message: "Event not found" });

  // Get all timesheets with shifts
  const timesheets = await prisma.timesheet.findMany({
    where: { eventId },
    include: {
      buvette: true,
      shifts: {
        include: { staff: true }
      }
    }
  });

  // Flatten to export rows
  const rows: any[] = [];
  for (const ts of timesheets) {
    for (const shift of ts.shifts) {
      rows.push({
        eventName: event.name,
        eventDate: event.date,
        buvette: ts.buvette.name,
        staffName: shift.staff ? `${shift.staff.firstName} ${shift.staff.lastName}` : `Staff #${shift.staffId}`,
        staffEmail: shift.staff?.email || '',
        position: shift.position,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakMinutes: shift.breakMinutes,
        hoursWorked: shift.hoursWorked,
        notes: shift.notes || ''
      });
    }
  }

  // Sort by buvette then by staff name
  rows.sort((a, b) => {
    if (a.buvette !== b.buvette) return a.buvette.localeCompare(b.buvette);
    return a.staffName.localeCompare(b.staffName);
  });

  return res.json({
    event: {
      name: event.name,
      date: event.date,
      venue: event.venue
    },
    totalHours: rows.reduce((sum, r) => sum + r.hoursWorked, 0),
    totalStaff: new Set(rows.map(r => r.staffEmail)).size,
    rows
  });
});

export default router;


