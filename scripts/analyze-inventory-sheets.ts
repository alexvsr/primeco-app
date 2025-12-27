import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'COPIE INVENTAIRE.xlsx');
const workbook = XLSX.readFile(filePath);

// Analyze a few buvettes
const sheetsToCheck = ['Nord 1', 'Home Corner', 'Buvette 1'];

sheetsToCheck.forEach(sheetName => {
    if (!workbook.SheetNames.includes(sheetName)) {
        console.log(`Sheet ${sheetName} not found`);
        return;
    }
    console.log(`\n=== Sheet: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Show first 30 rows to understand structure
    data.slice(0, 30).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });
});
