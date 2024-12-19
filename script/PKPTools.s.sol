// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {PKPTools} from "../contracts/PKPTools.sol";

contract PKPToolsScript is Script {
    PKPTools public pkt;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        pkt = new PKPTools();

        vm.stopBroadcast();
    }
}
