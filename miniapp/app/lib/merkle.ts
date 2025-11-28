import { MerkleTree } from 'merkletreejs';
import { solidityPackedKeccak256, parseEther, keccak256 } from 'ethers';

export type AllowlistEntry = {
  address: string;
  maxClaimable: number;
  price: string;
  currencyAddress: string;
};

let cachedAllowlist: AllowlistEntry[] | null = null;
let cachedTree: MerkleTree | null = null;

function createLeaf(entry: AllowlistEntry) {
  // Use ethers solidityPackedKeccak256 to match backend exactly
  const hash = solidityPackedKeccak256(
    ['address', 'uint256', 'uint256', 'address'],
    [
      entry.address.toLowerCase(),
      BigInt(entry.maxClaimable),
      parseEther(entry.price || '0'),
      (entry.currencyAddress || '0x0000000000000000000000000000000000000000').toLowerCase(),
    ]
  );
  return Buffer.from(hash.slice(2), 'hex');
}

// Hash function for MerkleTree - must match backend (ethers keccak256)
function merkleHash(data: Buffer): Buffer {
  return Buffer.from(keccak256(data).slice(2), 'hex');
}

function getTree(allowlist: AllowlistEntry[]) {
  if (cachedTree && cachedAllowlist === allowlist) {
    return cachedTree;
  }

  const leaves = allowlist.map(createLeaf);
  // Use ethers keccak256 for tree hashing to match backend
  cachedTree = new MerkleTree(leaves, merkleHash, { sortPairs: true });
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

