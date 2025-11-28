import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';
import { generateMerkleProof, AllowlistEntry } from './merkle';
import { parseEther } from 'viem';

export interface MintCallParams {
  userAddress: string;
  quantity: number;
  condition: {
    id: number;
    price: string;
    merkleRoot: string;
  };
  discountedList: AllowlistEntry[];
}

export function createMintCalls(params: MintCallParams) {
  const { userAddress, quantity, condition, discountedList } = params;

  const lowerAddress = userAddress.toLowerCase();
  const entry = discountedList.find(
    e => e.address.toLowerCase() === lowerAddress
  ) as (typeof discountedList)[number] | undefined;

  if (entry && quantity > entry.maxClaimable) {
    throw new Error(`Max claimable per wallet is ${entry.maxClaimable}`);
  }

  // Determine the effective price: use entry.price for discounted users, condition.price for public users
  const effectivePrice = entry ? entry.price : condition.price;
  const pricePerToken = parseEther(effectivePrice);

  let allowlistProof: {
    proof: string[];
    quantityLimitPerWallet: bigint;
    pricePerToken: bigint;
    currency: string;
  };

  if (entry) {
    const proof = generateMerkleProof(
      {
        address: entry.address,
        maxClaimable: entry.maxClaimable,
        price: entry.price,
        currencyAddress: entry.currencyAddress,
      },
      discountedList
    );

    allowlistProof = {
      proof,
      quantityLimitPerWallet: BigInt(entry.maxClaimable),
      pricePerToken: parseEther(entry.price),
      currency: entry.currencyAddress.toLowerCase(),
    };
  } else {
    allowlistProof = {
      proof: [],
      quantityLimitPerWallet: 0n,
      pricePerToken: 0n,
      currency: '0x0000000000000000000000000000000000000000',
    };
  }

  // Validate price consistency: _pricePerToken must match allowlistProof.pricePerToken when using allowlist
  if (entry && allowlistProof.pricePerToken !== pricePerToken) {
    throw new Error(
      `Price mismatch: allowlist price (${entry.price}) does not match effective price (${effectivePrice})`
    );
  }

  // Calculate transaction value using the effective price
  const transactionValue = pricePerToken * BigInt(quantity);

  console.log('Mint call details:', {
    userAddress: lowerAddress,
    quantity,
    effectivePrice,
    pricePerToken: pricePerToken.toString(),
    allowlistProofPrice: allowlistProof.pricePerToken.toString(),
    transactionValue: transactionValue.toString(),
    isDiscounted: Boolean(entry),
  });

  return [
    {
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'claim',
      args: [
        userAddress as `0x${string}`,
        BigInt(quantity),
        '0x0000000000000000000000000000000000000000' as `0x${string}`,
        pricePerToken,
        [
          allowlistProof.proof,
          allowlistProof.quantityLimitPerWallet,
          allowlistProof.pricePerToken,
          allowlistProof.currency as `0x${string}`,
        ],
        '0x' as `0x${string}`,
      ],
      value: transactionValue,
    },
  ];
}

