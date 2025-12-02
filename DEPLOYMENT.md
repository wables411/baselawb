# Deployment Guide

## Why Netlify Failed (20 Deployments Issue)

### Root Causes:
1. **Missing Files**: `miniapp/app/lib/calls.ts` and `miniapp/app/lib/merkle.ts` were empty but being imported, causing TypeScript/build failures
2. **Alchemy API Downtime**: When Alchemy was down, builds may have failed if they tried to make RPC calls during build time
3. **Build Configuration Issues**: Netlify config had incorrect paths and missing optimizations

### What Was Fixed:
- ✅ Created missing `calls.ts` with `createMintCalls` function
- ✅ Created missing `merkle.ts` with `generateMerkleProof` function and `AllowlistEntry` type
- ✅ Fixed import issues (using ethers instead of viem for merkle tree functions)
- ✅ Optimized build configuration

## Vercel Deployment (Recommended)

Vercel is the recommended platform for Next.js apps with:
- **100 free builds/month** (vs Netlify's 300 credits)
- Better Next.js integration
- Faster builds
- Automatic optimizations

### Setup Steps:

1. **Push code to GitHub** (if not already done)

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Build Settings**:
   - **Root Directory**: `miniapp` (set in Vercel dashboard)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (runs in miniapp directory)
   - **Output Directory**: `.next` (default)

4. **Add Environment Variables** in Vercel dashboard:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x13c33121f8a73e22ac6aa4a135132f5ac7f221b2
   NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
   ```

5. **Deploy!** Vercel will automatically deploy on every push to main branch.

### Vercel Configuration File

The `vercel.json` file is configured for the `miniapp` subdirectory. If deploying from root, set the root directory in Vercel dashboard instead.

## Alternative: Cloudflare Pages

If you need more builds, Cloudflare Pages offers:
- **500 free builds/month**
- Good performance
- Simple setup

### Setup:
1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Connect GitHub repository
3. Build settings:
   - **Framework**: Next.js
   - **Build command**: `cd miniapp && npm install && npm run build`
   - **Build output directory**: `miniapp/.next`
4. Add environment variables in dashboard

## Environment Variables Required

All platforms need these environment variables:

- `NEXT_PUBLIC_CONTRACT_ADDRESS`: Your NFT contract address
- `NEXT_PUBLIC_BASE_RPC_URL`: Base RPC endpoint (use Alchemy/Infura, not public endpoint)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect Cloud project ID

**Important**: Never use the public Base RPC (`https://mainnet.base.org`) in production - it has strict rate limits and will cause failures.

## Build Verification

Before deploying, test locally:
```bash
cd miniapp
npm install
npm run build
```

The build should complete without errors. Warnings about `@react-native-async-storage/async-storage` and `pino-pretty` are expected and handled by webpack aliases.

## Troubleshooting

### Build Fails with TypeScript Errors
- Check that `calls.ts` and `merkle.ts` exist and are not empty
- Run `npm run build` locally to catch errors early

### RPC Rate Limit Errors
- Ensure `NEXT_PUBLIC_BASE_RPC_URL` uses Alchemy/Infura, not public endpoint
- Check Alchemy API status if errors persist

### WalletConnect Errors
- Verify `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly
- Get project ID from [WalletConnect Cloud](https://cloud.walletconnect.com)

