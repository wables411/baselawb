'use client';

import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import {
  RainbowKitProvider,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';

const queryClient = new QueryClient();
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!walletConnectProjectId) {
  throw new Error(
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required. Create one at https://cloud.walletconnect.com and set it in your env vars.'
  );
}

const rpcUrl =
  process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

const config = getDefaultConfig({
  appName: 'Base NFT Mint',
  projectId: walletConnectProjectId,
  chains: [base],
  ssr: true,
  transports: {
    [base.id]: http(rpcUrl),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

