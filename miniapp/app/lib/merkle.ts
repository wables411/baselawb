import { MerkleTree } from 'merkletreejs';
import { encodePacked, keccak256, parseEther } from 'viem';

export type AllowlistEntry = {
  address: string;
  maxClaimable: number;
  price: string;
  currencyAddress: string;
};

let cachedAllowlist: AllowlistEntry[] | null = null;
let cachedTree: MerkleTree | null = null;

function createLeaf(entry: AllowlistEntry) {
  const packed = encodePacked(
    ['address', 'uint256', 'uint256', 'address'],
    [
      entry.address.toLowerCase() as `0x${string}`,
      BigInt(entry.maxClaimable),
      parseEther(entry.price || '0'),
      (entry.currencyAddress || '0x0000000000000000000000000000000000000000').toLowerCase() as `0x${string}`,
    ]
  );
  const hash = keccak256(packed);
  return Buffer.from(hash.slice(2), 'hex');
}

function getTree(allowlist: AllowlistEntry[]) {
  if (cachedTree && cachedAllowlist === allowlist) {
    return cachedTree;
  }

  const leaves = allowlist.map(createLeaf);
  cachedTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  cachedAllowlist = allowlist;
  return cachedTree;
}

/**
 * Generate merkle proof for an allowlist entry with price overrides.
 */
export function generateMerkleProof(
  entry: AllowlistEntry,
  allowlist: AllowlistEntry[]
): string[] {
  if (!entry) {
    throw new Error('Allowlist entry is required to generate a proof');
  }
  if (!allowlist || allowlist.length === 0) {
    throw new Error('Allowlist data is empty');
  }

  const tree = getTree(allowlist);
  const leaf = createLeaf(entry);
  return tree.getHexProof(leaf);
}

