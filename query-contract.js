import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Contract address
const CONTRACT_ADDRESS = '0x13c33121f8a73e22ac6aa4a135132f5ac7f221b2';

// Minimal ABI - only the functions we need
const CONTRACT_ABI = [
  // View functions
  'function totalMinted() view returns (uint256)',
  'function maxTotalSupply() view returns (uint256)',
  'function nextTokenIdToMint() view returns (uint256)',
  'function claimCondition(uint256 _conditionId) view returns (tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata))',
  'function activeClaimConditionId() view returns (uint256)',
  'function getActiveClaimConditionId() view returns (uint256)',
  'function owner() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  
  // Standard ERC721
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

// Zero address for mint detection
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function main() {
  console.log('🔍 Querying Base NFT Contract Analytics\n');
  console.log(`Contract: ${CONTRACT_ADDRESS}\n`);
  
  // Setup provider
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Create contract instance
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  const results = {
    contractAddress: CONTRACT_ADDRESS,
    timestamp: new Date().toISOString(),
  };
  
  try {
    // 1. Query minting stats
    console.log('📊 Querying minting statistics...');
    const totalMinted = await contract.totalMinted();
    const totalSupply = await contract.totalSupply();
    
    let maxTotalSupply;
    try {
      maxTotalSupply = await contract.maxTotalSupply();
      if (Number(maxTotalSupply) === 0) {
        // If it returns 0, it might not be set or accessible, use known value from BaseScan
        console.log('   ⚠️  maxTotalSupply() returned 0, using known value from BaseScan...');
        maxTotalSupply = 32n; // Known from BaseScan
      }
    } catch (error) {
      // If maxTotalSupply() doesn't exist or reverts, use known value from BaseScan
      console.log('   ⚠️  maxTotalSupply() not accessible, using known value from BaseScan (32)...');
      maxTotalSupply = 32n; // Known from BaseScan
    }
    
    const minted = Number(totalMinted);
    const maxSupply = Number(maxTotalSupply);
    const remaining = Math.max(0, maxSupply - minted);
    
    results.mintingStats = {
      totalMinted: minted,
      maxTotalSupply: maxSupply,
      remaining: remaining,
      totalSupply: Number(totalSupply),
    };
    
    console.log(`✅ Total Minted: ${minted}`);
    console.log(`✅ Max Supply: ${maxSupply}`);
    console.log(`✅ Remaining: ${remaining}`);
    console.log(`✅ Current Total Supply: ${Number(totalSupply)}\n`);
    
    // 2. Query unique wallets that have minted
    console.log('👛 Querying unique wallets that have minted...');
    const uniqueWallets = await getUniqueMintingWallets(provider, CONTRACT_ADDRESS);
    results.uniqueWallets = {
      count: uniqueWallets.size,
      wallets: Array.from(uniqueWallets),
    };
    
    console.log(`✅ Unique wallets that have minted: ${uniqueWallets.size}\n`);
    
    // 3. Query active allowlist/claim condition
    console.log('📋 Querying active allowlist/claim condition...');
    try {
      let activeConditionId;
      try {
        activeConditionId = await contract.activeClaimConditionId();
      } catch (error) {
        // If activeClaimConditionId doesn't exist, try condition 0
        console.log('   ⚠️  activeClaimConditionId() not accessible, trying condition 0...');
        activeConditionId = 0n;
      }
      
      const condition = await contract.claimCondition(activeConditionId);
      
      const conditionData = {
        conditionId: Number(activeConditionId),
        startTimestamp: Number(condition.startTimestamp),
        startDate: new Date(Number(condition.startTimestamp) * 1000).toISOString(),
        maxClaimableSupply: Number(condition.maxClaimableSupply),
        supplyClaimed: Number(condition.supplyClaimed),
        quantityLimitPerWallet: Number(condition.quantityLimitPerWallet),
        merkleRoot: condition.merkleRoot,
        pricePerToken: ethers.formatEther(condition.pricePerToken),
        currency: condition.currency,
        metadata: condition.metadata,
        hasAllowlist: condition.merkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
      
      results.allowlist = conditionData;
      
      console.log(`✅ Active Condition ID: ${conditionData.conditionId}`);
      console.log(`✅ Start Timestamp: ${conditionData.startDate}`);
      console.log(`✅ Max Claimable: ${conditionData.maxClaimableSupply}`);
      console.log(`✅ Supply Claimed: ${conditionData.supplyClaimed}`);
      console.log(`✅ Quantity Limit Per Wallet: ${conditionData.quantityLimitPerWallet}`);
      console.log(`✅ Price Per Token: ${conditionData.pricePerToken} ETH`);
      console.log(`✅ Currency: ${conditionData.currency}`);
      console.log(`✅ Has Allowlist: ${conditionData.hasAllowlist ? 'Yes' : 'No'}`);
      if (conditionData.hasAllowlist) {
        console.log(`✅ Merkle Root: ${conditionData.merkleRoot}`);
      }
      console.log();
    } catch (error) {
      console.log(`⚠️  Could not query claim condition: ${error.message}`);
      console.log('   This might mean the contract uses a different allowlist mechanism\n');
      results.allowlist = { error: error.message };
    }
    
    // 4. Check permissions for updating allowlist
    console.log('🔐 Checking allowlist update permissions...');
    const walletAddress = process.env.WALLET_ADDRESS;
    
    if (walletAddress) {
      try {
        const owner = await contract.owner();
        const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
        const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, walletAddress);
        const isOwner = owner.toLowerCase() === walletAddress.toLowerCase();
        
        const canUpdate = isOwner || hasAdminRole;
        
        results.permissions = {
          walletAddress: walletAddress,
          isOwner: isOwner,
          ownerAddress: owner,
          hasAdminRole: hasAdminRole,
          canUpdateAllowlist: canUpdate,
        };
        
        console.log(`✅ Wallet Address: ${walletAddress}`);
        console.log(`✅ Is Owner: ${isOwner}`);
        console.log(`✅ Owner Address: ${owner}`);
        console.log(`✅ Has Admin Role: ${hasAdminRole}`);
        console.log(`✅ Can Update Allowlist: ${canUpdate ? 'Yes' : 'No'}`);
        
        if (canUpdate) {
          console.log('\n📝 To update the allowlist, you can call:');
          console.log('   setClaimConditions(conditions[], resetClaimEligibility)');
          console.log('   where conditions is an array of ClaimCondition structs');
        } else {
          console.log('\n⚠️  You do not have permission to update the allowlist.');
          console.log('   You need to be the owner or have DEFAULT_ADMIN_ROLE.');
        }
        console.log();
      } catch (error) {
        console.log(`⚠️  Could not check permissions: ${error.message}\n`);
        results.permissions = { error: error.message };
      }
    } else {
      console.log('ℹ️  No WALLET_ADDRESS provided in .env file');
      console.log('   Set WALLET_ADDRESS in .env to check update permissions\n');
      results.permissions = { note: 'No wallet address provided' };
    }
    
    // Print summary
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`1. Unique wallets that have minted: ${results.uniqueWallets.count}`);
    console.log(`2. NFTs minted: ${results.mintingStats.totalMinted} / ${results.mintingStats.maxTotalSupply}`);
    console.log(`   Remaining: ${results.mintingStats.remaining}`);
    if (results.allowlist.error) {
      console.log(`3. Active allowlist: Could not query (${results.allowlist.error})`);
    } else {
      console.log(`3. Active allowlist: ${results.allowlist.hasAllowlist ? 'Yes' : 'No'}`);
      if (results.allowlist.hasAllowlist && results.allowlist.merkleRoot) {
        console.log(`   Merkle Root: ${results.allowlist.merkleRoot}`);
      }
    }
    if (results.permissions && results.permissions.canUpdateAllowlist !== undefined) {
      if (results.permissions.canUpdateAllowlist) {
        console.log(`4. Can update allowlist: Yes (you have the required permissions)`);
      } else {
        console.log(`4. Can update allowlist: No (insufficient permissions)`);
      }
    } else {
      console.log(`4. Can update allowlist: Check not performed (set WALLET_ADDRESS in .env)`);
    }
    console.log('='.repeat(60));
    
    // Save JSON report
    const fs = await import('fs');
    fs.writeFileSync('contract-report.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Full report saved to: contract-report.json');
    
  } catch (error) {
    console.error('❌ Error querying contract:', error);
    process.exit(1);
  }
}

