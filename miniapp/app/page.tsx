'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import WalletConnect from './components/WalletConnect';
import ClaimStatus from './components/ClaimStatus';
import MintButton from './components/MintButton';

export default function Home() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [condition, setCondition] = useState<any>(null);
  
  // Allowlists - in production, load from API/IPFS
  const [fandfFreeList, setFandfFreeList] = useState<Array<{ address: string; quantity: number }>>([]);
  const [fandfDiscountedList, setFandfDiscountedList] = useState<Array<{ address: string; quantity: number }>>([]);

  useEffect(() => {
    // Base MiniApp SDK - initialize on mount
    if (typeof window !== 'undefined') {
      // Dynamically import the SDK
      import('@farcaster/miniapp-sdk').then((sdk) => {
        // Signal that the MiniApp is ready
        if (sdk.actions?.ready) {
          sdk.actions.ready();
        }
      }).catch(() => {
        console.log('MiniApp SDK not available (running outside Farcaster)');
      });
    }
    
    // Load allowlists (in production, fetch from API)
    // For now, leave empty - proofs should be generated server-side
    setFandfFreeList([]);
    setFandfDiscountedList([]);
  }, []);

  function handleWalletConnect(address: string, prov: ethers.BrowserProvider) {
    setUserAddress(address);
    setProvider(prov);
    
    // Load claim condition for user
    loadClaimCondition(prov, address);
  }

  async function loadClaimCondition(prov: ethers.Provider, address: string) {
    try {
      const { getClaimConditionForUser } = await import('./lib/claimConditions');
      const claimCondition = await getClaimConditionForUser(
        prov,
        address,
        fandfFreeList,
        fandfDiscountedList
      );
      setCondition(claimCondition);
    } catch (error) {
      console.error('Error loading claim condition:', error);
    }
  }

  function handleMintSuccess() {
    // Reload claim condition after successful mint
    if (provider && userAddress) {
      loadClaimCondition(provider, userAddress);
    }
  }

  return (
    <main className="miniapp-container">
      <div className="miniapp-content">
        <h1>Base NFT Mint</h1>
        <p className="subtitle">Mint your NFT on Base</p>

        <div className="wallet-section">
          <WalletConnect onConnect={handleWalletConnect} />
        </div>

        {userAddress && provider && (
          <>
            <div className="claim-status-section">
              <ClaimStatus
                provider={provider}
                userAddress={userAddress}
                fandfFreeList={fandfFreeList}
                fandfDiscountedList={fandfDiscountedList}
              />
            </div>

            <div className="mint-section">
              <div className="quantity-selector">
                <label>
                  Quantity:
                  <input
                    type="number"
                    min="1"
                    max={condition?.quantityLimit === 0 ? 10 : condition?.quantityLimit || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="quantity-input"
                  />
                </label>
              </div>

              <MintButton
                provider={provider}
                userAddress={userAddress}
                condition={condition}
                quantity={quantity}
                onMintSuccess={handleMintSuccess}
                fandfFreeList={fandfFreeList}
                fandfDiscountedList={fandfDiscountedList}
              />
            </div>
          </>
        )}

        {!userAddress && (
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

        .connect-prompt {
          text-align: center;
          color: #666;
          padding: 2rem;
        }
      `}</style>
    </main>
  );
}

