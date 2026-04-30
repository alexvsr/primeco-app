"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../../config/prisma");
const jwt_1 = require("../../utils/jwt");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
    }
    const { email, password } = parsed.data;
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
        include: { roles: { include: { role: true } } },
    });
    if (!user)
        return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ message: "Invalid credentials" });
    const roleNames = user.roles.map((r) => r.role.name);
    const payload = { sub: user.id, roles: roleNames };
    return res.json({
        access_token: (0, jwt_1.signAccess)(payload),
        refresh_token: (0, jwt_1.signRefresh)(payload),
        user: {
            id: user.id,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
            roles: roleNames,
        },
    });
});
router.post("/refresh", async (req, res) => {
    const token = req.body?.refresh_token;
    if (!token)
        return res.status(400).json({ message: "Missing refresh token" });
    try {
        const payload = (0, jwt_1.verifyRefresh)(token);
        return res.json({
            access_token: (0, jwt_1.signAccess)(payload),
            refresh_token: (0, jwt_1.signRefresh)(payload),
        });
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid refresh token" });
    }
});
router.post("/logout", async (_req, res) => {
    // With stateless JWT, client just drops tokens. A blacklist table could be added later.
    return res.json({ message: "Logged out" });
});
exports.default = router;
