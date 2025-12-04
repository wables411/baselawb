# NFT Discount Wrapper Contract

This wrapper contract enforces NFT ownership-based discounts on-chain before calling your Thirdweb Drop contract.

## How It Works

1. User calls `claim()` on the wrapper contract
2. Wrapper checks if user holds NFTs from eligible collections
3. Wrapper enforces correct price (0.002 ETH if NFT holder, 0.005 ETH if not)
4. Wrapper calls your Thirdweb contract with the correct price
5. Transaction fails if user tries to pay wrong amount

## Setup

1. Install dependencies:
```bash
cd contracts
npm install
```

2. Create `.env` file:
```env
PRIVATE_KEY=your_private_key
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BASESCAN_API_KEY=your_basescan_api_key (optional, for verification)
```

3. Edit `scripts/deploy.js`:
   - Add your NFT collection addresses to `ELIGIBLE_COLLECTIONS`
   - Verify `DROP_CONTRACT` address is correct
   - Adjust prices if needed

4. Deploy:
```bash
npm run deploy
```

## Gas Cost

- **Wrapper contract**: ~50,000-80,000 gas for NFT ownership check
- **Total gas**: Still much cheaper than Merkle proofs (~$0.20-0.40 vs $4-5)

## Frontend Integration

After deployment, update your frontend:

1. Change `CONTRACT_ADDRESS` to the wrapper address
2. Update the ABI to use the wrapper's simpler `claim(address, uint256)` function
3. Remove Merkle proof generation code

The wrapper handles all the complexity!


