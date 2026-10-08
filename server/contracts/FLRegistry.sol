// SPDX-License-Identifier: UNLICENSE
pragma solidity 0.8.37;

contract FLRegistry {
    struct Model {
        uint256 id;
        uint256 upadteId;
        address owner;
        string modelHash;
        uint256 timestamp;
    }

    struct ModelUpdate {
        uint256 id;
        address owner;
        uint256 score;
        string modelHash;
        uint256 epoch;
        uint256 learningRate;
        uint256 batchSize;
        uint256 prevModelId;
        uint256 accuracy;
        uint256 timestamp;
    }

    Model[] public models;
    ModelUpdate[] public modelUpdates;

    address public owner;
    uint256 public round = 1;
    uint256 public updatesPerRound = 10;

    // Constructor
    constructor(
        string memory modelHash,
        uint256 score,
        uint256 epoch,
        uint256 learningRate,
        uint256 batchSize,
        uint256 accuracy
    ) {
        owner = msg.sender;

        modelUpdates.push(
            ModelUpdate({
                id: 0,
                owner: owner,
                score: score,
                modelHash: modelHash,
                epoch: epoch,
                learningRate: learningRate,
                batchSize: batchSize,
                prevModelId: 0,
                accuracy: accuracy,
                timestamp: block.timestamp
            })
        );
        emit ModelUpdateAdded(
            0,
            owner,
            score,
            modelHash,
            epoch,
            learningRate,
            batchSize,
            0,
            accuracy,
            block.timestamp
        );

        models.push(Model(0, 0, owner, modelHash, block.timestamp));
        emit ModelAdded(0, 0, owner, modelHash, block.timestamp);
    }

    // Events
    event ModelAdded(
        uint256 id,
        uint256 updateId,
        address owner,
        string modelHash,
        uint256 timestamp
    );
    event ModelUpdateAdded(
        uint256 id,
        address owner,
        uint256 score,
        string modelHash,
        uint256 epoch,
        uint256 learningRate,
        uint256 batchSize,
        uint256 prevModelId,
        uint256 accuracy,
        uint256 timestamp
    );
    event RoundEnded(uint256 round, uint256 timestamp);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, 'Only owner can call this function');
        _;
    }

    // External functions
    function uploadModelUpdate(
        string memory modelHash,
        uint256 score,
        uint256 epoch,
        uint256 learningRate,
        uint256 batchSize,
        uint256 prevModelId,
        uint256 accuracy
    ) external onlyOwner returns (uint256) {
        require(prevModelId < modelUpdates.length, 'Invalid prevModelId');
        require(
            modelUpdates[prevModelId].owner == owner,
            'Invalid prevModelId'
        );

        uint256 modelId = modelUpdates.length;

        modelUpdates.push(
            ModelUpdate({
                id: modelId,
                owner: owner,
                score: score,
                modelHash: modelHash,
                epoch: epoch,
                learningRate: learningRate,
                batchSize: batchSize,
                prevModelId: prevModelId,
                accuracy: accuracy,
                timestamp: block.timestamp
            })
        );
        emit ModelUpdateAdded(
            modelId,
            owner,
            score,
            modelHash,
            epoch,
            learningRate,
            batchSize,
            prevModelId,
            accuracy,
            block.timestamp
        );

        if (modelUpdates.length % updatesPerRound == 0) {
            endRound();
        }

        return modelId;
    }

    function getLatestModel() external view returns (Model memory) {
        return models[round - 1];
    }

    // Public functions
    function getRoundHighestScoredUpdate(
        uint256 _round
    ) public view returns (ModelUpdate memory) {
        uint256 start = (_round - 1) * updatesPerRound;
        uint256 end = _round * updatesPerRound;
        ModelUpdate memory highestScoredUpdate = modelUpdates[start];

        for (uint256 i = start; i < end; i++) {
            if (modelUpdates[i].score > highestScoredUpdate.score) {
                highestScoredUpdate = modelUpdates[i];
            }
        }

        return highestScoredUpdate;
    }

    function getModels() public view returns (Model[] memory) {
        return models;
    }

    function getModelUpdates() public view returns (ModelUpdate[] memory) {
        return modelUpdates;
    }

    // Internal functions

    // Private functions
    function addModel(uint256 updateId) private {
        require(
            (updateId >= (round - 1) * updatesPerRound) &&
                (updateId < round * updatesPerRound),
            'Invalid updateId'
        );

        ModelUpdate memory modelUpdate = modelUpdates[updateId];

        models.push(
            Model(
                round,
                updateId,
                modelUpdate.owner,
                modelUpdate.modelHash,
                block.timestamp
            )
        );
        emit ModelAdded(
            round,
            updateId,
            modelUpdate.owner,
            modelUpdate.modelHash,
            block.timestamp
        );
    }

    function endRound() private {
        ModelUpdate memory highestScoredUpdate = getRoundHighestScoredUpdate(
            round
        );
        addModel(highestScoredUpdate.id);

        round++;
        emit RoundEnded(round, block.timestamp);
    }
}
