import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanDuplicates() {
    // Find duplicate buvettes (case-insensitive matching)
    const buvettes = await prisma.buvette.findMany({
        include: { _count: { select: { products: true } } }
    });

    console.log('=== Looking for duplicates ===');

    // Group by lowercase name
    const groups = new Map<string, typeof buvettes>();
    buvettes.forEach(b => {
        const key = b.name.toLowerCase().trim();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(b);
    });

    // Show duplicates
    for (const [key, list] of groups) {
        if (list.length > 1) {
            console.log('Duplicate:', key);
            list.forEach(b => console.log('  -', b.id, b.name, 'products:', b._count.products));
        }
    }

    // Find buvettes with 414 products (old all-products link)
    console.log('\n=== Buvettes with 414 products (needs cleanup) ===');
    buvettes.filter(b => b._count.products === 414).forEach(b => {
        console.log('-', b.id, b.name);
    });

    await prisma.$disconnect();
}
cleanDuplicates();
