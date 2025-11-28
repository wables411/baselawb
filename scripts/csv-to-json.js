import fs from 'fs';
import path from 'path';

/**
 * Convert CSV allowlist to JSON format for frontend
 */
function csvToJson(csvPath, jsonPath) {
  console.log(`\n📋 Converting CSV to JSON`);
  console.log(`   Input: ${csvPath}`);
  console.log(`   Output: ${jsonPath}\n`);

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must include a header and at least one row');
  }

  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  const dataLines = lines.slice(1);

  const addressIdx = headers.indexOf('address');
  const maxIdx = headers.indexOf('maxclaimable');
  const priceIdx = headers.indexOf('price');
  const currencyIdx = headers.indexOf('currencyaddress');

  if (addressIdx === -1) {
    throw new Error('CSV file must include an address column');
  }

  const entries = [];
  for (const rawLine of dataLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = line.split(',').map(s => s.trim());
    const address = (cols[addressIdx] || '').toLowerCase();
    
    if (!address || !address.startsWith('0x')) {
      console.warn(`⚠️  Skipping invalid line: ${line}`);
      continue;
    }

    const maxClaimable = maxIdx !== -1 ? parseInt(cols[maxIdx] || '15', 10) : 15;
    const price = priceIdx !== -1 ? (cols[priceIdx] || '0.002') : '0.002';
    const currencyAddress = (currencyIdx !== -1 ? cols[currencyIdx] : '0x0000000000000000000000000000000000000000') || '0x0000000000000000000000000000000000000000';

    entries.push({
      address,
      maxClaimable: isNaN(maxClaimable) ? 15 : maxClaimable,
      price,
      currencyAddress: currencyAddress.toLowerCase(),
    });
  }

  console.log(`✅ Converted ${entries.length} entries`);

  // Write JSON file
  const jsonContent = JSON.stringify(entries, null, 2);
  fs.writeFileSync(jsonPath, jsonContent);
  console.log(`💾 Saved to: ${jsonPath}\n`);

  return entries;
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: node csv-to-json.js <csv-file> [json-output-file]');
  console.error('Example: node csv-to-json.js ../FandFDinscount.csv ../miniapp/app/lib/discountedAllowlist.json');
  process.exit(1);
}

const csvFile = args[0];
const jsonFile = args[1] || csvFile.replace(/\.csv$/, '.json');

if (!fs.existsSync(csvFile)) {
  console.error(`❌ CSV file not found: ${csvFile}`);
  process.exit(1);
}

try {
  csvToJson(csvFile, jsonFile);
  console.log('✅ Conversion complete!');
} catch (error) {
  console.error('❌ Error converting CSV to JSON:', error.message);
  process.exit(1);
}