async function getUniqueMintingWallets(provider, contractAddress) {
  const uniqueWallets = new Set();
  
  // METHOD 1: Query token ownership directly (FASTEST - since we know there are only 32 tokens)
  // This is much faster than querying events across millions of blocks
  try {
    const contract = new ethers.Contract(contractAddress, [
      'function totalSupply() view returns (uint256)',
      'function ownerOf(uint256 tokenId) view returns (address)',
      'function tokenByIndex(uint256 index) view returns (uint256)',
    ], provider);
    
    const totalSupply = await contract.totalSupply();
    const supplyNum = Number(totalSupply);
    
    if (supplyNum === 0) {
      console.log('   No tokens minted yet');
      return uniqueWallets;
    }
    
    console.log(`   Checking ownership of ${supplyNum} tokens (fast method)...`);
    
    // Try tokenByIndex first (most reliable for ERC721Enumerable)
    let tokenIds = [];
    try {
      for (let i = 0; i < supplyNum; i++) {
        const tokenId = await contract.tokenByIndex(i);
        tokenIds.push(Number(tokenId));
      }
      console.log(`   ✅ Found ${tokenIds.length} token IDs via tokenByIndex`);
    } catch (e) {
      // tokenByIndex not available, try different methods
      console.log('   tokenByIndex not available, trying alternative methods...');
      
      // Method 1: Try nextTokenIdToMint to find the range
      let startId = 0;
      let endId = supplyNum;
      try {
        const nextTokenId = await contract.nextTokenIdToMint();
        const nextId = Number(nextTokenId);
        if (nextId > 0) {
          startId = Math.max(0, nextId - supplyNum - 10);
          endId = nextId;
          console.log(`   Found nextTokenIdToMint: ${nextId}, checking range ${startId} to ${endId}`);
        }
      } catch (e) {
        // Try a wide range
        endId = Math.max(supplyNum * 10, 1000);
        console.log(`   Checking wide range: 0 to ${endId}`);
      }
      
      // Try sequential IDs in the determined range
      for (let id = startId; id < endId && tokenIds.length < supplyNum; id++) {
        try {
          const owner = await contract.ownerOf(id);
          tokenIds.push(id);
          uniqueWallets.add(owner);
        } catch (e) {
          // Token doesn't exist at this ID
        }
      }
      
      // If we still don't have enough, try a binary search approach
      if (tokenIds.length < supplyNum) {
        console.log(`   Found ${tokenIds.length} tokens, trying wider search...`);
        // Try up to 10,000 IDs
        for (let id = 0; id < 10000 && tokenIds.length < supplyNum; id++) {
          if (tokenIds.includes(id)) continue;
          try {
            const owner = await contract.ownerOf(id);
            tokenIds.push(id);
            uniqueWallets.add(owner);
          } catch (e) {
            // Skip
          }
        }
      }
    }
    
    // Query ownership of all found token IDs (in case we got IDs but didn't add wallets yet)
    for (const tokenId of tokenIds) {
      try {
        const owner = await contract.ownerOf(tokenId);
        uniqueWallets.add(owner);
      } catch (e) {
        // Token might have been burned
      }
    }
    
    console.log(`   ✅ Found ${uniqueWallets.size} unique wallets from ${tokenIds.length} tokens`);
    return uniqueWallets;
    
  } catch (error) {
    console.log(`   ⚠️  Direct ownership query failed: ${error.message}`);
    console.log('   Falling back to event querying (this may be slow)...');
  }
  
  // METHOD 2: Fallback to event querying (SLOW - only if method 1 fails)
  // This queries Transfer events, which requires scanning many blocks
  try {
    const currentBlock = await provider.getBlockNumber();
    const contract = new ethers.Contract(contractAddress, [
      'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
    ], provider);
    
    // Try to find a reasonable starting block instead of 0
    // Search backwards from current block to find first mint event
    console.log('   Searching for contract creation block...');
    let startBlock = 0;
    
    // First, try to get the contract creation transaction
    try {
      // Get contract creation block from the first transaction
      const code = await provider.getCode(contractAddress);
      if (code && code !== '0x') {
        // Try to find creation block by checking recent blocks first (contracts are usually recent)
        const SEARCH_STEP = 100000;
        const RECENT_BLOCKS = 500000; // Check last 500k blocks first
        
        for (let block = currentBlock; block >= Math.max(0, currentBlock - RECENT_BLOCKS); block -= SEARCH_STEP) {
          try {
            const filter = contract.filters.Transfer(ZERO_ADDRESS);
            const logs = await provider.getLogs({
              ...filter,
              fromBlock: Math.max(0, block - SEARCH_STEP),
              toBlock: block,
            });
            
            if (logs.length > 0) {
              startBlock = Math.max(0, block - SEARCH_STEP);
              console.log(`   Found mint events starting around block ${startBlock}`);
              break;
            }
          } catch (e) {
            // Continue searching
          }
        }
      }
    } catch (e) {
      // Fall back to searching from block 0
      startBlock = 0;
    }
    
    // Query events in smaller chunks
    const CHUNK_SIZE = 2000; // Smaller chunks for better reliability
    console.log(`   Querying Transfer events from block ${startBlock} to ${currentBlock}...`);
    
    let totalLogs = 0;
    for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
      
      try {
        const filter = contract.filters.Transfer(ZERO_ADDRESS);
        const logs = await provider.getLogs({
          ...filter,
          fromBlock,
          toBlock,
        });
        
        totalLogs += logs.length;
        
        for (const log of logs) {
          const toAddress = ethers.getAddress('0x' + log.topics[2].slice(-40));
          uniqueWallets.add(toAddress);
        }
        
        if ((fromBlock - startBlock) % (CHUNK_SIZE * 5) === 0 || toBlock >= currentBlock) {
          process.stdout.write(`   Progress: ${toBlock}/${currentBlock} blocks, ${uniqueWallets.size} wallets...\r`);
        }
      } catch (chunkError) {
        // Skip chunks that fail (likely RPC limits)
        if (!chunkError.message.includes('limit') && !chunkError.message.includes('timeout')) {
          console.log(`\n   ⚠️  Error in block range ${fromBlock}-${toBlock}: ${chunkError.message}`);
        }
      }
    }
    
    console.log(`\n   Found ${totalLogs} mint events`);
    
  } catch (error) {
    console.error(`\n   Error in event querying: ${error.message}`);
    console.log('   💡 Tip: Use a dedicated RPC provider (Alchemy/Infura) for better reliability');
  }
  
  return uniqueWallets;
}

main().catch(console.error);

