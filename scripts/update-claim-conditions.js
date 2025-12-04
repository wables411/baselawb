import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import { generateMerkleTree } from './generate-merkle-tree.js';

dotenv.config();

// Contract address
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x13c33121f8a73e22ac6aa4a135132f5ac7f221b2';

// Full ABI for setClaimConditions
const CONTRACT_ABI = [
  'function setClaimConditions(tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata)[] _conditions, bool _resetClaimEligibility)',
  'function getActiveClaimConditionId() view returns (uint256)',
  'function getClaimConditionById(uint256 _conditionId) view returns (tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata))',
  'function owner() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function maxTotalSupply() view returns (uint256)',
  'function totalMinted() view returns (uint256)',
];

// Zero address for ETH
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Create claim condition structure
 */
function createClaimCondition({
  startTimestamp,
  maxClaimableSupply,
  quantityLimitPerWallet,
  merkleRoot,
  pricePerToken,
  currency = ZERO_ADDRESS,
  metadata = ''
}) {
  return {
    startTimestamp: BigInt(startTimestamp),
    maxClaimableSupply: BigInt(maxClaimableSupply),
    supplyClaimed: 0n, // Will be set by contract
    quantityLimitPerWallet: BigInt(quantityLimitPerWallet),
    merkleRoot: merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000',
    pricePerToken: ethers.parseEther(pricePerToken.toString()),
    currency: currency || ZERO_ADDRESS,
    metadata: metadata || ''
  };
}

/**
 * Main function to update claim conditions
 */
async function updateClaimConditions() {
  console.log('🔧 Updating Claim Conditions on Base NFT Contract\n');
  console.log(`Contract: ${CONTRACT_ADDRESS}\n`);
  
  // Check environment variables
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found in .env file');
    console.error('   Please add PRIVATE_KEY=<your-private-key> to .env');
    process.exit(1);
  }
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
  
  console.log(`📝 Wallet: ${wallet.address}`);
  
  // Check permissions
  try {
    const owner = await contract.owner();
    const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
    const isOwner = owner.toLowerCase() === wallet.address.toLowerCase();
    
    if (!isOwner && !hasAdminRole) {
      console.error('❌ Wallet does not have permission to update claim conditions');
      console.error(`   Owner: ${owner}`);
      console.error(`   Has Admin Role: ${hasAdminRole}`);
      process.exit(1);
    }
    
    console.log(`✅ Permissions verified (Owner: ${isOwner}, Admin: ${hasAdminRole})\n`);
  } catch (error) {
    console.error('❌ Error checking permissions:', error.message);
    process.exit(1);
  }
  
  // Get current contract state
  let maxSupply;
  try {
    maxSupply = await contract.maxTotalSupply();
    const totalMinted = await contract.totalMinted();
    console.log(`📊 Contract State:`);
    console.log(`   Max Supply: ${maxSupply.toString()}`);
    console.log(`   Total Minted: ${totalMinted.toString()}`);
    console.log(`   Remaining: ${(maxSupply - totalMinted).toString()}\n`);
    
    if (maxSupply === 0n) {
      const fallback = BigInt(process.env.DEFAULT_MAX_SUPPLY || 10000);
      console.warn(`⚠️  Contract reports maxTotalSupply=0 (unlimited). Using fallback max supply ${fallback.toString()}.`);
      maxSupply = fallback;
    } else if (maxSupply <= totalMinted) {
      const fallback = totalMinted + BigInt(process.env.DEFAULT_BUFFER || 1000);
      console.warn(`⚠️  Max supply (${maxSupply.toString()}) <= total minted (${totalMinted.toString()}). Using fallback ${fallback.toString()}.`);
      maxSupply = fallback;
    }
    
  } catch (error) {
    console.warn(`⚠️  Could not fetch max supply, using default`);
    maxSupply = BigInt(process.env.DEFAULT_MAX_SUPPLY || 10000);
  }
  
  // Generate merkle tree for snapshot (public + discounted)
  console.log('🌳 Generating snapshot merkle tree...\n');
  
  const snapshotPath = process.env.SNAPSHOT_PATH || 'snapshots/public-discounted.csv';
  let snapshotRoot = '0x0000000000000000000000000000000000000000000000000000000000000000';
  let snapshotCount = 0;
  
  if (fs.existsSync(snapshotPath)) {
    try {
      const merkleData = generateMerkleTree(snapshotPath);
      snapshotRoot = merkleData.root;
      snapshotCount = merkleData.entries.length;
      console.log(`✅ Snapshot merkle root: ${snapshotRoot} (${snapshotCount} addresses)\n`);
    } catch (error) {
      console.error(`❌ Error generating snapshot merkle tree:`, error.message);
      process.exit(1);
    }
  } else {
    console.warn(`⚠️  Snapshot file not found: ${snapshotPath}\n`);
  }
  
  // Create single claim condition (public price, discounted overrides)
  const now = Math.floor(Date.now() / 1000);
  const startTime = now; // Start immediately
  
  const conditions = [
    // Free mint for everyone: 0 ETH, max 3 per wallet
    createClaimCondition({
      startTimestamp: startTime,
      maxClaimableSupply: maxSupply.toString(),
      quantityLimitPerWallet: 3, // Max 3 NFTs per wallet
      merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000', // No allowlist needed
      pricePerToken: '0', // Free mint
      currency: ZERO_ADDRESS, // ETH
      metadata: 'Free Mint - 3 per wallet'
    })
  ];
  
  console.log('📋 Claim Conditions to Set:');
  conditions.forEach((condition, index) => {
    console.log(`\n   ${index + 1}. Condition ${index + 1}:`);
    console.log(`      Price: ${ethers.formatEther(condition.pricePerToken)} ETH`);
    console.log(`      Quantity Limit: ${condition.quantityLimitPerWallet.toString() === '0' ? 'No limit' : condition.quantityLimitPerWallet.toString()}`);
    console.log(`      Merkle Root: ${condition.merkleRoot === ZERO_ADDRESS ? 'None (Public)' : condition.merkleRoot}`);
    console.log(`      Max Claimable: ${condition.maxClaimableSupply.toString()}`);
  });
  
  // Ask for confirmation (in production, you might want to add a prompt)
  console.log('\n⚠️  About to update claim conditions on contract...');
  console.log('   This will replace all existing claim conditions!');
  
  // Set claim conditions
  try {
    console.log('\n📤 Sending transaction...');
    const resetClaimEligibility = false; // Don't reset existing claims
    
    const tx = await contract.setClaimConditions(conditions, resetClaimEligibility);
    console.log(`   Transaction hash: ${tx.hash}`);
    console.log('   Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`\n✅ Transaction confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    // Verify the update
    console.log('\n🔍 Verifying claim conditions...');
    const activeConditionId = await contract.getActiveClaimConditionId();
    console.log(`   Active Condition ID: ${activeConditionId.toString()}`);
    
    // Check each condition
    for (let i = 0; i < conditions.length; i++) {
      const condition = await contract.getClaimConditionById(BigInt(i));
      console.log(`\n   Condition ${i}:`);
      console.log(`      Price: ${ethers.formatEther(condition.pricePerToken)} ETH`);
      console.log(`      Merkle Root: ${condition.merkleRoot}`);
    }
    
    console.log('\n✅ Claim conditions updated successfully!');
    
  } catch (error) {
    console.error('\n❌ Error updating claim conditions:', error);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateClaimConditions().catch(console.error);
}

export { updateClaimConditions, createClaimCondition };

