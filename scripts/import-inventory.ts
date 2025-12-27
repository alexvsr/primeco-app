
import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const filePath = path.join(process.cwd(), 'COPIE INVENTAIRE.xlsx');

// Sheets to ignore
const IGNORED_SHEETS = ['END', 'Recalculs', 'Total', 'Resume'];

async function main() {
    try {
        console.log("Starting inventory import with value filtering...");
        const workbook = XLSX.readFile(filePath);

        for (const sheetName of workbook.SheetNames) {
            if (IGNORED_SHEETS.some(s => sheetName.includes(s))) {
                console.log(`Skipping sheet: ${sheetName}`);
                continue;
            }

            console.log(`Processing Buvette: ${sheetName}`);

            // Ensure Buvette exists
            let buvette = await prisma.buvette.findFirst({
                where: { name: sheetName }
            });

            if (!buvette) {
                buvette = await prisma.buvette.create({
                    data: {
                        name: sheetName,
                        locationType: 'Stade' // Default value
                    }
                });
            }

            // Clear existing links to ensure we don't keep products that should be removed
            await prisma.buvetteProduct.deleteMany({
                where: { buvetteId: buvette.id }
            });

            const sheet = workbook.Sheets[sheetName];
            const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            let currentCategory = "Divers";
            let displayOrder = 0;
            let importedCount = 0;

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                // Excel index mapping based on analysis:
                // Col B (1): Category
                // Col C (2): Product Name

                // Safety check for row length
                if (!row || row.length < 3) continue;

                const colB = row[1]?.toString().trim(); // Category ?
                const colC = row[2]?.toString().trim(); // Product Name

                // Skip total lines
                if (colC && (colC.includes('TOTAL') || colC.includes('Total'))) continue;
                if (colB && (colB.includes('TOTAL') || colB.includes('Total'))) continue;

                // Identify Category
                if (colB) {
                    if (!colC) {
                        currentCategory = colB.replace('Catégorie :', '').trim();
                        continue;
                    } else {
                        const possibleCat = colB.replace('Catégorie :', '').trim();
                        if (possibleCat.length > 2) currentCategory = possibleCat;
                    }
                }

                if (!colC) continue; // No product name, skip

                // --- VALUE FILTER ---
                // Only check STOCK columns to determine if product is present in this buvette.
                // Stade sheets: Index 4 = "STOCKS FIN DE SERVICE"
                // Patinoire sheets: Index 4 = "STOCKS FIN DE SERVICE", Index 7 = "STOCKS"
                // Do NOT check PRIX column (always non-zero) or MIN. REQUIS

                const stockCol4 = row[4]; // STOCKS FIN DE SERVICE
                const stockCol7 = row[7]; // STOCKS (Patinoire sheets only)

                const hasStock =
                    (typeof stockCol4 === 'number' && stockCol4 > 0.001) ||
                    (typeof stockCol7 === 'number' && stockCol7 > 0.001);

                // Detect unit - scan for unit values in typical positions
                let unit = "PCE";
                for (let j = 7; j < Math.min(row.length, 10); j++) {
                    const strCell = row[j]?.toString().trim().toUpperCase();
                    if (['EA', 'PCE', 'L', 'KG', 'BTL', 'BT', 'FUT'].includes(strCell)) {
                        unit = strCell;
                        break;
                    }
                }

                // If no stock found, this product is not active for this buvette
                if (!hasStock) {
                    continue;
                }

                // Upsert Product logic
                let dbProduct = await prisma.product.findFirst({
                    where: { name: colC }
                });

                if (dbProduct) {
                    // Update category if missing or generic
                    if (!dbProduct.category || dbProduct.category === 'Divers') {
                        await prisma.product.update({
                            where: { id: dbProduct.id },
                            data: { category: currentCategory, unit }
                        });
                    }
                } else {
                    dbProduct = await prisma.product.create({
                        data: {
                            name: colC,
                            category: currentCategory,
                            unit,
                            isActive: true
                        }
                    });
                }

                // Link to Buvette (upsert to avoid duplicates if same product listed twice)
                await prisma.buvetteProduct.upsert({
                    where: {
                        buvetteId_productId: {
                            buvetteId: buvette.id,
                            productId: dbProduct.id
                        }
                    },
                    update: { displayOrder: ++displayOrder },
                    create: {
                        buvetteId: buvette.id,
                        productId: dbProduct.id,
                        displayOrder: ++displayOrder
                    }
                });
                importedCount++;
            }
            console.log(`-> Imported ${importedCount} products for ${sheetName}`);
        }

        console.log("Import completed!");

    } catch (err) {
        console.error("Error during import:", err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
