// SPDX-License-Identifier: UNLICENSE
pragma solidity 0.8.37;

import {Script} from 'forge-std/Script.sol';
import {FLRegistry} from '../contracts/FLRegistry.sol';

contract FLRegistryScript is Script {
    function run() external returns (FLRegistry) {
        vm.startBroadcast();
        FLRegistry registry = new FLRegistry('0x0', 0, 0, 0, 0, 0);
        vm.stopBroadcast();

        return registry;
    }
}
