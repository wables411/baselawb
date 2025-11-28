'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

interface MintTransactionButtonProps {
  calls: any[];
  onSuccess?: () => void;
  disabled?: boolean;
}

export default function MintTransactionButton({
  calls,
  onSuccess,
  disabled,
}: MintTransactionButtonProps) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const [error, setError] = useState<string | null>(null);

  async function handleMint() {
    if (!calls || calls.length === 0 || disabled) return;

    setError(null);
    try {
      const call = calls[0];
      await writeContract({
        address: call.address,
        abi: call.abi,
        functionName: call.functionName,
        args: call.args,
        value: call.value,
      });
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      console.error('Mint error:', err);
    }
  }

  useEffect(() => {
    if (isSuccess && onSuccess) {
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

  const isLoading = isPending || isConfirming;
  const quantity = calls[0]?.args?.[1] ? Number(calls[0].args[1]) : 1;

  return (
    <div style={{ marginTop: '1rem' }}>
      {error && (
        <div style={{ padding: '0.75rem', background: '#ffebee', color: '#d32f2f', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      <button
        onClick={handleMint}
        disabled={disabled || isLoading || calls.length === 0}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          background: (disabled || isLoading || calls.length === 0) ? '#ccc' : '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: (disabled || isLoading || calls.length === 0) ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '0.5rem'
        }}
      >
        {isLoading ? 'Processing...' : `Mint ${quantity} NFT${quantity > 1 ? 's' : ''}`}
      </button>
      {isSuccess && (
        <div style={{ padding: '0.75rem', background: '#e8f5e9', color: '#2e7d32', borderRadius: '4px', textAlign: 'center' }}>
          ✅ Mint successful! Transaction: {hash?.slice(0, 10)}...
        </div>
      )}
    </div>
  );
}

