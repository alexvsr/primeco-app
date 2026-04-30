
import { prisma } from './src/config/prisma';

async function check() {
    try {
        console.log("--- Buvettes List ---");
        const buvettes = await prisma.buvette.findMany();
        buvettes.forEach(b => console.log(`[${b.id}] ${b.name} (${b.locationType})`));

        console.log("\n--- Checking Buvette ID 22 ---");
        const b22 = await prisma.buvette.findUnique({ where: { id: 22 } });
        if (!b22) {
            console.log("❌ Buvette 22 does not exist!");
        } else {
            console.log(`✅ Found Buvette 22: ${b22.name}`);
            const products = await prisma.buvetteProduct.findMany({
                where: { buvetteId: 22 },
                include: { product: true }
            });
            console.log(`Found ${products.length} assigned products.`);
            products.forEach(p => {
                console.log(`- ${p.product.name}: DefaultStock=${p.defaultStock}`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
