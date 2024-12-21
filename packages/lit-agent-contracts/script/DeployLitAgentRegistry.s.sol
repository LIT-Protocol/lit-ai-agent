// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "contracts/LitAgentRegistry.sol";

contract DeployLitAgentRegistry is Script {
    function run() external {
        // Get private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("FORGE_DEPLOYER_PRIVATE_KEY");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the registry
        LitAgentRegistry registry = new LitAgentRegistry();

        // Stop broadcasting transactions
        vm.stopBroadcast();

        // Log the deployment
        console.log("LitAgentRegistry deployed to:", address(registry));
    }
}
