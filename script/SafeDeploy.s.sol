// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Safe} from "../lib/safe-contracts/contracts/Safe.sol";
import {SafeProxyFactory} from "../lib/safe-contracts/contracts/proxies/SafeProxyFactory.sol";

contract SafeDeployScript is Script {
    Safe public safeSingleton;
    SafeProxyFactory public safeProxyFactory;
    Safe public safeProxy;

    function setUp() public {}

    function run() public returns (address) {
        vm.startBroadcast();

        // Deploy Safe singleton and factory
        safeSingleton = new Safe();
        safeProxyFactory = new SafeProxyFactory();

        // Deploy Safe proxy
        address[] memory owners = new address[](1);
        owners[0] = msg.sender;
        bytes memory initializer = abi.encodeWithSelector(
            Safe.setup.selector,
            owners,              // owners
            1,                   // threshold
            address(0),          // to
            bytes(""),           // data
            address(0),          // fallbackHandler
            address(0),          // paymentToken
            0,                   // payment
            address(0)           // paymentReceiver
        );
        
        address proxyAddress = address(safeProxyFactory.createProxyWithNonce(
            address(safeSingleton),
            initializer,
            block.timestamp
        ));

        vm.stopBroadcast();

        console.log("Safe deployed at:", proxyAddress);
        return proxyAddress;
    }
} 