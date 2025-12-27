
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const buvetteName = "Home Corner";
        const buvette = await prisma.buvette.findFirst({
            where: { name: buvetteName },
            include: {
                products: {
                    include: { product: true }
                }
            }
        });

        if (!buvette) {
            console.log(`Buvette ${buvetteName} not found`);
            return;
        }

        console.log(`Buvette: ${buvette.name}`);
        console.log(`Product count: ${buvette.products.length}`);

        console.log("--- First 20 products ---");
        buvette.products.slice(0, 20).forEach(bp => {
            console.log(`[${bp.product.category}] ${bp.product.name} (Unit: ${bp.product.unit})`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
