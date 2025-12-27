import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { requireRoles } from "../../middleware/roles";
import { prisma } from "../../config/prisma";

const router = Router();

router.get("/checklists/templates", authMiddleware, async (_req, res) => {
  const templates = await prisma.checklistTemplate.findMany({ include: { items: true } });
  return res.json(templates);
});

router.get("/checklists/templates/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const tpl = await prisma.checklistTemplate.findUnique({ where: { id }, include: { items: true } });
  if (!tpl) return res.status(404).json({ message: "Template not found" });
  return res.json(tpl);
});

const responseSchema = z.object({
  items: z.array(
    z.object({
      item_id: z.number().int(),
      value: z.boolean(),
      comment: z.string().optional(),
    })
  ),
});

router.post(
  "/events/:eventId/buvettes/:buvetteId/checklists/:templateId",
  authMiddleware,
  requireRoles("RB"),
  async (req, res) => {
    const parsed = responseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const eventId = Number(req.params.eventId);
    const buvetteId = Number(req.params.buvetteId);
    const templateId = Number(req.params.templateId);

    const response = await prisma.$transaction(async (tx) => {
      const resp = await tx.checklistResponse.create({
        data: {
          eventId,
          buvetteId,
          templateId,
          status: "DRAFT",
        },
      });
      await tx.checklistResponseItem.createMany({
        data: parsed.data.items.map((i) => ({
          responseId: resp.id,
          itemId: i.item_id,
          value: i.value,
          comment: i.comment || null,
        })),
      });
      return resp;
    });

    const full = await prisma.checklistResponse.findUnique({
      where: { id: response.id },
      include: { items: true },
    });
    return res.status(201).json(full);
  }
);

router.get("/checklists/responses/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const resp = await prisma.checklistResponse.findUnique({
    where: { id },
    include: { items: true, template: { include: { items: true } } },
  });
  if (!resp) return res.status(404).json({ message: "Not found" });
  return res.json(resp);
});

router.post("/checklists/responses/:id/submit", authMiddleware, requireRoles("RB"), async (req, res) => {
  const id = Number(req.params.id);
  const resp = await prisma.checklistResponse.update({
    where: { id },
    data: { status: "SUBMITTED" },
  });
  return res.json(resp);
});

router.post("/checklists/responses/:id/validate", authMiddleware, requireRoles("CHEF_OPS"), async (req, res) => {
  const id = Number(req.params.id);
  const resp = await prisma.checklistResponse.update({
    where: { id },
    data: { status: "VALIDATED", validatedAt: new Date() },
  });
  return res.json(resp);
});

export default router;
