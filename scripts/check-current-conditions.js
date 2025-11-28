import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x13c33121f8a73e22ac6aa4a135132f5ac7f221b2';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// ABI for reading claim conditions
const CONTRACT_ABI = [
  'function getActiveClaimConditionId() view returns (uint256)',
  'function getClaimConditionById(uint256 _conditionId) view returns (tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata))',
  'function owner() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function setClaimConditions(tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata)[] _conditions, bool _resetClaimEligibility)',
];

async function checkCurrentConditions() {
  console.log('🔍 Checking Current Claim Conditions\n');
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`RPC: ${BASE_RPC_URL}\n`);

  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  try {
    // Get active condition ID
    const activeConditionId = await contract.getActiveClaimConditionId();
    console.log(`✅ Active Condition ID: ${activeConditionId.toString()}\n`);

    // Get the active condition details
    const condition = await contract.getClaimConditionById(activeConditionId);
    
    console.log('📋 Current Active Condition:');
    console.log(`   Price: ${ethers.formatEther(condition.pricePerToken)} ETH`);
    console.log(`   Quantity Limit Per Wallet: ${condition.quantityLimitPerWallet.toString() === '0' ? 'No limit' : condition.quantityLimitPerWallet.toString()}`);
    console.log(`   Max Claimable Supply: ${condition.maxClaimableSupply.toString()}`);
    console.log(`   Supply Claimed: ${condition.supplyClaimed.toString()}`);
    console.log(`   Merkle Root: ${condition.merkleRoot}`);
    console.log(`   Has Allowlist: ${condition.merkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'Yes' : 'No'}`);
    console.log(`   Currency: ${condition.currency}`);
    console.log(`   Start Timestamp: ${new Date(Number(condition.startTimestamp) * 1000).toISOString()}`);
    console.log(`   Metadata: ${condition.metadata || '(empty)'}\n`);

    // Check all conditions (try 0-5)
    console.log('📋 All Claim Conditions:');
    for (let i = 0; i < 5; i++) {
      try {
        const cond = await contract.getClaimConditionById(BigInt(i));
        console.log(`\n   Condition ${i}:`);
        console.log(`      Price: ${ethers.formatEther(cond.pricePerToken)} ETH`);
        console.log(`      Quantity Limit: ${cond.quantityLimitPerWallet.toString() === '0' ? 'No limit' : cond.quantityLimitPerWallet.toString()}`);
        console.log(`      Merkle Root: ${cond.merkleRoot}`);
        console.log(`      Active: ${i === Number(activeConditionId) ? 'YES' : 'No'}`);
      } catch (error) {
        // Condition doesn't exist
        break;
      }
    }

    // Check permissions
    console.log('\n🔐 Checking Permissions:');
    const owner = await contract.owner();
    console.log(`   Contract Owner: ${owner}`);

    // Check if we have a private key to test with
    if (process.env.PRIVATE_KEY) {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      console.log(`   Your Wallet: ${wallet.address}`);
      console.log(`   Can Update: ${wallet.address.toLowerCase() === owner.toLowerCase() ? '✅ YES (Owner)' : '❌ NO (Not Owner)'}`);

      // Check for admin role
      try {
        const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
        const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
        console.log(`   Has Admin Role: ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
        if (hasAdminRole) {
          console.log(`   Can Update: ✅ YES (Admin Role)`);
        }
      } catch (error) {
        console.log(`   Could not check admin role: ${error.message}`);
      }
    } else {
      console.log('   ⚠️  No PRIVATE_KEY in .env - cannot check update permissions');
    }

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('\n❌ Error checking conditions:', error.message);
    if (error.data) {
      console.error('   Error data:', error.data);
    }
  }
}

checkCurrentConditions();

