# Base NFT Contract Query & MiniApp

Tools for querying and managing a Base NFT contract, plus a minting MiniApp.

## Project Structure

```
base-nft-query/
├── scripts/                    # Management scripts
│   ├── generate-merkle-tree.js  # Generate merkle trees from allowlists
│   ├── update-claim-conditions.js  # Update contract claim conditions
│   └── verify-ipfs-pins.js     # Verify IPFS metadata and media
├── miniapp/                    # Base MiniApp for minting
│   ├── app/                    # Next.js app directory
│   └── package.json
├── FandFFree.txt               # F&F Free allowlist (maxClaimable=1)
├── FandFDinscount.csv          # F&F Discounted allowlist (maxClaimable=15)
└── query-contract.js           # Query contract analytics
```

## Setup

1. Install dependencies:
```bash
npm install
cd miniapp && npm install
```

2. Create `.env` file in root:
```env
PRIVATE_KEY=your_private_key_with_admin_permissions
BASE_RPC_URL=https://mainnet.base.org
CONTRACT_ADDRESS=0x13c33121f8a73e22ac6aa4a135132f5ac7f221b2
```

## Scripts

### Generate Merkle Trees

Generate merkle trees from allowlist files:

```bash
node scripts/generate-merkle-tree.js FandFFree.txt
node scripts/generate-merkle-tree.js FandFDinscount.csv
```

### Update Claim Conditions

Update the contract with three claim conditions:
1. Public: 0.005 ETH, no limit
2. F&F Free: 0 ETH, limit 1 per wallet
3. F&F Discounted: 0.002 ETH, limit 15 per wallet

```bash
node scripts/update-claim-conditions.js
```

### Verify IPFS Pins

Verify that metadata and media are accessible on IPFS:

```bash
node scripts/verify-ipfs-pins.js
```

Or with custom URIs:
```bash
node scripts/verify-ipfs-pins.js "ipfs://QmWUmutQWNs475pjNpcJ5J3ZLTthYwMdd3obTyqqFiGvGb/0" "ipfs://bafybeihxfyltqaawyqfdh442hzh6cdwms7nbodtk7qkfilgkftmd52xz3e/1.png"
```

### Query Contract

Query contract analytics:

```bash
npm start
# or
node query-contract.js
```

## MiniApp

See [miniapp/README.md](miniapp/README.md) for MiniApp setup and deployment instructions.

## Claim Conditions

The contract supports three claim conditions:

1. **Public Mint** (Condition ID 0)
   - Price: 0.005 ETH
   - Quantity Limit: No limit
   - Merkle Root: 0x0...0 (no allowlist)

2. **F&F Free** (Condition ID 1)
   - Price: 0 ETH
   - Quantity Limit: 1 per wallet
   - Merkle Root: Generated from `FandFFree.txt`

3. **F&F Discounted** (Condition ID 2)
   - Price: 0.002 ETH
   - Quantity Limit: 15 per wallet
   - Merkle Root: Generated from `FandFDinscount.csv`

## Deployment

### MiniApp to Netlify

1. Push code to GitHub
2. Connect repository to Netlify
3. Set build command: `cd miniapp && npm install && npm run build`
4. Set publish directory: `miniapp/.next`
5. Add environment variables in Netlify dashboard

See [miniapp/README.md](miniapp/README.md) for detailed instructions.

## License

MIT
