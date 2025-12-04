const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying NFTDiscountWrapper...\n");

  // Configuration - UPDATE THESE VALUES
  const DROP_CONTRACT = "0x13c33121f8a73e22ac6aa4a135132f5ac7f221b2"; // Your Thirdweb contract
  const ELIGIBLE_COLLECTIONS = [
    // Add your NFT collection addresses here
    // "0xYourNFTCollectionAddress1",
    // "0xYourNFTCollectionAddress2",
  ];
  const PUBLIC_PRICE = ethers.parseEther("0.005"); // 0.005 ETH
  const DISCOUNT_PRICE = ethers.parseEther("0.002"); // 0.002 ETH
  const DISCOUNT_MAX_CLAIMABLE = 15; // Max NFTs discount holders can claim

  if (ELIGIBLE_COLLECTIONS.length === 0) {
    console.error("❌ Please add at least one eligible NFT collection address");
    process.exit(1);
  }

  console.log("Configuration:");
  console.log(`  Drop Contract: ${DROP_CONTRACT}`);
  console.log(`  Eligible Collections: ${ELIGIBLE_COLLECTIONS.length}`);
  ELIGIBLE_COLLECTIONS.forEach((addr, i) => {
    console.log(`    ${i + 1}. ${addr}`);
  });
  console.log(`  Public Price: ${ethers.formatEther(PUBLIC_PRICE)} ETH`);
  console.log(`  Discount Price: ${ethers.formatEther(DISCOUNT_PRICE)} ETH`);
  console.log(`  Discount Max Claimable: ${DISCOUNT_MAX_CLAIMABLE}\n`);

  // Deploy the wrapper contract
  const NFTDiscountWrapper = await ethers.getContractFactory("NFTDiscountWrapper");
  const wrapper = await NFTDiscountWrapper.deploy(
    DROP_CONTRACT,
    ELIGIBLE_COLLECTIONS,
    PUBLIC_PRICE,
    DISCOUNT_PRICE,
    DISCOUNT_MAX_CLAIMABLE
  );

  await wrapper.waitForDeployment();
  const wrapperAddress = await wrapper.getAddress();

  console.log("✅ Wrapper deployed!");
  console.log(`   Address: ${wrapperAddress}`);
  console.log(`   Transaction: ${wrapper.deploymentTransaction().hash}\n`);

  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await wrapper.deploymentTransaction().wait(5);

  console.log("\n📝 Next steps:");
  console.log("1. Update your frontend to use the wrapper contract address");
  console.log("2. Update CONTRACT_ADDRESS in your .env to:", wrapperAddress);
  console.log("3. Test the claim function with a wallet that holds an eligible NFT");
  console.log("4. Test with a wallet that doesn't hold any NFTs\n");

  // Verify on Basescan (optional)
  if (process.env.BASESCAN_API_KEY) {
    console.log("🔍 Verifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: wrapperAddress,
        constructorArguments: [
          DROP_CONTRACT,
          ELIGIBLE_COLLECTIONS,
          PUBLIC_PRICE,
          DISCOUNT_PRICE,
          DISCOUNT_MAX_CLAIMABLE,
        ],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


