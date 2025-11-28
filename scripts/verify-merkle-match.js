import { MerkleTree } from 'merkletreejs';
import { keccak256, solidityPackedKeccak256, parseEther } from 'ethers';
import { encodePacked, keccak256 as viemKeccak256, parseEther as viemParseEther } from 'viem';
import fs from 'fs';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Read the CSV
const csvPath = 'FandFDinscount.csv';
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n').filter(line => line.trim());
const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
const dataLines = lines.slice(1);

const addressIdx = headers.indexOf('address');
const maxIdx = headers.indexOf('maxclaimable');
const priceIdx = headers.indexOf('price');
const currencyIdx = headers.indexOf('currencyaddress');

const entries = [];
for (const rawLine of dataLines) {
  const line = rawLine.trim();
  if (!line) continue;
  
  const cols = line.split(',').map(s => s.trim());
  const address = (cols[addressIdx] || '').toLowerCase();
  if (!address || !address.startsWith('0x')) continue;
  
  const maxClaimable = maxIdx !== -1 ? parseInt(cols[maxIdx] || '15', 10) : 15;
  const price = priceIdx !== -1 ? (cols[priceIdx] || '0.002') : '0.002';
  const currencyAddress = (currencyIdx !== -1 ? cols[currencyIdx] : ZERO_ADDRESS) || ZERO_ADDRESS;
  
  entries.push({
    address: address.toLowerCase(),
    maxClaimable,
    price,
    currencyAddress: currencyAddress.toLowerCase(),
  });
}

console.log(`\n📋 Testing merkle tree generation with ${entries.length} entries\n`);

// Test with ethers (backend method)
console.log('🔧 Testing with ethers (solidityPackedKeccak256):');
const ethersLeaves = entries.map(entry => {
  const hash = solidityPackedKeccak256(
    ['address', 'uint256', 'uint256', 'address'],
    [
      entry.address,
      BigInt(entry.maxClaimable),
      parseEther(entry.price),
      entry.currencyAddress
    ]
  );
  return Buffer.from(hash.slice(2), 'hex');
});
const ethersTree = new MerkleTree(ethersLeaves, keccak256, { sortPairs: true });
const ethersRoot = '0x' + ethersTree.getRoot().toString('hex');
console.log(`   Root: ${ethersRoot}`);

// Test with viem (frontend method)
console.log('\n🔧 Testing with viem (encodePacked + keccak256):');
const viemLeaves = entries.map(entry => {
  const packed = encodePacked(
    ['address', 'uint256', 'uint256', 'address'],
    [
      entry.address.toLowerCase(),
      BigInt(entry.maxClaimable),
      viemParseEther(entry.price),
      entry.currencyAddress.toLowerCase(),
    ]
  );
  const hash = viemKeccak256(packed);
  return Buffer.from(hash.slice(2), 'hex');
});
const viemTree = new MerkleTree(viemLeaves, viemKeccak256, { sortPairs: true });
const viemRoot = '0x' + viemTree.getRoot().toString('hex');
console.log(`   Root: ${viemRoot}`);

// Compare
console.log('\n📊 Comparison:');
console.log(`   Match: ${ethersRoot === viemRoot ? '✅ YES' : '❌ NO'}`);
if (ethersRoot !== viemRoot) {
  console.log(`   ⚠️  ROOTS DON'T MATCH!`);
  console.log(`   This is why transactions are failing.`);
  
  // Test a specific entry
  const testEntry = entries[0];
  console.log(`\n🔍 Testing first entry: ${testEntry.address}`);
  
  const ethersLeaf = ethersLeaves[0];
  const viemLeaf = viemLeaves[0];
  console.log(`   Ethers leaf: 0x${ethersLeaf.toString('hex')}`);
  console.log(`   Viem leaf:    0x${viemLeaf.toString('hex')}`);
  console.log(`   Leaves match: ${ethersLeaf.equals(viemLeaf) ? '✅ YES' : '❌ NO'}`);
} else {
  console.log(`   ✅ Both methods produce the same merkle root!`);
}

