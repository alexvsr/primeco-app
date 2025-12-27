import { Router } from "express";
import { prisma } from "../../config/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const buvettes = await prisma.buvette.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return res.json(buvettes);
});

export default router;
