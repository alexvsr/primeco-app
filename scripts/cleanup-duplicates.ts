import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanupDuplicates() {
    console.log('=== Cleaning up duplicate buvettes ===\n');

    // IDs of buvettes to delete (old ones with 414 products from broken import)
    const toDelete = [9, 14, 15, 16, 17, 19, 31];

    for (const id of toDelete) {
        // First, delete related BuvetteProduct entries
        const deleted = await prisma.buvetteProduct.deleteMany({
            where: { buvetteId: id }
        });
        console.log(`Deleted ${deleted.count} product links for buvette ${id}`);

        // Then delete the buvette itself
        try {
            await prisma.buvette.delete({ where: { id } });
            console.log(`Deleted buvette ${id}`);
        } catch (e: any) {
            console.log(`Could not delete buvette ${id}: ${e.message}`);
        }
    }

    console.log('\n=== Result after cleanup ===');
    const remaining = await prisma.buvette.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' }
    });

    remaining.forEach(b => {
        console.log(`${b.name.padEnd(35)} ${b._count.products} products`);
    });

    await prisma.$disconnect();
}

cleanupDuplicates();
