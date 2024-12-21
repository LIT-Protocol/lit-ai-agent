// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {PKPTools} from "contracts/PKPTools.sol";
import {SafeDeployScript} from "./SafeDeploy.s.sol";

contract PKPToolsScript is Script {
    PKPTools public pkt;

    function setUp() public {}

    function run() public {
        address safeAddress = vm.envOr("SAFE_ADDRESS", address(0));
        
        // If SAFE_ADDRESS is not set, deploy a new Safe
        if (safeAddress == address(0)) {
            console.log("No SAFE_ADDRESS provided, deploying new Safe...");
            SafeDeployScript safeDeployer = new SafeDeployScript();
            safeAddress = safeDeployer.run();
        }

        console.log("Using Safe address:", safeAddress);

        vm.startBroadcast();
        pkt = new PKPTools(safeAddress);
        vm.stopBroadcast();

        console.log("PKPTools deployed at:", address(pkt));
    }
}
