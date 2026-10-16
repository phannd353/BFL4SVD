// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from 'forge-std/Test.sol';
import {FLRegistry, Model, ModelUpdate} from '../../contracts/FLRegistry.sol';

contract FLRegistryTest is Test {
    FLRegistry public registry;
    address public owner = address(this);

    function setUp() public {
        registry = _deployRegistry();
    }

    function test_constructorCreatesGenesisModelAndUpdate() public view {
        Model[] memory models = registry.getModels();
        ModelUpdate[] memory updates = registry.getModelUpdates();

        assertEq(registry.owner(), owner);
        assertEq(registry.round(), 1);
        assertEq(registry.updatesPerRound(), 10);
        assertEq(models.length, 1);
        assertEq(updates.length, 1);

        assertEq(models[0].id, 0);
        assertEq(models[0].upadteId, 0);
        assertEq(models[0].owner, owner);
        assertEq(models[0].modelHash, 'genesis-hash');

        assertEq(updates[0].id, 0);
        assertEq(updates[0].owner, owner);
        assertEq(updates[0].score, 10);
        assertEq(updates[0].modelHash, 'genesis-hash');
        assertEq(updates[0].epoch, 1);
        assertEq(updates[0].learningRate, 2);
        assertEq(updates[0].batchSize, 32);
        assertEq(updates[0].prevModelId, 0);
        assertEq(updates[0].accuracy, 80);
    }

    function test_uploadModelUpdateStoresAllFieldsAndReturnsId() public {
        vm.warp(1234);
        uint256 updateId = registry.uploadModelUpdate(
            'update-hash',
            20,
            3,
            5,
            64,
            0,
            91
        );

        assertEq(updateId, 1);
        ModelUpdate[] memory updates = registry.getModelUpdates();
        assertEq(updates.length, 2);
        assertEq(updates[1].id, updateId);
        assertEq(updates[1].owner, owner);
        assertEq(updates[1].score, 20);
        assertEq(updates[1].modelHash, 'update-hash');
        assertEq(updates[1].epoch, 3);
        assertEq(updates[1].learningRate, 5);
        assertEq(updates[1].batchSize, 64);
        assertEq(updates[1].prevModelId, 0);
        assertEq(updates[1].accuracy, 91);
        assertEq(updates[1].timestamp, 1234);
        assertEq(registry.round(), 1);
        assertEq(registry.getModels().length, 1);
    }

    function test_uploadModelUpdateEmitsEvent() public {
        vm.warp(1234);
        vm.expectEmit(false, false, false, true, address(registry));
        emit FLRegistry.ModelUpdateAdded(
            1,
            owner,
            20,
            'update-hash',
            3,
            5,
            64,
            0,
            91,
            1234
        );

        registry.uploadModelUpdate('update-hash', 20, 3, 5, 64, 0, 91);
    }

    function test_uploadModelUpdateRejectsNonOwner() public {
        address other = address(0xBEEF);
        vm.prank(other);
        vm.expectRevert(bytes('Only owner can call this function'));
        registry.uploadModelUpdate('update-hash', 20, 3, 5, 64, 0, 91);
    }

    function test_uploadModelUpdateRejectsUnknownPreviousUpdate() public {
        vm.expectRevert(bytes('Invalid prevModelId'));
        registry.uploadModelUpdate('update-hash', 20, 3, 5, 64, 1, 91);
    }

    function test_getRoundHighestScoredUpdateReturnsHighestUpdate() public {
        for (uint256 i = 1; i <= 8; i++) {
            registry.uploadModelUpdate(
                string.concat('update-', vm.toString(i)),
                i,
                1,
                1,
                16,
                0,
                70
            );
        }
        registry.uploadModelUpdate('highest-score', 25, 2, 2, 32, 0, 90);

        ModelUpdate memory highest = registry.getRoundHighestScoredUpdate(1);
        assertEq(highest.id, 9);
        assertEq(highest.score, 25);
        assertEq(highest.modelHash, 'highest-score');
    }

    function test_completingRoundAddsHighestScoredModelAndEmitsEvents() public {
        for (uint256 i = 1; i <= 8; i++) {
            registry.uploadModelUpdate(
                string.concat('update-', vm.toString(i)),
                i,
                1,
                1,
                32,
                0,
                80
            );
        }

        vm.warp(5678);
        vm.expectEmit(false, false, false, true, address(registry));
        emit FLRegistry.ModelUpdateAdded(
            9,
            owner,
            100,
            'round-winner',
            4,
            3,
            128,
            0,
            99,
            5678
        );
        vm.expectEmit(false, false, false, true, address(registry));
        emit FLRegistry.ModelAdded(1, 9, owner, 'round-winner', 5678);
        vm.expectEmit(false, false, false, true, address(registry));
        emit FLRegistry.RoundEnded(2, 5678);

        registry.uploadModelUpdate('round-winner', 100, 4, 3, 128, 0, 99);

        assertEq(registry.round(), 2);
        Model[] memory models = registry.getModels();
        assertEq(models.length, 2);
        assertEq(models[1].id, 1);
        assertEq(models[1].upadteId, 9);
        assertEq(models[1].owner, owner);
        assertEq(models[1].modelHash, 'round-winner');
        assertEq(models[1].timestamp, 5678);

        Model memory latest = registry.getLatestModel();
        assertEq(latest.id, 1);
        assertEq(latest.upadteId, 9);
        assertEq(latest.modelHash, 'round-winner');
    }

    function _deployRegistry() private returns (FLRegistry) {
        return new FLRegistry('genesis-hash', 10, 1, 2, 32, 80);
    }
}
