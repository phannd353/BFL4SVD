// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from 'forge-std/Test.sol';
import {FLRegistry, Model} from '../../contracts/FLRegistry.sol';

contract FLRegistryTest is Test {
    FLRegistry public registry;

    function setUp() public {
        registry = new FLRegistry('0x0', 0, 0, 0, 0, 0);
    }

    function test_getModels() public view {
        Model[] memory models = registry.getModels();
        assertEq(models.length, 1);
    }

    function test_owner() public view {
        assertEq(registry.owner(), address(this));
    }
}
