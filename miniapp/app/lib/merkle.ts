import { MerkleTree } from 'merkletreejs';
import { keccak256, solidityPackedKeccak256, parseEther } from 'ethers';

export interface AllowlistEntry {
  address: string;
  maxClaimable: number;
  price: string;
  currencyAddress: string;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Generate merkle proof for an allowlist entry
 */
export function generateMerkleProof(
  entry: AllowlistEntry,
  allowlist: AllowlistEntry[]
): `0x${string}`[] {
  if (allowlist.length === 0) {
    return [];
  }

  // Check if we need to use price/currency overrides
  const usesOverrides = allowlist.some(
    e => e.price !== '0' || e.currencyAddress !== ZERO_ADDRESS
  );

  // Generate leaves
  const leaves = allowlist.map(e => {
    const address = e.address.toLowerCase() as `0x${string}`;
    const maxClaimable = BigInt(e.maxClaimable);
    
    if (usesOverrides) {
      const priceWei = parseEther(e.price || '0');
      const currency = (e.currencyAddress || ZERO_ADDRESS).toLowerCase() as `0x${string}`;
      const hash = solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'address'],
        [address, maxClaimable, priceWei, currency]
      );
      return Buffer.from(hash.slice(2), 'hex');
    }
    
    const hash = solidityPackedKeccak256(
      ['address', 'uint256'],
      [address, maxClaimable]
    );
    return Buffer.from(hash.slice(2), 'hex');
  });

  // Create merkle tree
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

  // Find the entry's leaf
  const entryAddress = entry.address.toLowerCase() as `0x${string}`;
  const entryMaxClaimable = BigInt(entry.maxClaimable);
  
  let entryLeaf: Buffer;
  if (usesOverrides) {
    const entryPriceWei = parseEther(entry.price || '0');
    const entryCurrency = (entry.currencyAddress || ZERO_ADDRESS).toLowerCase() as `0x${string}`;
    const hash = solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'address'],
      [entryAddress, entryMaxClaimable, entryPriceWei, entryCurrency]
    );
    entryLeaf = Buffer.from(hash.slice(2), 'hex');
  } else {
    const hash = solidityPackedKeccak256(
      ['address', 'uint256'],
      [entryAddress, entryMaxClaimable]
    );
    entryLeaf = Buffer.from(hash.slice(2), 'hex');
  }

  // Generate proof
  const proof = tree.getHexProof(entryLeaf) as `0x${string}`[];
  return proof;
}
