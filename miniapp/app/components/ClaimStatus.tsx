'use client';

import { useEffect, useState } from 'react';
import { getClaimConditionForUser, getClaimedAmount, getRemainingSupply } from '../lib/claimConditions';
import { CLAIM_CONDITION_IDS } from '../lib/contract';

interface ClaimStatusProps {
  provider: any;
  userAddress: string | null;
  fandfFreeList: Array<{ address: string; quantity: number }>;
  fandfDiscountedList: Array<{ address: string; quantity: number }>;
}

export default function ClaimStatus({
  provider,
  userAddress,
  fandfFreeList,
  fandfDiscountedList,
}: ClaimStatusProps) {
  const [condition, setCondition] = useState<any>(null);
  const [claimed, setClaimed] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provider || !userAddress) {
      setLoading(false);
      return;
    }

    async function loadStatus() {
      setLoading(true);
      try {
        // Guard: ensure userAddress is not null
        if (!userAddress) {
          setLoading(false);
          return;
        }
        
        const claimCondition = await getClaimConditionForUser(
          provider,
          userAddress,
          fandfFreeList,
          fandfDiscountedList
        );
        setCondition(claimCondition);

        if (claimCondition && userAddress) {
          const [claimedAmount, remainingSupply] = await Promise.all([
            getClaimedAmount(provider, userAddress, claimCondition.id),
            getRemainingSupply(provider, claimCondition.id),
          ]);
          setClaimed(claimedAmount);
          setRemaining(remainingSupply);
        }
      } catch (error) {
        console.error('Error loading claim status:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [provider, userAddress, fandfFreeList, fandfDiscountedList]);

  if (loading) {
    return <div style={{ padding: '1rem', textAlign: 'center' }}>Loading claim status...</div>;
  }

  if (!condition) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: '#d32f2f' }}>Unable to load claim condition</div>;
  }

  const canMint = condition.quantityLimit === 0 || claimed < condition.quantityLimit;
  const remainingForUser = condition.quantityLimit === 0 
    ? remaining 
    : Math.max(0, condition.quantityLimit - claimed);

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Your Mint Status</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Condition:</span>
          <span>{condition.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Price:</span>
          <span>{condition.price} ETH</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Claimed:</span>
          <span>{claimed} / {condition.quantityLimit === 0 ? '∞' : condition.quantityLimit}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Remaining:</span>
          <span>{remainingForUser} available</span>
        </div>
        {!canMint && (
          <div style={{ padding: '0.75rem', background: '#ffebee', color: '#d32f2f', borderRadius: '4px', marginTop: '0.5rem' }}>
            You have reached your mint limit for this condition
          </div>
        )}
      </div>
    </div>
  );
}

