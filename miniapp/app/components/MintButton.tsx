'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../lib/contract';
import { generateMerkleProof } from '../lib/merkle';

interface MintButtonProps {
  provider: ethers.BrowserProvider | null;
  userAddress: string | null;
  condition: any;
  quantity: number;
  onMintSuccess?: () => void;
  fandfFreeList: Array<{ address: string; quantity: number }>;
  fandfDiscountedList: Array<{ address: string; quantity: number }>;
}

export default function MintButton({
  provider,
  userAddress,
  condition,
  quantity,
  onMintSuccess,
  fandfFreeList,
  fandfDiscountedList,
}: MintButtonProps) {
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMint() {
    if (!provider || !userAddress || !condition) {
      setError('Wallet not connected');
      return;
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    setMinting(true);
    setError(null);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Prepare allowlist proof
      let allowlistProof;
      if (condition.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        // Public mint - no proof needed
        allowlistProof = {
          proof: [],
          quantityLimitPerWallet: 0,
          pricePerToken: ethers.parseEther(condition.price),
          currency: '0x0000000000000000000000000000000000000000',
        };
      } else {
        // Allowlist mint - generate proof
        let allowlist: Array<{ address: string; quantity: number }> = [];
        if (condition.id === 1) {
          // F&F Free
          allowlist = fandfFreeList;
        } else if (condition.id === 2) {
          // F&F Discounted
          allowlist = fandfDiscountedList;
        }

        const entry = allowlist.find(
          e => e.address.toLowerCase() === userAddress.toLowerCase()
        );
        
        if (!entry) {
          throw new Error('Address not in allowlist');
        }

        const proof = generateMerkleProof(userAddress, entry.quantity, allowlist);
        
        allowlistProof = {
          proof: proof,
          quantityLimitPerWallet: entry.quantity,
          pricePerToken: ethers.parseEther(condition.price),
          currency: '0x0000000000000000000000000000000000000000',
        };
      }

      // Calculate total price
      const totalPrice = ethers.parseEther(condition.price) * BigInt(quantity);

      // Call claim function
      const tx = await contract.claim(
        userAddress, // _receiver
        quantity, // _quantity
        '0x0000000000000000000000000000000000000000', // _currency (ETH)
        ethers.parseEther(condition.price), // _pricePerToken
        allowlistProof, // _allowlistProof
        '0x' // _data (empty)
      );

      console.log('Transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      if (onMintSuccess) {
        onMintSuccess();
      }

      alert(`Successfully minted ${quantity} NFT(s)! Transaction: ${tx.hash}`);
      
    } catch (err: any) {
      console.error('Mint error:', err);
      setError(err.reason || err.message || 'Failed to mint');
      alert(`Mint failed: ${err.reason || err.message || 'Unknown error'}`);
    } finally {
      setMinting(false);
    }
  }

  const totalPrice = condition ? parseFloat(condition.price) * quantity : 0;

  return (
    <div style={{ marginTop: '1rem' }}>
      {error && (
        <div style={{ padding: '0.75rem', background: '#ffebee', color: '#d32f2f', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      <button
        onClick={handleMint}
        disabled={minting || !provider || !userAddress || !condition || quantity <= 0}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          background: (minting || !provider || !userAddress || !condition || quantity <= 0) ? '#ccc' : '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: (minting || !provider || !userAddress || !condition || quantity <= 0) ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '0.5rem'
        }}
      >
        {minting ? 'Minting...' : `Mint ${quantity} NFT${quantity > 1 ? 's' : ''}`}
      </button>
      {condition && (
        <div style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>
          Total: {totalPrice.toFixed(6)} ETH
        </div>
      )}
    </div>
  );
}

