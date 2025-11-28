import { MerkleTree } from 'merkletreejs';
import { keccak256, solidityPackedKeccak256 } from 'ethers';
import fs from 'fs';
import path from 'path';

/**
 * Generate merkle tree from allowlist file
 * Format: CSV with address,maxClaimable
 */
function generateMerkleTree(filePath) {
  console.log(`\n📋 Reading allowlist from: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const [address, maxClaimable] = line.split(',').map(s => s.trim());
    if (!address || !address.startsWith('0x')) {
      console.warn(`⚠️  Skipping invalid line: ${line}`);
      continue;
    }
    
    const quantity = maxClaimable ? parseInt(maxClaimable, 10) : 1;
    if (isNaN(quantity) || quantity <= 0) {
      console.warn(`⚠️  Invalid quantity for ${address}, defaulting to 1`);
      entries.push({ address: address.toLowerCase(), quantity: 1 });
    } else {
      entries.push({ address: address.toLowerCase(), quantity });
    }
  }
  
  console.log(`✅ Loaded ${entries.length} addresses`);
  
  // Generate leaves: keccak256(abi.encodePacked(address, quantity))
  // Thirdweb uses this format for allowlist proofs
  const leaves = entries.map(entry => {
    // Use solidityPackedKeccak256 to match Solidity's keccak256(abi.encodePacked(...))
    const hash = solidityPackedKeccak256(
      ['address', 'uint256'],
      [entry.address, entry.quantity]
    );
    return Buffer.from(hash.slice(2), 'hex');
  });
  
  // Create merkle tree
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = '0x' + tree.getRoot().toString('hex');
  
  console.log(`✅ Generated merkle tree`);
  console.log(`   Root: ${root}`);
  console.log(`   Leaves: ${leaves.length}`);
  
  // Generate proofs for each address
  const proofs = {};
  entries.forEach((entry, index) => {
    const leaf = leaves[index];
    const proof = tree.getHexProof(leaf);
    proofs[entry.address] = {
      address: entry.address,
      quantity: entry.quantity,
      proof: proof,
      leaf: '0x' + leaf.toString('hex')
    };
  });
  
  return {
    root,
    tree,
    entries,
    proofs
  };
}

/**
 * Save merkle tree data to JSON file
 */
function saveMerkleData(outputPath, merkleData, listName) {
  const output = {
    listName,
    merkleRoot: merkleData.root,
    totalAddresses: merkleData.entries.length,
    generatedAt: new Date().toISOString(),
    entries: merkleData.entries.map(e => ({
      address: e.address,
      quantity: e.quantity
    })),
    // Only save proofs for first 10 addresses to keep file size manageable
    // Full proofs can be generated on-demand
    sampleProofs: Object.values(merkleData.proofs).slice(0, 10).reduce((acc, p) => {
      acc[p.address] = {
        quantity: p.quantity,
        proof: p.proof
      };
      return acc;
    }, {})
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`💾 Saved merkle data to: ${outputPath}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node generate-merkle-tree.js <allowlist-file> [output-file]');
    console.error('Example: node generate-merkle-tree.js ../FandFFree.txt ./merkle-fandf-free.json');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace(/\.(txt|csv)$/, '-merkle.json');
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }
  
  try {
    const listName = path.basename(inputFile, path.extname(inputFile));
    const merkleData = generateMerkleTree(inputFile);
    saveMerkleData(outputFile, merkleData, listName);
    
    console.log(`\n✅ Merkle tree generation complete!`);
    console.log(`   Root: ${merkleData.root}`);
    console.log(`   Use this root in setClaimConditions()`);
    
  } catch (error) {
    console.error('❌ Error generating merkle tree:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { generateMerkleTree, saveMerkleData };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

