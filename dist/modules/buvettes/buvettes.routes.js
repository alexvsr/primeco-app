"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    const buvettes = await prisma_1.prisma.buvette.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
    });
    return res.json(buvettes);
});
exports.default = router;
