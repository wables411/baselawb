# Base NFT Minting MiniApp

A Base MiniApp for minting NFTs with support for multiple claim conditions (Public, F&F Free, F&F Discounted).

## Features

- Wallet connection via MetaMask or other Web3 wallets
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
     - Build command: `cd miniapp && npm install && npm run build`
     - Publish directory: `miniapp/.next`

3. Add environment variables in Netlify dashboard:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`: Your contract address
   - `NEXT_PUBLIC_BASE_RPC_URL`: Base RPC endpoint

4. Deploy!

## Base MiniApp Integration

This app uses the Farcaster MiniApp SDK to integrate with Base. When running in a Farcaster client, it will automatically:
- Signal that the MiniApp is ready
- Handle wallet connections through the Farcaster wallet

## Architecture

- `app/page.tsx`: Main minting interface
- `app/components/WalletConnect.tsx`: Wallet connection component
- `app/components/ClaimStatus.tsx`: Shows user's claim eligibility
- `app/components/MintButton.tsx`: Handles minting transactions
- `app/lib/contract.ts`: Contract configuration and ABI
- `app/lib/claimConditions.ts`: Claim condition detection logic
- `app/lib/merkle.ts`: Merkle proof generation

## Notes

- Allowlist data should be loaded from a backend API or IPFS in production
- Merkle proofs are generated client-side for allowlisted users
- The app automatically detects which claim condition applies to each user

