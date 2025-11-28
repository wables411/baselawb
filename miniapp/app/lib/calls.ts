import { CONTRACT_ADDRESS, CONTRACT_ABI, CLAIM_CONDITION_IDS } from './contract';
import { generateMerkleProof } from './merkle';
import { parseEther } from 'viem';

export interface MintCallParams {
  userAddress: string;
  quantity: number;
  condition: {
    id: number;
    price: string;
    merkleRoot: string;
  };
  discountedList: Array<{ address: string; quantity: number }>;
}

export function createMintCalls(params: MintCallParams) {
  const { userAddress, quantity, condition, discountedList } = params;

  // Prepare allowlist proof
  let allowlistProof: {
    proof: string[];
    quantityLimitPerWallet: bigint;
    pricePerToken: bigint;
    currency: string;
  };

  if (condition.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    // Public mint - no proof needed
    allowlistProof = {
      proof: [],
      quantityLimitPerWallet: 0n,
      pricePerToken: parseEther(condition.price),
      currency: '0x0000000000000000000000000000000000000000',
    };
  } else {
    // Allowlist mint - generate proof
    let allowlist: Array<{ address: string; quantity: number }> = [];
    if (condition.id === CLAIM_CONDITION_IDS.DISCOUNTED) {
      allowlist = discountedList;
    }

    const entry = allowlist.find(
      e => e.address.toLowerCase() === userAddress.toLowerCase()
    );
    
    if (!entry) {
      throw new Error('Address not in allowlist');
    }

    const proof = generateMerkleProof(userAddress, entry.quantity, allowlist);
    
    allowlistProof = {
      proof: proof,
      quantityLimitPerWallet: BigInt(entry.quantity),
      pricePerToken: parseEther(condition.price),
      currency: '0x0000000000000000000000000000000000000000',
    };
  }

  // Create the call for OnchainKit TransactionButton
  return [
    {
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'claim',
      args: [
        userAddress as `0x${string}`, // _receiver
        BigInt(quantity), // _quantity
        '0x0000000000000000000000000000000000000000' as `0x${string}`, // _currency (ETH)
        parseEther(condition.price), // _pricePerToken
        [
          allowlistProof.proof,
          allowlistProof.quantityLimitPerWallet,
          allowlistProof.pricePerToken,
          allowlistProof.currency as `0x${string}`,
        ], // _allowlistProof
        '0x' as `0x${string}`, // _data (empty)
      ],
      value: parseEther(condition.price) * BigInt(quantity), // Total ETH to send
    },
  ];
}

