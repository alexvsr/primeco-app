import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roles = ["RB", "CHEF_OPS", "LOG", "ADMIN"];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const users = [
    { firstName: "Rachid", lastName: "Buvette", email: "rb@example.com", roles: ["RB"] },
    { firstName: "Claire", lastName: "Ops", email: "chef@example.com", roles: ["CHEF_OPS"] },
    { firstName: "Luca", lastName: "Log", email: "log@example.com", roles: ["LOG"] },
    { firstName: "Admin", lastName: "Système", email: "admin", roles: ["ADMIN"] },
    { firstName: "Alexandre", lastName: "Vavasseur", email: "alexvavasseur1202@gmail.com", roles: ["ADMIN"] },
  ];
  const passwordHash = await bcrypt.hash("password123", 10);
  const adminPasswordHash = await bcrypt.hash("admin", 10);
  const alexPasswordHash = await bcrypt.hash("Alexandre1609@", 10);

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash: u.email === "admin" ? adminPasswordHash :
          u.email === "alexvavasseur1202@gmail.com" ? alexPasswordHash :
            passwordHash,
      },
    });
    for (const roleName of u.roles) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (role) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: role.id } },
          update: {},
          create: { userId: user.id, roleId: role.id },
        });
      }
    }
  }

  // Seed Buvettes - FOOT
  const buvettesFoot = [
    "Nord mobile 1", "Nord 1", "Nord 2", "Nord mobile 2", "Esplanade",
    "Est mobile 1", "Est 1", "Est mobile 2", "Est mobile 3", "Est 2", "Est mobile 4",
    "Sud 1", "Sud 2",
    "Principale Mobile 1", "Principale 1", "Principale Mobile 2", "Principale Mobile 3", "Principale 2", "Principale Mobile 4",
    "Visiteur"
  ];

  for (const name of buvettesFoot) {
    await prisma.buvette.upsert({
      where: { id: buvettesFoot.indexOf(name) + 1 },
      update: {},
      create: { name, locationType: "STADIUM", sport: "FOOT" },
    });
  }

  // Seed Buvettes - HOCKEY
  const buvettesHockey = [
    "Buvette 1", "Buvette 2", "Buvette 3",
    "Food Genevois", "Food Bretzel",
    "Chalet 1", "Chalet 2", "Chalet 3",
    "Cocktail", "Home Corner", "Visiteur"
  ];

  for (const name of buvettesHockey) {
    await prisma.buvette.upsert({
      where: { id: buvettesFoot.length + buvettesHockey.indexOf(name) + 1 },
      update: {},
      create: { name, locationType: "ARENA", sport: "HOCKEY" },
    });
  }

  // Seed Products
  const products = [
    { name: "Bière Pression", unit: "L" },
    { name: "Coca 33cl", unit: "canette" },
    { name: "Hot-dog", unit: "pièce" },
    { name: "Frites", unit: "portion" },
    { name: "Eau 50cl", unit: "bouteille" },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: products.indexOf(p) + 1 },
      update: {},
      create: { name: p.name, unit: p.unit },
    });
  }

  // Seed Event
  const event = await prisma.event.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Servette FC vs FC Bâle",
      date: new Date("2026-02-12T18:00:00Z"),
      venue: "Stade de Genève",
      sport: "FOOT",
    },
  });

  // Link only FOOT Buvettes to Event
  const footBuvettes = await prisma.buvette.findMany({
    where: { sport: "FOOT" }
  });
  for (const b of footBuvettes) {
    await prisma.eventBuvette.upsert({
      where: { eventId_buvetteId: { eventId: event.id, buvetteId: b.id } },
      update: {},
      create: { eventId: event.id, buvetteId: b.id },
    });
  }

  // Seed Checklist Template
  const template = await prisma.checklistTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Ouverture Buvette",
      description: "Checklist standard pour l'ouverture",
      items: {
        create: [
          { label: "Point d'eau (eau chaude/froide, savon)", orderIndex: 1 },
          { label: "Lavages mains (affichage, gel)", orderIndex: 2 },
          { label: "Températures frigos (< 4°C)", orderIndex: 3 },
          { label: "Allergènes affichés", orderIndex: 4 },
          { label: "Caisses / TPE fonctionnels", orderIndex: 5 },
          { label: "Stocks critiques vérifiés", orderIndex: 6 },
        ],
      },
    },
  });

  // Seed Staff
  const staffMembers = [
    { firstName: "Jean", lastName: "Dupont", email: "jean.dupont@email.com" },
    { firstName: "Marie", lastName: "Curie", email: "marie.curie@email.com" },
    { firstName: "Paul", lastName: "Martin", email: "paul.martin@email.com" },
    { firstName: "Sophie", lastName: "Bernard", email: "sophie.bernard@email.com" },
  ];
  for (const s of staffMembers) {
    await prisma.staffMember.upsert({
      where: { id: staffMembers.indexOf(s) + 1 },
      update: {},
      create: { firstName: s.firstName, lastName: s.lastName, email: s.email, staffType: "EXTRA" },
    });
  }

  // Seed Staff Assignments (assign staff to buvettes for the event)
  // Tribune Nord: Jean + Marie
  await prisma.staffAssignment.upsert({
    where: { eventId_buvetteId_staffId: { eventId: 1, buvetteId: 1, staffId: 1 } },
    update: {},
    create: { eventId: 1, buvetteId: 1, staffId: 1 },
  });
  await prisma.staffAssignment.upsert({
    where: { eventId_buvetteId_staffId: { eventId: 1, buvetteId: 1, staffId: 2 } },
    update: {},
    create: { eventId: 1, buvetteId: 1, staffId: 2 },
  });

  // Tribune Sud: Paul + Sophie
  await prisma.staffAssignment.upsert({
    where: { eventId_buvetteId_staffId: { eventId: 1, buvetteId: 2, staffId: 3 } },
    update: {},
    create: { eventId: 1, buvetteId: 2, staffId: 3 },
  });
  await prisma.staffAssignment.upsert({
    where: { eventId_buvetteId_staffId: { eventId: 1, buvetteId: 2, staffId: 4 } },
    update: {},
    create: { eventId: 1, buvetteId: 2, staffId: 4 },
  });

  console.log("Seeding completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
