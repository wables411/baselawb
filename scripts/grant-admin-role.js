import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x13c33121f8a73e22ac6aa4a135132f5ac7f221b2';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// ABI for granting roles
const CONTRACT_ABI = [
  'function grantRole(bytes32 role, address account)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function owner() view returns (address)',
];

async function grantAdminRole() {
  const privateKey = process.env.PRIVATE_KEY;
  const targetAddress = process.env.TARGET_ADDRESS; // Address to grant role to
  
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found in .env');
    process.exit(1);
  }
  
  if (!targetAddress) {
    console.error('❌ TARGET_ADDRESS not found in .env');
    console.error('   Add TARGET_ADDRESS=<address-to-grant-role-to>');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  console.log('🔐 Granting Admin Role\n');
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`From: ${wallet.address}`);
  console.log(`To: ${targetAddress}\n`);

  // Check if caller is owner
  try {
    const owner = await contract.owner();
    if (wallet.address.toLowerCase() !== owner.toLowerCase()) {
      console.error('❌ Wallet is not the contract owner');
      console.error(`   Owner: ${owner}`);
      process.exit(1);
    }
    console.log('✅ Wallet is contract owner\n');
  } catch (error) {
    console.error('❌ Error checking ownership:', error.message);
    process.exit(1);
  }

  // Get admin role
  try {
    const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
    console.log(`Admin Role Hash: ${DEFAULT_ADMIN_ROLE}\n`);

    // Check if already has role
    const hasRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, targetAddress);
    if (hasRole) {
      console.log('✅ Address already has admin role');
      return;
    }

    // Grant role
    console.log('📤 Granting admin role...');
    const tx = await contract.grantRole(DEFAULT_ADMIN_ROLE, targetAddress);
    console.log(`   Transaction hash: ${tx.hash}`);
    console.log('   Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`\n✅ Admin role granted!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

  } catch (error) {
    console.error('\n❌ Error granting role:', error.message);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    process.exit(1);
  }
}

grantAdminRole();



