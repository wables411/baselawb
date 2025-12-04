// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// Struct for allowlist proof (matches Thirdweb's IDrop.AllowlistProof)
struct AllowlistProof {
    bytes32[] proof;
    uint256 quantityLimitPerWallet;
    uint256 pricePerToken;
    address currency;
}

/**
 * @title NFTDiscountWrapper
 * @notice Wrapper contract that checks NFT ownership and enforces discount pricing
 *         before calling the underlying Thirdweb Drop contract
 */
contract NFTDiscountWrapper is Ownable {
    // The underlying Thirdweb Drop contract
    address public immutable dropContract;
    
    // Eligible NFT collection addresses
    address[] public eligibleCollections;
    
    // Pricing configuration
    uint256 public publicPrice;      // 0.005 ETH in wei
    uint256 public discountPrice;    // 0.002 ETH in wei
    uint256 public discountMaxClaimable; // Max NFTs NFT holders can claim
    
    // ERC721 interface for balanceOf check
    bytes4 private constant ERC721_INTERFACE_ID = 0x80ac58cd;
    
    event CollectionAdded(address indexed collection);
    event CollectionRemoved(address indexed collection);
    event PricesUpdated(uint256 publicPrice, uint256 discountPrice);
    
    constructor(
        address _dropContract,
        address[] memory _eligibleCollections,
        uint256 _publicPrice,
        uint256 _discountPrice,
        uint256 _discountMaxClaimable
    ) Ownable(msg.sender) {
        dropContract = _dropContract;
        eligibleCollections = _eligibleCollections;
        publicPrice = _publicPrice;
        discountPrice = _discountPrice;
        discountMaxClaimable = _discountMaxClaimable;
    }
    
    /**
     * @notice Check if a wallet holds any NFT from eligible collections
     */
    function holdsEligibleNFT(address wallet) public view returns (bool) {
        for (uint256 i = 0; i < eligibleCollections.length; i++) {
            try IERC721(eligibleCollections[i]).balanceOf(wallet) returns (uint256 balance) {
                if (balance > 0) {
                    return true;
                }
            } catch {
                // If contract doesn't support ERC721, skip it
                continue;
            }
        }
        return false;
    }
    
    /**
     * @notice Get the correct price for a wallet
     */
    function getPriceForWallet(address wallet) public view returns (uint256) {
        return holdsEligibleNFT(wallet) ? discountPrice : publicPrice;
    }
    
    /**
     * @notice Claim NFTs with automatic price enforcement
     * @param receiver The address to receive the NFTs
     * @param quantity The number of NFTs to claim
     */
    function claim(address receiver, uint256 quantity) external payable {
        address claimer = msg.sender;
        
        // Check if claimer holds eligible NFT
        bool isDiscountEligible = holdsEligibleNFT(claimer);
        uint256 requiredPrice = isDiscountEligible ? discountPrice : publicPrice;
        uint256 totalRequired = requiredPrice * quantity;
        
        // Verify correct payment
        require(msg.value >= totalRequired, "Insufficient payment");
        
        // For discount holders: we need to call with discount price
        // For public: call with public price
        // The Thirdweb contract will validate the price matches the active condition
        
        // Prepare allowlist proof struct (empty for public mint)
        bytes32[] memory emptyProof = new bytes32[](0);
        AllowlistProof memory proof = AllowlistProof({
            proof: emptyProof,
            quantityLimitPerWallet: isDiscountEligible ? discountMaxClaimable : uint256(0),
            pricePerToken: requiredPrice,
            currency: address(0)
        });
        
        // Call the underlying Thirdweb contract's claim function
        // We need to manually encode the tuple properly
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("claim(address,uint256,address,uint256,(bytes32[],uint256,uint256,address),bytes)")),
            receiver,
            quantity,
            address(0), // _currency (ETH)
            requiredPrice,
            proof,
            "" // _data
        );
        
        (bool success, ) = dropContract.call{value: totalRequired}(data);
        
        require(success, "Claim failed");
        
        // Refund excess payment
        if (msg.value > totalRequired) {
            payable(claimer).transfer(msg.value - totalRequired);
        }
    }
    
    /**
     * @notice Add an eligible NFT collection
     */
    function addEligibleCollection(address collection) external onlyOwner {
        require(collection != address(0), "Invalid address");
        eligibleCollections.push(collection);
        emit CollectionAdded(collection);
    }
    
    /**
     * @notice Remove an eligible NFT collection
     */
    function removeEligibleCollection(address collection) external onlyOwner {
        for (uint256 i = 0; i < eligibleCollections.length; i++) {
            if (eligibleCollections[i] == collection) {
                eligibleCollections[i] = eligibleCollections[eligibleCollections.length - 1];
                eligibleCollections.pop();
                emit CollectionRemoved(collection);
                break;
            }
        }
    }
    
    /**
     * @notice Update pricing
     */
    function updatePrices(uint256 _publicPrice, uint256 _discountPrice) external onlyOwner {
        publicPrice = _publicPrice;
        discountPrice = _discountPrice;
        emit PricesUpdated(_publicPrice, _discountPrice);
    }
    
    /**
     * @notice Get all eligible collections
     */
    function getEligibleCollections() external view returns (address[] memory) {
        return eligibleCollections;
    }
    
    /**
     * @notice Withdraw funds (in case of issues)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}

