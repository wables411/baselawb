# Base NFT Minting MiniApp

A Base MiniApp for minting NFTs with support for multiple claim conditions (Public, F&F Free, F&F Discounted).

## Features

- Wallet connection via RainbowKit (supports Coinbase Wallet, MetaMask, and more)
- Automatic claim condition detection based on wallet address
- Merkle proof generation for allowlisted addresses
- Real-time minting status and remaining supply
- Base MiniApp SDK integration for Farcaster

## Setup

1. Install dependencies:
```bash
cd miniapp
npm install
```

2. Create `.env.local` file:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x13c33121f8a73e22ac6aa4a135132f5ac7f221b2
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

**Important:** The public Base RPC (`https://mainnet.base.org`) has rate limits. For production, use a dedicated RPC provider:

- **Alchemy**: Get free API key at https://www.alchemy.com/
- **Infura**: Get free API key at https://www.infura.io/
- **QuickNode**: Get free API key at https://www.quicknode.com/

Example with Alchemy:
```env
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## Deployment to Netlify

1. Push your code to GitHub

2. Connect your GitHub repository to Netlify:
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Select your GitHub repository
   - Configure build settings:
     - Build command: `npm install && npm run build`
     - Publish directory: `.next`

3. Add environment variables in Netlify dashboard:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`: Your contract address
   - `NEXT_PUBLIC_BASE_RPC_URL`: Base RPC endpoint (use a dedicated provider to avoid rate limits)

4. Deploy!

## Base MiniApp Integration

This app uses the Farcaster MiniApp SDK to integrate with Base. When running in a Farcaster client, it will automatically:
- Signal that the MiniApp is ready
- Handle wallet connections through the Farcaster wallet

## Architecture

- `app/page.tsx`: Main minting interface
- `app/components/ClaimStatus.tsx`: Shows user's claim eligibility
- `app/components/MintTransactionButton.tsx`: Handles minting transactions using wagmi
- `app/lib/contract.ts`: Contract configuration and ABI
- `app/lib/claimConditions.ts`: Claim condition detection logic
- `app/lib/merkle.ts`: Merkle proof generation
- `app/lib/calls.ts`: Transaction call formatting

## Rate Limiting

The public Base RPC endpoint has rate limits. If you see 429 errors:
1. Use a dedicated RPC provider (Alchemy, Infura, or QuickNode)
2. Add the RPC URL to your environment variables
3. The app includes error handling to gracefully handle rate limits

## Notes

- Allowlist data should be loaded from a backend API or IPFS in production
- Merkle proofs are generated client-side for allowlisted users
- The app automatically detects which claim condition applies to each user
