import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { prisma } from "../../config/prisma";
import { requireRoles } from "../../middleware/roles";

const router = Router();

const itemSchema = z.object({
  product_id: z.number().int(),
  quantity: z.number().nonnegative(),
  loss: z.number().nonnegative().optional(),
  comment: z.string().optional(),
  declared_sales: z.number().nonnegative().optional(),
});

const snapshotSchema = z.object({
  type: z.enum(["INITIAL", "FINAL"]),
  items: z.array(itemSchema).min(1),
});

function computeDelta(initial?: number, final?: number, declared?: number) {
  const init = initial ?? 0;
  const fin = final ?? 0;
  const theoreticalSales = Math.max(init - fin, 0);
  const declaredSales = declared ?? theoreticalSales;
  const delta = declaredSales - theoreticalSales;
  const restockQuantity = Math.max(init - fin, 0);
  return { theoreticalSales, delta, restockQuantity };
}

router.post(
  "/events/:eventId/buvettes/:buvetteId/inventory",
  authMiddleware,
  requireRoles("RB"),
  async (req, res) => {
    const parsed = snapshotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const { type, items } = parsed.data;
    const eventId = Number(req.params.eventId);
    const buvetteId = Number(req.params.buvetteId);

    const snapshot = await prisma.$transaction(async (tx) => {
      const snap = await tx.inventorySnapshot.create({
        data: {
          eventId,
          buvetteId,
          type,
          createdById: null,
        },
      });
      await tx.inventoryItem.createMany({
        data: items.map((i) => ({
          snapshotId: snap.id,
          productId: i.product_id,
          quantity: i.quantity,
          loss: i.loss || 0,
          comment: i.comment || null,
        })),
      });

      // If FINAL, compute deltas using INITIAL snapshot
      if (type === "FINAL") {
        const initial = await tx.inventorySnapshot.findFirst({
          where: { eventId, buvetteId, type: "INITIAL" },
          include: { items: true },
        });
        if (initial) {
          for (const finalItem of items) {
            const initialItem = initial.items.find((it) => it.productId === finalItem.product_id);
            const { theoreticalSales, delta, restockQuantity } = computeDelta(
              initialItem?.quantity,
              finalItem.quantity,
              finalItem.declared_sales
            );
            await tx.inventoryDelta.upsert({
              where: {
                eventId_buvetteId_productId: {
                  eventId,
                  buvetteId,
                  productId: finalItem.product_id,
                },
              },
              update: {
                initialQty: initialItem?.quantity ?? null,
                finalQty: finalItem.quantity,
                theoreticalSales,
                delta,
                restockQuantity,
              },
              create: {
                eventId,
                buvetteId,
                productId: finalItem.product_id,
                initialQty: initialItem?.quantity ?? null,
                finalQty: finalItem.quantity,
                theoreticalSales,
                delta,
                restockQuantity,
              },
            });
          }
        }
      }

      return snap;
    });

    const full = await prisma.inventorySnapshot.findUnique({
      where: { id: snapshot.id },
      include: { items: true },
    });
    return res.status(201).json(full);
  }
);

router.get(
  "/events/:eventId/buvettes/:buvetteId/inventory",
  authMiddleware,
  async (req, res) => {
    const eventId = Number(req.params.eventId);
    const buvetteId = Number(req.params.buvetteId);
    const type = req.query.type as string | undefined;
    const snapshots = await prisma.inventorySnapshot.findMany({
      where: { eventId, buvetteId, type },
      include: { items: true },
    });
    return res.json(snapshots);
  }
);

router.get("/events/:eventId/restock", authMiddleware, requireRoles("LOG", "CHEF_OPS"), async (req, res) => {
  const eventId = Number(req.params.eventId);
  const deltas = await prisma.inventoryDelta.findMany({
    where: { eventId },
    include: { product: true, buvette: true },
  });
  return res.json(
    deltas.map((d) => ({
      buvette: d.buvette.name,
      product: d.product.name,
      unit: d.product.unit,
      restock_quantity: d.restockQuantity ?? 0,
      delta: d.delta ?? 0,
    }))
  );
});

router.get("/products", authMiddleware, async (_req, res) => {
  const products = await prisma.product.findMany({ where: { isActive: true } });
  return res.json(products);
});

// Get products assigned to a buvette
router.get("/buvettes/:buvetteId/products", authMiddleware, async (req, res) => {
  const buvetteId = Number(req.params.buvetteId);
  const products = await prisma.buvetteProduct.findMany({
    where: { buvetteId },
    include: { product: true },
    orderBy: { displayOrder: 'asc' }
  });
  return res.json(products);
});

// Assign product to buvette
router.post("/buvettes/:buvetteId/products", authMiddleware, requireRoles("ADMIN", "CHEF_OPS"), async (req, res) => {
  const buvetteId = Number(req.params.buvetteId);
  const { productId, displayOrder, defaultStock } = req.body;

  const link = await prisma.buvetteProduct.upsert({
    where: { buvetteId_productId: { buvetteId, productId } },
    update: { displayOrder, defaultStock },
    create: { buvetteId, productId, displayOrder, defaultStock }
  });

  return res.status(201).json(link);
});

// Remove product from buvette
router.delete("/buvettes/:buvetteId/products/:productId", authMiddleware, requireRoles("ADMIN", "CHEF_OPS"), async (req, res) => {
  const buvetteId = Number(req.params.buvetteId);
  const productId = Number(req.params.productId);

  await prisma.buvetteProduct.delete({
    where: { buvetteId_productId: { buvetteId, productId } }
  });

  return res.status(204).send();
});

// Batch reorder products
router.put("/buvettes/:buvetteId/products/reorder", authMiddleware, requireRoles("ADMIN", "CHEF_OPS"), async (req, res) => {
  const buvetteId = Number(req.params.buvetteId);
  const { items } = req.body; // [{ productId, displayOrder }]

  if (!Array.isArray(items)) return res.status(400).send("Invalid items array");

  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.buvetteProduct.update({
          where: { buvetteId_productId: { buvetteId, productId: item.productId } },
          data: { displayOrder: item.displayOrder },
        })
      )
    );
    return res.status(200).send();
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error updating order");
  }
});

export default router;
