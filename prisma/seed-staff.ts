import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Prénoms suisses/français courants
const firstNames = [
    'Lucas', 'Emma', 'Léo', 'Chloé', 'Hugo', 'Léa', 'Gabriel', 'Manon', 'Louis', 'Zoé',
    'Nathan', 'Camille', 'Théo', 'Inès', 'Mathis', 'Jade', 'Noah', 'Lola', 'Ethan', 'Sarah',
    'Maxime', 'Clara', 'Tom', 'Alice', 'Raphaël', 'Julie', 'Enzo', 'Eva', 'Antoine', 'Marie',
    'Alexandre', 'Laura', 'Baptiste', 'Pauline', 'Quentin', 'Anaïs', 'Julien', 'Charlotte', 'Romain', 'Océane',
    'Nicolas', 'Margot', 'Valentin', 'Juliette', 'Dylan', 'Lou', 'Kevin', 'Mathilde', 'Clément', 'Elisa'
];

const lastNames = [
    'Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Schneider', 'Meyer', 'Steiner', 'Fischer',
    'Gerber', 'Brunner', 'Baumann', 'Frei', 'Zimmermann', 'Moser', 'Widmer', 'Wyss', 'Graf', 'Roth',
    'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
    'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
    'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand'
];

const staffTypes = ['EXTRA', 'CDI', 'CDD', 'STAGIAIRE'];

function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
    const prefix = ['076', '077', '078', '079'];
    const num = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `${randomElement(prefix)} ${num.slice(0, 3)} ${num.slice(3, 5)} ${num.slice(5)}`;
}

function generateContractNumber(): string {
    const year = new Date().getFullYear();
    const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PRIM-${year}-${num}`;
}

function generateHourlyRate(staffType: string): number {
    switch (staffType) {
        case 'CDI':
            return 28 + Math.random() * 10; // 28-38 CHF
        case 'CDD':
            return 25 + Math.random() * 8;  // 25-33 CHF
        case 'STAGIAIRE':
            return 15 + Math.random() * 5;  // 15-20 CHF
        case 'EXTRA':
        default:
            return 22 + Math.random() * 6;  // 22-28 CHF
    }
}

async function main() {
    console.log('🚀 Début du seeding de 50 membres du staff...\n');

    const staffToCreate = [];

    for (let i = 0; i < 50; i++) {
        const firstName = randomElement(firstNames);
        const lastName = randomElement(lastNames);
        const staffType = randomElement(staffTypes);
        const hourlyRate = Math.round(generateHourlyRate(staffType) * 100) / 100;

        staffToCreate.push({
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.ch`,
            phone: generatePhone(),
            hourlyRate,
            contractNumber: generateContractNumber(),
            staffType
        });
    }

    // Création en batch
    const result = await prisma.staffMember.createMany({
        data: staffToCreate,
        skipDuplicates: true
    });

    console.log(`✅ ${result.count} membres du staff créés avec succès!\n`);

    // Afficher quelques exemples
    const samples = await prisma.staffMember.findMany({
        take: 5,
        orderBy: { id: 'desc' }
    });

    console.log('📋 Exemples de staff créés:');
    samples.forEach(s => {
        console.log(`   - ${s.firstName} ${s.lastName} (${s.staffType}) - ${s.hourlyRate} CHF/h`);
    });

    // Compter le total
    const total = await prisma.staffMember.count();
    console.log(`\n📊 Total staff dans la base: ${total}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
