"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const roles_1 = require("../../middleware/roles");
const prisma_1 = require("../../config/prisma");
const router = (0, express_1.Router)();
router.get("/checklists/templates", auth_1.authMiddleware, async (_req, res) => {
    const templates = await prisma_1.prisma.checklistTemplate.findMany({ include: { items: true } });
    return res.json(templates);
});
router.get("/checklists/templates/:id", auth_1.authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const tpl = await prisma_1.prisma.checklistTemplate.findUnique({ where: { id }, include: { items: true } });
    if (!tpl)
        return res.status(404).json({ message: "Template not found" });
    return res.json(tpl);
});
const responseSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        item_id: zod_1.z.number().int(),
        value: zod_1.z.boolean(),
        comment: zod_1.z.string().optional(),
    })),
});
router.post("/events/:eventId/buvettes/:buvetteId/checklists/:templateId", auth_1.authMiddleware, (0, roles_1.requireRoles)("RB"), async (req, res) => {
    const parsed = responseSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.message });
    const eventId = Number(req.params.eventId);
    const buvetteId = Number(req.params.buvetteId);
    const templateId = Number(req.params.templateId);
    const response = await prisma_1.prisma.$transaction(async (tx) => {
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
    const full = await prisma_1.prisma.checklistResponse.findUnique({
        where: { id: response.id },
        include: { items: true },
    });
    return res.status(201).json(full);
});
router.get("/checklists/responses/:id", auth_1.authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const resp = await prisma_1.prisma.checklistResponse.findUnique({
        where: { id },
        include: { items: true, template: { include: { items: true } } },
    });
    if (!resp)
        return res.status(404).json({ message: "Not found" });
    return res.json(resp);
});
router.post("/checklists/responses/:id/submit", auth_1.authMiddleware, (0, roles_1.requireRoles)("RB"), async (req, res) => {
    const id = Number(req.params.id);
    const resp = await prisma_1.prisma.checklistResponse.update({
        where: { id },
        data: { status: "SUBMITTED" },
    });
    return res.json(resp);
});
router.post("/checklists/responses/:id/validate", auth_1.authMiddleware, (0, roles_1.requireRoles)("CHEF_OPS"), async (req, res) => {
    const id = Number(req.params.id);
    const resp = await prisma_1.prisma.checklistResponse.update({
        where: { id },
        data: { status: "VALIDATED", validatedAt: new Date() },
    });
    return res.json(resp);
});
exports.default = router;
