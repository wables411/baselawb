// Contract configuration
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x13c33121f8a73e22ac6aa4a135132f5ac7f221b2';

export const CONTRACT_ABI = [
  'function claim(address _receiver, uint256 _quantity, address _currency, uint256 _pricePerToken, tuple(bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) payable',
  'function getActiveClaimConditionId() view returns (uint256)',
  'function getClaimConditionById(uint256 _conditionId) view returns (tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata))',
  'function getSupplyClaimedByWallet(uint256 _conditionId, address _claimer) view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function maxTotalSupply() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
] as const;

// Claim condition IDs (order matters - matches setClaimConditions order)
export const CLAIM_CONDITION_IDS = {
  PUBLIC: 0,
  FANDF_FREE: 1,
  FANDF_DISCOUNTED: 2,
} as const;

