'use client';

import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { coinbaseWallet, injected, metaMask } from 'wagmi/connectors';

const queryClient = new QueryClient();

const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Base NFT Mint',
    }),
    injected(),
    metaMask(),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/Cl7CPlDrGwgzhkxLjPwTU'),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

