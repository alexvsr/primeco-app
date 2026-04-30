"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../config/prisma");
const router = (0, express_1.Router)();
router.get("/me", auth_1.authMiddleware, async (req, res) => {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ message: "Unauthorized" });
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
    });
    if (!user)
        return res.status(404).json({ message: "User not found" });
    return res.json({
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        roles: user.roles.map((r) => r.role.name),
    });
});
exports.default = router;
