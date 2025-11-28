'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletConnectProps {
  onConnect: (address: string, provider: ethers.BrowserProvider) => void;
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check if already connected
    checkConnection();
  }, []);

  async function checkConnection() {
    if (typeof window === 'undefined' || !window.ethereum) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        setAddress(accounts[0].address);
        onConnect(accounts[0].address, provider);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  }

  async function connectWallet() {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      setAddress(userAddress);
      onConnect(userAddress, provider);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }

  function formatAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  if (address) {
    return (
      <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center' }}>
        <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✓ Connected: {formatAddress(address)}</span>
      </div>
    );
  }

  return (
    <button 
      onClick={connectWallet} 
      disabled={connecting}
      style={{
        padding: '1rem 2rem',
        fontSize: '1rem',
        fontWeight: 'bold',
        background: connecting ? '#ccc' : '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: connecting ? 'not-allowed' : 'pointer',
        width: '100%'
      }}
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

