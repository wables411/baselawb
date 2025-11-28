import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Base NFT Mint',
  description: 'Mint your NFT on Base',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

