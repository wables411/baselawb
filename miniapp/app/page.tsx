'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import ClaimStatus from './components/ClaimStatus';
import MintTransactionButton from './components/MintTransactionButton';
import { createMintCalls } from './lib/calls';
import { getClaimConditionForUser } from './lib/claimConditions';
import { createPublicClient, http } from 'viem';
import { base } from 'wagmi/chains';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [quantity, setQuantity] = useState<number>(1);
  const [condition, setCondition] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Allowlists - in production, load from API/IPFS
  const [fandfFreeList, setFandfFreeList] = useState<Array<{ address: string; quantity: number }>>([]);
  const [fandfDiscountedList, setFandfDiscountedList] = useState<Array<{ address: string; quantity: number }>>([]);

  // Create public client for reading contract state
  // Use environment variable RPC URL or fallback to public endpoint
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl, {
      retryCount: 3,
      retryDelay: 1000,
    }),
  });

  useEffect(() => {
    // Base MiniApp SDK - initialize on mount
    if (typeof window !== 'undefined') {
      import('@farcaster/miniapp-sdk').then((sdk: any) => {
        if (sdk?.actions?.ready) {
          sdk.actions.ready();
        }
      }).catch(() => {
        console.log('MiniApp SDK not available (running outside Farcaster)');
      });
    }
    
    // Load allowlists (in production, fetch from API)
    setFandfFreeList([]);
    setFandfDiscountedList([]);
  }, []);

  useEffect(() => {
    // Load claim condition when wallet connects
    if (isConnected && address) {
      loadClaimCondition(address);
    }
  }, [isConnected, address]);

  async function loadClaimCondition(userAddress: string) {
    setLoading(true);
    try {
      const claimCondition = await getClaimConditionForUser(
        publicClient as any,
        userAddress,
        fandfFreeList,
        fandfDiscountedList
      );
      setCondition(claimCondition);
    } catch (error) {
      console.error('Error loading claim condition:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleTransactionSuccess() {
    // Reload claim condition after successful mint
    if (address) {
      loadClaimCondition(address);
    }
  }

  // Prepare transaction calls for OnchainKit
  const calls = condition && address ? createMintCalls({
    userAddress: address,
    quantity,
    condition,
    fandfFreeList,
    fandfDiscountedList,
  }) : [];

  const totalPrice = condition ? parseFloat(condition.price) * quantity : 0;

  return (
    <main className="miniapp-container">
      <div className="miniapp-content">
        <h1>Base NFT Mint</h1>
        <p className="subtitle">Mint your NFT on Base</p>

        <div className="wallet-section">
          <ConnectButton />
        </div>

        {isConnected && address && (
          <>
            {loading ? (
              <div className="loading">Loading claim status...</div>
            ) : (
              <>
                <div className="claim-status-section">
                  <ClaimStatus
                    provider={publicClient as any}
                    userAddress={address}
                    fandfFreeList={fandfFreeList}
                    fandfDiscountedList={fandfDiscountedList}
                  />
                </div>

                {condition && (
                  <div className="mint-section">
                    <div className="quantity-selector">
                      <label>
                        Quantity:
                        <input
                          type="number"
                          min="1"
                          max={condition.quantityLimit === 0 ? 10 : condition.quantityLimit || 1}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="quantity-input"
                        />
                      </label>
                    </div>

                    <MintTransactionButton
                      calls={calls}
                      onSuccess={handleTransactionSuccess}
                      disabled={!condition || quantity <= 0 || calls.length === 0}
                    />

                    {condition && (
                      <div className="mint-price">
                        Total: {totalPrice.toFixed(6)} ETH
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!isConnected && (
          <div className="connect-prompt">
            <p>Connect your wallet to start minting</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .miniapp-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .miniapp-content {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 2rem;
        }

        .wallet-section {
          margin-bottom: 2rem;
        }

        .claim-status-section {
          margin-bottom: 2rem;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .mint-section {
          margin-top: 2rem;
        }

        .quantity-selector {
          margin-bottom: 1rem;
        }

        .quantity-input {
          margin-left: 0.5rem;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          width: 80px;
        }

        .mint-price {
          text-align: center;
          font-size: 1.1rem;
          font-weight: bold;
          color: #333;
          margin-top: 0.5rem;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        .connect-prompt {
          text-align: center;
          color: #666;
          padding: 2rem;
        }
      `}</style>
    </main>
  );
}
