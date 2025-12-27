import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
    const filePath = path.join(__dirname, "../COPIE INVENTAIRE.xlsx");
    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        process.exit(1);
    }

    console.log("Reading Excel file...");
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    console.log(`Found ${sheetNames.length} sheets.`);

    // Fetch all buvettes from DB
    const buvettes = await prisma.buvette.findMany();
    console.log(`Found ${buvettes.length} buvettes in DB.`);

    for (const sheetName of sheetNames) {
        // Normalize sheet name for matching
        const normalizedSheetName = sheetName.trim().toLowerCase().replace(/\s+/g, " ");

        // Find matching buvette
        // Handle specific mapping or fuzzy matching
        let buvette = buvettes.find(b => {
            const normalizedDbName = b.name.trim().toLowerCase().replace(/\s+/g, " ");
            return normalizedDbName === normalizedSheetName ||
                (normalizedSheetName === "visiteurs" && normalizedDbName === "visiteur");
        });

        if (!buvette) {
            console.log(`Buvette "${sheetName}" not found in DB. Creating it...`);
            buvette = await prisma.buvette.create({
                data: {
                    name: sheetName.trim(),
                    locationType: "Stade", // Default
                    sport: "FOOT", // Default
                    isActive: true
                }
            });
            console.log(`  Created buvette "${buvette.name}" (ID: ${buvette.id})`);
        }

        console.log(`Processing sheet "${sheetName}" for Buvette "${buvette.name}"...`);
        const worksheet = workbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Find header row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(data.length, 50); i++) {
            const row = data[i];
            if (row && row.some((cell: any) => cell && cell.toString().includes("Article d'inventaire"))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.log(`  No header row found in sheet "${sheetName}". Skipping.`);
            continue;
        }

        let productsAdded = 0;
        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 3) continue;

            // Column mapping based on analysis:
            // Col 1 (Index 1): Category
            // Col 2 (Index 2): Product Name
            // Col 7 (Index 7): Unit

            const category = row[1];
            const productName = row[2];
            const unit = row[7];

            if (!productName || typeof productName !== 'string' || productName.trim() === "" || productName === "A REMPLIR ↓") continue;
            if (productName.includes("TOTAL")) continue;

            // Upsert Product
            const product = await prisma.product.upsert({
                where: { id: -1 }, // Hack: we can't upsert by name easily without unique constraint, but we can findFirst
                create: {
                    name: productName.trim(),
                    category: category ? category.toString().trim() : null,
                    unit: unit ? unit.toString().trim() : null,
                },
                update: {},
            }).catch(async () => {
                // Fallback if upsert fails or logic needs to be different
                let p = await prisma.product.findFirst({ where: { name: productName.trim() } });
                if (!p) {
                    p = await prisma.product.create({
                        data: {
                            name: productName.trim(),
                            category: category ? category.toString().trim() : null,
                            unit: unit ? unit.toString().trim() : null,
                        }
                    });
                }
                return p;
            });

            // Link to Buvette
            await prisma.buvetteProduct.upsert({
                where: {
                    buvetteId_productId: {
                        buvetteId: buvette.id,
                        productId: product.id,
                    }
                },
                update: {
                    displayOrder: i // Use row index as order
                },
                create: {
                    buvetteId: buvette.id,
                    productId: product.id,
                    displayOrder: i
                }
            });

            productsAdded++;
        }
        console.log(`  Added/Updated ${productsAdded} products for buvette "${buvette.name}".`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
