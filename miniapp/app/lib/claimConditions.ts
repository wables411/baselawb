import { CONTRACT_ADDRESS, CONTRACT_ABI, CLAIM_CONDITION_IDS } from './contract';
import { formatEther } from 'viem';
import type { AllowlistEntry } from './merkle';

export interface ClaimCondition {
  id: number;
  name: string;
  price: string;
  quantityLimit: number;
  merkleRoot: string;
  active: boolean;
  isDiscounted?: boolean;
}

/**
 * Determine which claim condition applies to a user
 */
export async function getClaimConditionForUser(
  publicClient: any,
  userAddress: string,
  discountedList: AllowlistEntry[]
): Promise<ClaimCondition | null> {
  try {
    const activeConditionId = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'getActiveClaimConditionId',
    });
    
    const publicCondition = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'getClaimConditionById',
      args: [BigInt(CLAIM_CONDITION_IDS.PUBLIC)],
    });
    const publicPrice = formatEther(publicCondition.pricePerToken as bigint);
    
    const discountedEntry = discountedList.find(
      entry => entry.address.toLowerCase() === userAddress.toLowerCase()
    );
    
    const effectivePrice = discountedEntry ? discountedEntry.price : publicPrice;
    const quantityLimit = discountedEntry
      ? discountedEntry.maxClaimable
      : Number(publicCondition.quantityLimitPerWallet) || 0;
    
    return {
      id: Number(activeConditionId),
      name: discountedEntry ? 'Discounted' : 'Public Mint',
      price: effectivePrice,
      quantityLimit,
      merkleRoot: publicCondition.merkleRoot,
      active: true,
      isDiscounted: Boolean(discountedEntry),
    };
    
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

