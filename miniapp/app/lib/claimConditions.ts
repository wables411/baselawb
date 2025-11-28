import { CONTRACT_ADDRESS, CONTRACT_ABI, CLAIM_CONDITION_IDS } from './contract';
import { formatEther, parseEther } from 'viem';

export interface ClaimCondition {
  id: number;
  name: string;
  price: string;
  quantityLimit: number;
  merkleRoot: string;
  active: boolean;
}

/**
 * Determine which claim condition applies to a user
 */
export async function getClaimConditionForUser(
  publicClient: any,
  userAddress: string,
  fandfFreeList: Array<{ address: string; quantity: number }>,
  fandfDiscountedList: Array<{ address: string; quantity: number }>
): Promise<ClaimCondition | null> {
  try {
    // Get active condition ID with retry logic for rate limits
    let activeConditionId;
    try {
      activeConditionId = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'getActiveClaimConditionId',
      });
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
        console.warn('Rate limited by RPC, using default condition ID 0');
        activeConditionId = 0n; // Default to public condition
      } else {
        throw error;
      }
    }
    
    // Check each condition
    const conditions: ClaimCondition[] = [];
    
    // Public condition (ID 0) - with error handling
    let publicCondition;
    try {
      publicCondition = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'getClaimConditionById',
        args: [BigInt(CLAIM_CONDITION_IDS.PUBLIC)],
      });
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
        console.warn('Rate limited, using default public condition');
        // Return default public condition
        return {
          id: CLAIM_CONDITION_IDS.PUBLIC,
          name: 'Public Mint',
          price: '0.005',
          quantityLimit: 0,
          merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
          active: true,
        };
      }
      throw error;
    }
    conditions.push({
      id: CLAIM_CONDITION_IDS.PUBLIC,
      name: 'Public Mint',
      price: formatEther(publicCondition.pricePerToken as bigint),
      quantityLimit: Number(publicCondition.quantityLimitPerWallet) || 0,
      merkleRoot: publicCondition.merkleRoot,
      active: Number(activeConditionId) === CLAIM_CONDITION_IDS.PUBLIC,
    });
    
    // F&F Free condition (ID 1) - with error handling
    let fandfFreeCondition;
    try {
      fandfFreeCondition = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'getClaimConditionById',
        args: [BigInt(CLAIM_CONDITION_IDS.FANDF_FREE)],
      });
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
        console.warn('Rate limited, skipping F&F Free condition check');
        fandfFreeCondition = { pricePerToken: 0n, quantityLimitPerWallet: 1n, merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000' };
      } else {
        throw error;
      }
    }
    const isInFandfFree = fandfFreeList.some(
      e => e.address.toLowerCase() === userAddress.toLowerCase()
    );
    conditions.push({
      id: CLAIM_CONDITION_IDS.FANDF_FREE,
      name: 'F&F Free',
      price: formatEther(fandfFreeCondition.pricePerToken as bigint),
      quantityLimit: Number(fandfFreeCondition.quantityLimitPerWallet),
      merkleRoot: fandfFreeCondition.merkleRoot,
      active: isInFandfFree && Number(activeConditionId) === CLAIM_CONDITION_IDS.FANDF_FREE,
    });
    
    // F&F Discounted condition (ID 2) - with error handling
    let fandfDiscountedCondition;
    try {
      fandfDiscountedCondition = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'getClaimConditionById',
        args: [BigInt(CLAIM_CONDITION_IDS.FANDF_DISCOUNTED)],
      });
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
        console.warn('Rate limited, skipping F&F Discounted condition check');
        fandfDiscountedCondition = { pricePerToken: parseEther('0.002'), quantityLimitPerWallet: 15n, merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000' };
      } else {
        throw error;
      }
    }
    const isInFandfDiscounted = fandfDiscountedList.some(
      e => e.address.toLowerCase() === userAddress.toLowerCase()
    );
    conditions.push({
      id: CLAIM_CONDITION_IDS.FANDF_DISCOUNTED,
      name: 'F&F Discounted',
      price: formatEther(fandfDiscountedCondition.pricePerToken as bigint),
      quantityLimit: Number(fandfDiscountedCondition.quantityLimitPerWallet),
      merkleRoot: fandfDiscountedCondition.merkleRoot,
      active: isInFandfDiscounted && Number(activeConditionId) === CLAIM_CONDITION_IDS.FANDF_DISCOUNTED,
    });
    
    // Find the best condition for the user (prioritize allowlists over public)
    const allowlistCondition = conditions.find(c => 
      c.id !== CLAIM_CONDITION_IDS.PUBLIC && 
      (c.id === CLAIM_CONDITION_IDS.FANDF_FREE && isInFandfFree) ||
      (c.id === CLAIM_CONDITION_IDS.FANDF_DISCOUNTED && isInFandfDiscounted)
    );
    
    return allowlistCondition || conditions[0]; // Return allowlist condition or public
    
  } catch (error) {
    console.error('Error getting claim condition:', error);
    return null;
  }
}

/**
 * Get remaining supply for a condition
 */
export async function getRemainingSupply(
  publicClient: any,
  conditionId: number
): Promise<number> {
  try {
    const condition = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'getClaimConditionById',
      args: [BigInt(conditionId)],
    });
    const maxClaimable = Number(condition.maxClaimableSupply);
    const supplyClaimed = Number(condition.supplyClaimed);
    return Math.max(0, maxClaimable - supplyClaimed);
  } catch (error) {
    console.error('Error getting remaining supply:', error);
    return 0;
  }
}

/**
 * Get amount already claimed by user for a condition
 */
export async function getClaimedAmount(
  publicClient: any,
  userAddress: string,
  conditionId: number
): Promise<number> {
  try {
    const claimed = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'getSupplyClaimedByWallet',
      args: [BigInt(conditionId), userAddress as `0x${string}`],
    });
    return Number(claimed);
  } catch (error) {
    console.error('Error getting claimed amount:', error);
    return 0;
  }
}

