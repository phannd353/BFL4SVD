// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {Test} from "forge-std/Test.sol";
import {
    FLRegistry,
    Model,
    ModelUpdate,
    ModelUpdateInput,
    TrainingJob,
    TrainingJobStatus,
    TrainingRound,
    TrainingRoundStatus
} from "../../contracts/FLRegistry.sol";

contract FLRegistryTest is Test {
    FLRegistry public registry;
    address public owner = address(this);
    address public clientOne = address(0xA11CE);
    address public clientTwo = address(0xB0B);
    string private constant INITIAL_MODEL_HASH = "genesis-hash";

    function setUp() public {
        registry = new FLRegistry();
        registry.addModel(INITIAL_MODEL_HASH);
    }

    function test_initialModelIsRegisteredAfterDeployment() public view {
        Model[] memory models = registry.getModels();

        assertEq(registry.owner(), owner);
        assertEq(models.length, 1);
        assertEq(models[0].owner, owner);
        assertEq(models[0].modelHash, INITIAL_MODEL_HASH);
        assertEq(registry.getModelUpdates().length, 0);
    }

    function test_createTrainingJobUsesDatabaseIdAndStartsFirstRound() public {
        uint256 jobId = registry.createTrainingJob("db-job-1", "Federated classifier", INITIAL_MODEL_HASH, 2);
        registry.startTrainingJob(jobId);

        uint256 firstUpdate = _submitUpdate(clientOne, jobId, 1, "client-one-round-one");
        uint256 secondUpdate = _submitUpdate(clientTwo, jobId, 1, "client-two-round-one");

        TrainingJob memory job = registry.getTrainingJob(jobId);
        TrainingRound memory trainingRound = registry.getTrainingRound(jobId, 1);
        ModelUpdate[] memory updates = registry.getTrainingRoundModelUpdates(jobId, 1);
        (bool exists, uint256 mappedJobId) = registry.getTrainingJobId("db-job-1");

        assertTrue(exists);
        assertEq(mappedJobId, jobId);
        assertEq(job.initialModelHash, INITIAL_MODEL_HASH);
        assertEq(job.finalModelHash, "");
        assertEq(job.currentRound, 0);
        assertEq(uint256(job.status), uint256(TrainingJobStatus.RUNNING));
        assertEq(trainingRound.jobId, jobId);
        assertEq(trainingRound.prevModelHash, INITIAL_MODEL_HASH);
        assertEq(uint256(trainingRound.status), uint256(TrainingRoundStatus.RUNNING));
        assertEq(trainingRound.modelUpdateCount, 2);
        assertEq(updates.length, 2);
        assertEq(updates[0].id, firstUpdate);
        assertEq(updates[0].trainingJobId, jobId);
        assertEq(updates[0].roundNumber, 1);
        assertEq(updates[0].client, clientOne);
        assertEq(updates[0].modelHash, "client-one-round-one");
        assertEq(updates[1].id, secondUpdate);
        assertEq(updates[1].client, clientTwo);
    }

    function test_createTrainingJobRetryIsIdempotentAndRejectsConflicts() public {
        uint256 jobId = registry.createTrainingJob("db-job-2", "job", INITIAL_MODEL_HASH, 2);
        assertEq(registry.createTrainingJob("db-job-2", "job", INITIAL_MODEL_HASH, 2), jobId);
        assertEq(registry.getTrainingJobs().length, 1);

        vm.expectRevert(bytes("Conflicting training job retry"));
        registry.createTrainingJob("db-job-2", "changed", INITIAL_MODEL_HASH, 2);
    }

    function test_clientCanSubmitOnlyOncePerRoundAndOnlyToActiveJob() public {
        uint256 jobId = _createJob(2);
        vm.expectRevert(bytes("Training job is not running"));
        _submitUpdate(clientOne, jobId, 1, "update");

        registry.startTrainingJob(jobId);
        _submitUpdate(clientOne, jobId, 1, "update");

        vm.expectRevert(bytes("Conflicting model update retry"));
        _submitUpdate(clientOne, jobId, 1, "duplicate");

        vm.expectRevert(bytes("Not the active training round"));
        _submitUpdate(clientTwo, jobId, 2, "wrong-round");
    }

    function test_ownerCanRetrySameClientUpdateIdempotently() public {
        uint256 jobId = _createJob(1);
        registry.startTrainingJob(jobId);
        ModelUpdateInput memory input = _updateInput("client-model");
        uint256 updateId = registry.recordModelUpdateForClient(clientOne, jobId, 1, input);
        assertEq(registry.recordModelUpdateForClient(clientOne, jobId, 1, input), updateId);
        assertEq(registry.getModelUpdates().length, 1);

        input.modelHash = "different-model";
        vm.expectRevert(bytes("Conflicting model update retry"));
        registry.recordModelUpdateForClient(clientOne, jobId, 1, input);
    }

    function test_completingRoundPersistsAggregateAndOpensNextRound() public {
        uint256 jobId = _createJob(2);
        registry.startTrainingJob(jobId);
        _submitUpdate(clientOne, jobId, 1, "client-model");
        vm.warp(1234);

        registry.completeTrainingRound(jobId, 1, "aggregate-round-one");

        TrainingJob memory job = registry.getTrainingJob(jobId);
        TrainingRound memory roundOne = registry.getTrainingRound(jobId, 1);
        TrainingRound memory roundTwo = registry.getTrainingRound(jobId, 2);
        Model[] memory models = registry.getModels();

        assertEq(job.currentRound, 1);
        assertEq(job.initialModelHash, INITIAL_MODEL_HASH);
        assertEq(job.finalModelHash, "aggregate-round-one");
        assertEq(uint256(job.status), uint256(TrainingJobStatus.RUNNING));
        assertEq(uint256(roundOne.status), uint256(TrainingRoundStatus.COMPLETED));
        assertEq(roundOne.prevModelHash, INITIAL_MODEL_HASH);
        assertEq(roundOne.aggregatedModelHash, "aggregate-round-one");
        assertEq(roundOne.completedAt, 1234);
        assertEq(uint256(roundTwo.status), uint256(TrainingRoundStatus.RUNNING));
        assertEq(roundTwo.modelUpdateCount, 0);
        assertEq(roundTwo.prevModelHash, "aggregate-round-one");
        assertEq(roundTwo.jobId, jobId);
        assertEq(models.length, 2);
        assertEq(models[1].modelHash, "aggregate-round-one");
    }

    function test_completedRoundRetryIsIdempotent() public {
        uint256 jobId = _createJob(2);
        registry.startTrainingJob(jobId);
        _submitUpdate(clientOne, jobId, 1, "client-model");
        registry.completeTrainingRound(jobId, 1, "aggregate-model");

        registry.completeTrainingRound(jobId, 1, "aggregate-model");
        assertEq(registry.getModels().length, 2);
        assertEq(registry.getTrainingRounds(jobId).length, 2);

        vm.expectRevert(bytes("Conflicting training round retry"));
        registry.completeTrainingRound(jobId, 1, "different-aggregate");
    }

    function test_finalRoundCompletesJobAndCannotAcceptMoreUpdates() public {
        uint256 jobId = _createJob(1);
        registry.startTrainingJob(jobId);
        _submitUpdate(clientOne, jobId, 1, "client-model");
        registry.completeTrainingRound(jobId, 1, "aggregate-model");

        TrainingJob memory job = registry.getTrainingJob(jobId);
        assertEq(job.currentRound, 1);
        assertEq(uint256(job.status), uint256(TrainingJobStatus.COMPLETED));
        assertGt(job.completedAt, 0);

        vm.expectRevert(bytes("Training job is not running"));
        _submitUpdate(clientTwo, jobId, 2, "late-update");
    }

    function test_pausedRoundResumesWithExistingUpdates() public {
        uint256 jobId = _createJob(2);
        registry.startTrainingJob(jobId);
        _submitUpdate(clientOne, jobId, 1, "before-pause");
        registry.stopTrainingJob(jobId);

        TrainingRound memory stoppedRound = registry.getTrainingRound(jobId, 1);
        assertEq(uint256(stoppedRound.status), uint256(TrainingRoundStatus.STOPPED));
        vm.expectRevert(bytes("Training job is not running"));
        _submitUpdate(clientTwo, jobId, 1, "while-stopped");

        registry.startTrainingJob(jobId);
        _submitUpdate(clientTwo, jobId, 1, "after-resume");
        assertEq(registry.getTrainingRound(jobId, 1).modelUpdateCount, 2);
    }

    function test_ownerControlsLifecycleAndInitialModelSetup() public {
        uint256 jobId = _createJob(2);
        vm.prank(clientOne);
        vm.expectRevert(bytes("Only owner can call this function"));
        registry.startTrainingJob(jobId);

        registry.startTrainingJob(jobId);
        _submitUpdate(clientOne, jobId, 1, "client-model");
        vm.prank(clientOne);
        vm.expectRevert(bytes("Only owner can call this function"));
        registry.completeTrainingRound(jobId, 1, "aggregate-model");

        vm.prank(clientOne);
        vm.expectRevert(bytes("Only owner can call this function"));
        registry.addModel("unauthorized-model");
    }

    function test_configurationCanChangeOnlyBeforeStarting() public {
        uint256 jobId = _createJob(2);
        registry.updateTrainingJob(jobId, "renamed", "replacement-model", 3);
        TrainingJob memory job = registry.getTrainingJob(jobId);
        assertEq(job.name, "renamed");
        assertEq(job.initialModelHash, "replacement-model");
        assertEq(job.plannedRounds, 3);
        assertEq(registry.getModels().length, 2);

        registry.startTrainingJob(jobId);
        vm.expectRevert(bytes("Training job configuration cannot be changed"));
        registry.updateTrainingJob(jobId, "later", "replacement-model", 3);
    }

    function test_invalidJobRoundAndPreviousModelAreRejected() public {
        vm.expectRevert(bytes("Invalid trainingJobId"));
        registry.getTrainingJob(0);

        vm.expectRevert(bytes("Invalid initialModelHash"));
        registry.createTrainingJob("db-job", "job", "", 1);

        uint256 jobId = _createJob(1);
        registry.startTrainingJob(jobId);
        vm.prank(clientOne);
        vm.expectRevert(bytes("Invalid prevModelHash"));
        registry.submitModelUpdate(
            jobId,
            1,
            ModelUpdateInput({
                modelHash: "client-model",
                score: 1,
                epoch: 1,
                learningRate: 1,
                batchSize: 32,
                prevModelHash: "wrong-model",
                accuracy: 90
            })
        );

        vm.expectRevert(bytes("Training round has no model updates"));
        registry.completeTrainingRound(jobId, 1, "aggregate-model");
    }

    function _createJob(uint256 plannedRounds) private returns (uint256) {
        return registry.createTrainingJob("db-job", "job", INITIAL_MODEL_HASH, plannedRounds);
    }

    function _submitUpdate(address client, uint256 jobId, uint256 roundNumber, string memory modelHash)
        private
        returns (uint256 updateId)
    {
        vm.prank(client);
        updateId = registry.submitModelUpdate(jobId, roundNumber, _updateInput(modelHash));
    }

    function _updateInput(string memory modelHash) private pure returns (ModelUpdateInput memory) {
        return ModelUpdateInput({
            modelHash: modelHash,
            score: 80,
            epoch: 3,
            learningRate: 1,
            batchSize: 32,
            prevModelHash: INITIAL_MODEL_HASH,
            accuracy: 90
        });
    }
}
