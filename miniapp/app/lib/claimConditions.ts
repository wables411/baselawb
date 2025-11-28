import { CONTRACT_ADDRESS, CONTRACT_ABI, CLAIM_CONDITION_IDS } from './contract';
import { formatEther } from 'viem';

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
  discountedList: Array<{ address: string; quantity: number }>
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
      console.error('Error fetching active claim condition ID', error);
      throw error;
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
      console.error('Error fetching public claim condition', error);
      throw error;
    }
    const publicPrice = formatEther(publicCondition.pricePerToken as bigint);
    
    conditions.push({
      id: CLAIM_CONDITION_IDS.PUBLIC,
      name: 'Public Mint',
      price: publicPrice,
      quantityLimit: Number(publicCondition.quantityLimitPerWallet) || 0,
      merkleRoot: publicCondition.merkleRoot,
      active: Number(activeConditionId) === CLAIM_CONDITION_IDS.PUBLIC,
    });
    
    // Discounted condition (ID 2)
    let discountedCondition;
    try {
      discountedCondition = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'getClaimConditionById',
        args: [BigInt(CLAIM_CONDITION_IDS.DISCOUNTED)],
      });
    } catch (error: any) {
      console.error('Error fetching discounted claim condition', error);
      throw error;
    }
    const isInDiscounted = discountedList.some(
      e => e.address.toLowerCase() === userAddress.toLowerCase()
    );
    conditions.push({
      id: CLAIM_CONDITION_IDS.DISCOUNTED,
      name: 'Discounted',
      price: formatEther(discountedCondition.pricePerToken as bigint),
      quantityLimit: Number(discountedCondition.quantityLimitPerWallet),
      merkleRoot: discountedCondition.merkleRoot,
      active: isInDiscounted && Number(activeConditionId) === CLAIM_CONDITION_IDS.DISCOUNTED,
    });
    
    // Prefer discounted condition when eligible, otherwise fall back to public
    if (isInDiscounted) {
      return conditions.find(c => c.id === CLAIM_CONDITION_IDS.DISCOUNTED) || conditions[0];
    }
    return conditions[0];
    
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

