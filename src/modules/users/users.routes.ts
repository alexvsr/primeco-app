import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth";
import { prisma } from "../../config/prisma";

const router = Router();

router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    roles: user.roles.map((r) => r.role.name),
  });
});

export default router;
