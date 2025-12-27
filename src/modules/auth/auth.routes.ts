import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { signAccess, signRefresh, verifyRefresh } from "../../utils/jwt";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.message });
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const roleNames = user.roles.map((r) => r.role.name);
  const payload = { sub: user.id, roles: roleNames };
  return res.json({
    access_token: signAccess(payload),
    refresh_token: signRefresh(payload),
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
  if (!token) return res.status(400).json({ message: "Missing refresh token" });
  try {
    const payload = verifyRefresh(token);
    return res.json({
      access_token: signAccess(payload),
      refresh_token: signRefresh(payload),
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

router.post("/logout", async (_req, res) => {
  // With stateless JWT, client just drops tokens. A blacklist table could be added later.
  return res.json({ message: "Logged out" });
});

export default router;
