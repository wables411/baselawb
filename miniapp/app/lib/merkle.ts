import { MerkleTree } from 'merkletreejs';
import { keccak256, solidityPackedKeccak256 } from 'ethers';

// Allowlist data - in production, this would be loaded from an API or IPFS
// For now, we'll generate proofs on-demand from the allowlist files
let fandfFreeAllowlist: Map<string, number> | null = null;
let fandfDiscountedAllowlist: Map<string, number> | null = null;

/**
 * Load allowlist data (in production, fetch from API/IPFS)
 */
export async function loadAllowlists() {
  // In a real app, you'd fetch these from your backend or IPFS
  // For now, return empty - proofs should be generated server-side
  return {
    fandfFree: new Map<string, number>(),
    fandfDiscounted: new Map<string, number>(),
  };
}

/**
 * Generate merkle proof for an address
 */
export function generateMerkleProof(
  address: string,
  quantity: number,
  allowlist: Array<{ address: string; quantity: number }>
): string[] {
  const normalizedAddress = address.toLowerCase();
  
  // Create leaves
  const leaves = allowlist.map(entry => {
    const hash = solidityPackedKeccak256(
      ['address', 'uint256'],
      [entry.address.toLowerCase(), entry.quantity]
    );
    return Buffer.from(hash.slice(2), 'hex');
  });
  
  // Create tree
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  
  // Find the leaf for this address
  const entry = allowlist.find(e => e.address.toLowerCase() === normalizedAddress);
  if (!entry) {
    throw new Error('Address not in allowlist');
  }
  
  const leafHash = solidityPackedKeccak256(
    ['address', 'uint256'],
    [normalizedAddress, entry.quantity]
  );
  const leaf = Buffer.from(leafHash.slice(2), 'hex');
  
  // Get proof
  const proof = tree.getHexProof(leaf);
  return proof;
}

/**
 * Verify if address is in allowlist (client-side check)
 * Note: Actual verification happens on-chain
 */
export function isInAllowlist(
  address: string,
  allowlist: Array<{ address: string; quantity: number }>
): { inList: boolean; quantity: number } {
  const normalizedAddress = address.toLowerCase();
  const entry = allowlist.find(e => e.address.toLowerCase() === normalizedAddress);
  
  if (entry) {
    return { inList: true, quantity: entry.quantity };
  }
  
  return { inList: false, quantity: 0 };
}

