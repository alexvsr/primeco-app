
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.event.count();
        console.log(`Total events in DB: ${count}`);

        if (count > 0) {
            const events = await prisma.event.findMany({
                take: 5,
                orderBy: { date: 'desc' }
            });
            console.log('Recent events:', JSON.stringify(events, null, 2));
        }
    } catch (e) {
        console.error('Error connecting to DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
