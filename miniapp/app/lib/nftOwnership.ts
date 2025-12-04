/**
 * NFT Ownership Checker
 * Checks if a wallet holds NFTs from specific collections to determine discount eligibility
 */

import { type Address } from 'viem';

// Standard ERC721 ABI for balanceOf check
export const ERC721_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Configuration for discount-eligible NFT collections
 * Add the contract addresses of NFT collections that qualify for discounted pricing
 */
export const DISCOUNT_ELIGIBLE_COLLECTIONS: Address[] = [
  // Add your NFT collection addresses here
  // Example: '0x1234567890123456789012345678901234567890' as Address,
];

/**
 * Discount configuration
 */
export interface DiscountConfig {
  price: string; // Price in ETH (e.g., "0.002")
  maxClaimable: number; // Max NFTs that can be claimed with discount
}

export const DISCOUNT_CONFIG: DiscountConfig = {
  price: '0.002', // Discounted price
  maxClaimable: 15, // Max claimable with discount
};

/**
 * Check if a wallet holds any NFTs from the eligible collections
 */
export async function checkNFTOwnership(
  publicClient: any,
  walletAddress: string,
  collectionAddresses: Address[] = DISCOUNT_ELIGIBLE_COLLECTIONS
): Promise<boolean> {
  if (collectionAddresses.length === 0) {
    return false;
  }

  try {
    // Check all collections in parallel
    const balanceChecks = await Promise.all(
      collectionAddresses.map(async (collectionAddress) => {
        try {
          const balance = await publicClient.readContract({
            address: collectionAddress,
            abi: ERC721_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          });
          return Number(balance) > 0;
        } catch (error) {
          console.error(`Error checking balance for ${collectionAddress}:`, error);
          return false;
        }
      })
    );

    // Returns true if wallet holds at least one NFT from any eligible collection
    return balanceChecks.some((hasNFT) => hasNFT);
  } catch (error) {
    console.error('Error checking NFT ownership:', error);
    return false;
  }
}

/**
 * Get the number of NFTs owned across all eligible collections
 */
export async function getTotalNFTOwned(
  publicClient: any,
  walletAddress: string,
  collectionAddresses: Address[] = DISCOUNT_ELIGIBLE_COLLECTIONS
): Promise<number> {
  if (collectionAddresses.length === 0) {
    return 0;
  }

  try {
    const balanceChecks = await Promise.all(
      collectionAddresses.map(async (collectionAddress) => {
        try {
          const balance = await publicClient.readContract({
            address: collectionAddress,
            abi: ERC721_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          });
          return Number(balance);
        } catch (error) {
          console.error(`Error checking balance for ${collectionAddress}:`, error);
          return 0;
        }
      })
    );

    return balanceChecks.reduce((sum, balance) => sum + balance, 0);
  } catch (error) {
    console.error('Error getting total NFT count:', error);
    return 0;
  }
}


