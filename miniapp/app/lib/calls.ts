import { parseEther, type Address } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';
import { generateMerkleProof, type AllowlistEntry } from './merkle';
import type { ClaimCondition } from './claimConditions';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

interface CreateMintCallsParams {
  userAddress: string;
  quantity: number;
  condition: ClaimCondition;
  discountedList: AllowlistEntry[];
}

/**
 * Create mint transaction calls for wagmi
 */
export function createMintCalls({
  userAddress,
  quantity,
  condition,
  discountedList,
}: CreateMintCallsParams): Array<{
  address: Address;
  abi: typeof CONTRACT_ABI;
  functionName: 'claim';
  args: [
    Address, // _receiver
    bigint, // _quantity
    Address, // _currency
    bigint, // _pricePerToken
    {
      proof: `0x${string}`[];
      quantityLimitPerWallet: bigint;
      pricePerToken: bigint;
      currency: Address;
    }, // _allowlistProof
    `0x${string}` // _data
  ];
  value: bigint;
}> {
  if (!condition || quantity <= 0) {
    return [];
  }

  const receiver = userAddress.toLowerCase() as Address;
  const currency = ZERO_ADDRESS;
  const pricePerToken = parseEther(condition.price);
  const totalValue = pricePerToken * BigInt(quantity);

  // Prepare allowlist proof
  let allowlistProof: {
    proof: `0x${string}`[];
    quantityLimitPerWallet: bigint;
    pricePerToken: bigint;
    currency: Address;
  };

  if (
    condition.merkleRoot ===
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) {
    // Public mint - no proof needed
    allowlistProof = {
      proof: [],
      quantityLimitPerWallet: BigInt(0),
      pricePerToken,
      currency,
    };
  } else {
    // Allowlist mint - generate proof
    const entry = discountedList.find(
      e => e.address.toLowerCase() === userAddress.toLowerCase()
    );

    if (!entry) {
      // User not in allowlist, return empty array
      return [];
    }

    const proof = generateMerkleProof(entry, discountedList);

    allowlistProof = {
      proof,
      quantityLimitPerWallet: BigInt(entry.maxClaimable),
      pricePerToken: parseEther(entry.price),
      currency: (entry.currencyAddress || ZERO_ADDRESS).toLowerCase() as Address,
    };
  }

  return [
    {
      address: CONTRACT_ADDRESS as Address,
      abi: CONTRACT_ABI,
      functionName: 'claim' as const,
      args: [
        receiver,
        BigInt(quantity),
        currency,
        pricePerToken,
        allowlistProof,
        '0x' as `0x${string}`,
      ],
      value: totalValue,
    },
  ];
}
