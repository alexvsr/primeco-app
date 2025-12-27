
import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'COPIE INVENTAIRE.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const targetSheet = "Stock Principal";

    if (workbook.SheetNames.includes(targetSheet)) {
        console.log(`\n--- Detailed Analysis: ${targetSheet} ---`);
        const sheet = workbook.Sheets[targetSheet];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Log rows 5 to 50
        data.slice(5, 50).forEach((row, index) => {
            console.log(`Row ${index + 5}:`, row);
        });
    } else {
        console.log(`Sheet '${targetSheet}' not found`);
        console.log("Available sheets:", workbook.SheetNames);
    }

} catch (err) {
    console.error("Error reading file:", err);
}
