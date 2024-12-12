const hre = require("hardhat");
const fs = require('fs');

async function main() {
  // Read config file
  const configPath = 'safe-pkp-config.json';
  if (!fs.existsSync(configPath)) {
    console.error("❌ Configuration file not found!");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { safeAddress, pkpToolsAddress } = config;

  if (!safeAddress || !pkpToolsAddress) {
    console.error("❌ Required addresses not found in config!");
    process.exit(1);
  }

  console.log("🔄 Verifying PKPTools contract...");
  console.log({
    PKPTools: pkpToolsAddress,
    Safe: safeAddress
  });

  try {
    await hre.run("verify:verify", {
      address: pkpToolsAddress,
      constructorArguments: [safeAddress],
      contract: "contracts/PKPTools.sol:PKPTools"
    });
    console.log("✅ PKPTools contract verified successfully");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract is already verified");
    } else {
      console.error("❌ Error verifying contract:", error);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 