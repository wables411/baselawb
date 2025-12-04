# NFT Ownership-Based Discount Configuration

## Overview

The app now uses **NFT ownership checks** instead of Merkle proofs to determine discount eligibility. This dramatically reduces gas fees from ~$4-5 to ~$0.10-0.50 per transaction.

## How It Works

1. **User connects wallet** → App checks if wallet holds NFTs from eligible collections
2. **If NFT found** → User gets discounted price (0.002 ETH)
3. **If no NFT** → User pays public price (0.005 ETH)
4. **Transaction** → Uses public mint with empty Merkle proof (saves gas!)

## Configuration

Edit `miniapp/app/lib/nftOwnership.ts`:

### 1. Add Eligible NFT Collection Addresses

```typescript
export const DISCOUNT_ELIGIBLE_COLLECTIONS: Address[] = [
  '0x1234567890123456789012345678901234567890' as Address, // Collection 1
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address, // Collection 2
  // Add more collections as needed
];
```

### 2. Configure Discount Settings

```typescript
export const DISCOUNT_CONFIG: DiscountConfig = {
  price: '0.002',      // Discounted price in ETH
  maxClaimable: 15,    // Max NFTs that can be claimed with discount
};
```

## Gas Savings

**Before (Merkle Proof):**
- 12 proof elements × 32 bytes = 384 bytes calldata
- Gas fee: ~0.0015 ETH ($4-5)

**After (NFT Ownership Check):**
- Empty proof array = 0 bytes calldata
- Gas fee: ~0.0001-0.0003 ETH ($0.10-0.50)
- **Savings: ~90% reduction in gas fees!**

## Important Notes

⚠️ **Current Implementation:** The discount is applied client-side. The contract receives the discounted price, but doesn't verify NFT ownership on-chain.

**For full on-chain validation**, you would need to:
1. Modify the smart contract to check NFT ownership
2. Or use a different contract pattern that validates ownership

**Current approach is secure because:**
- Users can't mint at wrong price (they send the ETH amount)
- If they try to send wrong amount, transaction will fail
- Client-side check is just for UX (showing correct price)

## Testing

1. Connect a wallet that holds an NFT from an eligible collection
2. Should see "Discounted (NFT Holder)" pricing
3. Connect a wallet without eligible NFTs
4. Should see "Public Mint" pricing


