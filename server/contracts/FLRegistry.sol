// SPDX-License-Identifier: UNLICENSE
pragma solidity 0.8.37;

struct Model {
    address owner;
    string modelHash;
    uint256 timestamp;
}

enum TrainingJobStatus {
    CREATED,
    RUNNING,
    STOPPED,
    COMPLETED,
    CANCELLED
}

enum TrainingRoundStatus {
    RUNNING,
    STOPPED,
    COMPLETED
}

struct TrainingJob {
    uint256 id;
    address owner;
    string name;
    string initialModelHash;
    string finalModelHash;
    uint256 plannedRounds;
    uint256 currentRound;
    TrainingJobStatus status;
    uint256 createdAt;
    uint256 startedAt;
    uint256 completedAt;
}

struct TrainingRound {
    uint256 jobId;
    uint256 roundNumber;
    TrainingRoundStatus status;
    uint256 modelUpdateCount;
    string prevModelHash;
    string aggregatedModelHash;
    uint256 startedAt;
    uint256 completedAt;
}

struct ModelUpdate {
    uint256 id;
    uint256 trainingJobId;
    uint256 roundNumber;
    address client;
    uint256 score;
    string modelHash;
    uint256 epoch;
    uint256 learningRate;
    uint256 batchSize;
    string prevModelHash;
    uint256 accuracy;
    uint256 timestamp;
}

struct ModelUpdateInput {
    string modelHash;
    uint256 score;
    uint256 epoch;
    uint256 learningRate;
    uint256 batchSize;
    string prevModelHash;
    uint256 accuracy;
}

contract FLRegistry {
    Model[] private models;
    ModelUpdate[] private modelUpdates;
    TrainingJob[] private trainingJobs;
    mapping(uint256 => TrainingRound[]) private trainingRounds;
    mapping(uint256 => mapping(uint256 => uint256[])) private trainingRoundModelUpdateIds;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) private hasClientSubmittedUpdate;
    mapping(bytes32 => uint256) private trainingJobIdByDatabaseIdPlusOne;
    mapping(bytes32 => uint256) private modelIdByHashPlusOne;
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) private modelUpdateIdByClientPlusOne;

    address public owner;

    event ModelAdded(address owner, string modelHash, uint256 timestamp);
    event ModelUpdateAdded(
        uint256 indexed id,
        uint256 indexed trainingJobId,
        uint256 indexed roundNumber,
        address client,
        uint256 score,
        string modelHash,
        uint256 accuracy,
        uint256 timestamp
    );
    event TrainingJobCreated(
        uint256 indexed jobId, address indexed jobOwner, string name, uint256 plannedRounds, uint256 timestamp
    );
    event TrainingJobUpdated(
        uint256 indexed jobId, string name, string initialModelHash, uint256 plannedRounds, uint256 timestamp
    );
    event TrainingJobStatusChanged(uint256 indexed jobId, TrainingJobStatus status, uint256 timestamp);
    event TrainingRoundStarted(uint256 indexed jobId, uint256 indexed roundNumber, uint256 timestamp);
    event TrainingRoundCompleted(
        uint256 indexed jobId,
        uint256 indexed roundNumber,
        string modelHash,
        uint256 modelUpdateCount,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addModel(string calldata modelHash) external onlyOwner returns (uint256) {
        return _addModel(msg.sender, modelHash);
    }

    function createTrainingJob(
        string calldata databaseJobId,
        string calldata name,
        string calldata initialModelHash,
        uint256 plannedRounds
    ) external onlyOwner returns (uint256 jobId) {
        require(bytes(databaseJobId).length > 0, "Database job ID is required");
        require(bytes(name).length > 0, "Training job name is required");
        require(plannedRounds > 0, "Planned rounds must be positive");
        require(bytes(initialModelHash).length > 0, "Invalid initialModelHash");

        bytes32 databaseJobKey = keccak256(bytes(databaseJobId));
        uint256 existingIdPlusOne = trainingJobIdByDatabaseIdPlusOne[databaseJobKey];
        if (existingIdPlusOne != 0) {
            TrainingJob storage existingJob = trainingJobs[existingIdPlusOne - 1];
            require(
                keccak256(bytes(existingJob.name)) == keccak256(bytes(name))
                    && keccak256(bytes(existingJob.initialModelHash)) == keccak256(bytes(initialModelHash))
                    && existingJob.plannedRounds == plannedRounds,
                "Conflicting training job retry"
            );
            return existingJob.id;
        }

        _addModel(msg.sender, initialModelHash);
        jobId = trainingJobs.length;
        trainingJobIdByDatabaseIdPlusOne[databaseJobKey] = jobId + 1;
        trainingJobs.push(
            TrainingJob({
                id: jobId,
                owner: msg.sender,
                name: name,
                initialModelHash: initialModelHash,
                finalModelHash: "",
                plannedRounds: plannedRounds,
                currentRound: 0,
                status: TrainingJobStatus.CREATED,
                createdAt: block.timestamp,
                startedAt: 0,
                completedAt: 0
            })
        );
        emit TrainingJobCreated(jobId, msg.sender, name, plannedRounds, block.timestamp);
    }

    function getTrainingJobId(string calldata databaseJobId) external view returns (bool exists, uint256 jobId) {
        uint256 idPlusOne = trainingJobIdByDatabaseIdPlusOne[keccak256(bytes(databaseJobId))];
        if (idPlusOne == 0) return (false, 0);
        return (true, idPlusOne - 1);
    }

    function updateTrainingJob(
        uint256 jobId,
        string calldata name,
        string calldata initialModelHash,
        uint256 plannedRounds
    ) external onlyOwner {
        TrainingJob storage job = _getTrainingJob(jobId);
        require(
            job.status == TrainingJobStatus.CREATED && job.currentRound == 0,
            "Training job configuration cannot be changed"
        );
        require(bytes(name).length > 0, "Training job name is required");
        require(bytes(initialModelHash).length > 0, "Invalid initialModelHash");
        require(plannedRounds > 0, "Planned rounds must be positive");

        _addModel(msg.sender, initialModelHash);
        job.name = name;
        job.initialModelHash = initialModelHash;
        job.plannedRounds = plannedRounds;
        emit TrainingJobUpdated(jobId, name, initialModelHash, plannedRounds, block.timestamp);
    }

    function startTrainingJob(uint256 jobId) external onlyOwner {
        TrainingJob storage job = _getTrainingJob(jobId);
        if (job.status == TrainingJobStatus.RUNNING) {
            return;
        }
        require(
            job.status == TrainingJobStatus.CREATED || job.status == TrainingJobStatus.STOPPED,
            "Training job cannot be started"
        );

        if (job.startedAt == 0) {
            job.startedAt = block.timestamp;
        }
        job.status = TrainingJobStatus.RUNNING;

        uint256 nextRoundNumber = job.currentRound + 1;
        if (trainingRounds[jobId].length < nextRoundNumber) {
            string memory previousModelHash = job.currentRound == 0 ? job.initialModelHash : job.finalModelHash;
            _createRound(jobId, nextRoundNumber, previousModelHash);
        } else {
            TrainingRound storage currentRound = trainingRounds[jobId][nextRoundNumber - 1];
            require(currentRound.status == TrainingRoundStatus.STOPPED, "Training round cannot be started");
            currentRound.status = TrainingRoundStatus.RUNNING;
            emit TrainingRoundStarted(jobId, nextRoundNumber, block.timestamp);
        }
        emit TrainingJobStatusChanged(jobId, job.status, block.timestamp);
    }

    function stopTrainingJob(uint256 jobId) external onlyOwner {
        TrainingJob storage job = _getTrainingJob(jobId);
        if (job.status == TrainingJobStatus.STOPPED) {
            return;
        }
        require(job.status == TrainingJobStatus.RUNNING, "Training job is not running");

        job.status = TrainingJobStatus.STOPPED;
        TrainingRound storage currentRound = _getCurrentRound(job);
        currentRound.status = TrainingRoundStatus.STOPPED;
        emit TrainingJobStatusChanged(jobId, job.status, block.timestamp);
    }

    function cancelTrainingJob(uint256 jobId) external onlyOwner {
        TrainingJob storage job = _getTrainingJob(jobId);
        if (job.status == TrainingJobStatus.CANCELLED) {
            return;
        }
        require(
            job.status == TrainingJobStatus.CREATED || job.status == TrainingJobStatus.STOPPED,
            "Training job cannot be cancelled"
        );

        job.status = TrainingJobStatus.CANCELLED;
        emit TrainingJobStatusChanged(jobId, job.status, block.timestamp);
    }

    function submitModelUpdate(uint256 jobId, uint256 roundNumber, ModelUpdateInput calldata input)
        external
        returns (uint256)
    {
        return _submitModelUpdate(msg.sender, jobId, roundNumber, input);
    }

    function recordModelUpdateForClient(
        address client,
        uint256 jobId,
        uint256 roundNumber,
        ModelUpdateInput calldata input
    ) external onlyOwner returns (uint256) {
        return _submitModelUpdate(client, jobId, roundNumber, input);
    }

    function _submitModelUpdate(address client, uint256 jobId, uint256 roundNumber, ModelUpdateInput calldata input)
        private
        returns (uint256 updateId)
    {
        require(client != address(0), "Client address is required");
        uint256 existingIdPlusOne = modelUpdateIdByClientPlusOne[jobId][roundNumber][client];
        if (existingIdPlusOne != 0) {
            ModelUpdate storage existingUpdate = modelUpdates[existingIdPlusOne - 1];
            require(
                keccak256(bytes(existingUpdate.modelHash)) == keccak256(bytes(input.modelHash))
                    && existingUpdate.score == input.score && existingUpdate.epoch == input.epoch
                    && existingUpdate.learningRate == input.learningRate && existingUpdate.batchSize == input.batchSize
                    && keccak256(bytes(existingUpdate.prevModelHash)) == keccak256(bytes(input.prevModelHash))
                    && existingUpdate.accuracy == input.accuracy,
                "Conflicting model update retry"
            );
            return existingUpdate.id;
        }

        TrainingJob storage job = _getTrainingJob(jobId);
        require(job.status == TrainingJobStatus.RUNNING, "Training job is not running");
        require(roundNumber == job.currentRound + 1, "Not the active training round");
        TrainingRound storage trainingRound = _getCurrentRound(job);
        require(trainingRound.status == TrainingRoundStatus.RUNNING, "Training round is not running");
        require(
            keccak256(bytes(input.prevModelHash)) == keccak256(bytes(trainingRound.prevModelHash)),
            "Invalid prevModelHash"
        );
        require(bytes(input.modelHash).length > 0, "Model hash is required");

        require(!hasClientSubmittedUpdate[jobId][roundNumber][client], "Client already submitted an update");

        updateId = modelUpdates.length;
        modelUpdates.push();
        ModelUpdate storage update = modelUpdates[updateId];
        update.id = updateId;
        update.trainingJobId = jobId;
        update.roundNumber = roundNumber;
        update.client = client;
        update.score = input.score;
        update.modelHash = input.modelHash;
        update.epoch = input.epoch;
        update.learningRate = input.learningRate;
        update.batchSize = input.batchSize;
        update.prevModelHash = input.prevModelHash;
        update.accuracy = input.accuracy;
        update.timestamp = block.timestamp;
        trainingRoundModelUpdateIds[jobId][roundNumber].push(updateId);
        trainingRound.modelUpdateCount++;
        hasClientSubmittedUpdate[jobId][roundNumber][client] = true;
        modelUpdateIdByClientPlusOne[jobId][roundNumber][client] = updateId + 1;

        emit ModelUpdateAdded(
            updateId, jobId, roundNumber, client, input.score, input.modelHash, input.accuracy, block.timestamp
        );
    }

    function completeTrainingRound(uint256 jobId, uint256 roundNumber, string calldata aggregatedModelHash)
        external
        onlyOwner
    {
        TrainingJob storage job = _getTrainingJob(jobId);
        if (roundNumber > 0 && roundNumber <= job.currentRound) {
            TrainingRound storage priorRound = trainingRounds[jobId][roundNumber - 1];
            require(
                priorRound.status == TrainingRoundStatus.COMPLETED
                    && keccak256(bytes(priorRound.aggregatedModelHash)) == keccak256(bytes(aggregatedModelHash)),
                "Conflicting training round retry"
            );
            return;
        }
        require(job.status == TrainingJobStatus.RUNNING, "Training job is not running");
        require(roundNumber == job.currentRound + 1, "Not the active training round");
        TrainingRound storage trainingRound = _getCurrentRound(job);
        require(trainingRound.status == TrainingRoundStatus.RUNNING, "Training round is not running");
        require(trainingRound.modelUpdateCount > 0, "Training round has no model updates");
        require(bytes(aggregatedModelHash).length > 0, "Aggregated model hash is required");

        trainingRound.status = TrainingRoundStatus.COMPLETED;
        trainingRound.completedAt = block.timestamp;
        job.currentRound = roundNumber;
        trainingRound.aggregatedModelHash = aggregatedModelHash;
        job.finalModelHash = aggregatedModelHash;
        _addModel(job.owner, aggregatedModelHash);

        emit TrainingRoundCompleted(
            jobId, roundNumber, aggregatedModelHash, trainingRound.modelUpdateCount, block.timestamp
        );

        if (job.currentRound == job.plannedRounds) {
            job.status = TrainingJobStatus.COMPLETED;
            job.completedAt = block.timestamp;
            emit TrainingJobStatusChanged(jobId, job.status, block.timestamp);
        } else {
            _createRound(jobId, job.currentRound + 1, aggregatedModelHash);
        }
    }

    function getTrainingJob(uint256 jobId) external view returns (TrainingJob memory) {
        require(jobId < trainingJobs.length, "Invalid trainingJobId");
        return trainingJobs[jobId];
    }

    function getTrainingJobs() external view returns (TrainingJob[] memory) {
        return trainingJobs;
    }

    function getTrainingRounds(uint256 jobId) external view returns (TrainingRound[] memory) {
        require(jobId < trainingJobs.length, "Invalid trainingJobId");
        return trainingRounds[jobId];
    }

    function getTrainingRound(uint256 jobId, uint256 roundNumber) external view returns (TrainingRound memory) {
        require(jobId < trainingJobs.length, "Invalid trainingJobId");
        require(roundNumber > 0 && roundNumber <= trainingRounds[jobId].length, "Invalid roundNumber");
        return trainingRounds[jobId][roundNumber - 1];
    }

    function getTrainingRoundModelUpdates(uint256 jobId, uint256 roundNumber)
        external
        view
        returns (ModelUpdate[] memory updates)
    {
        require(jobId < trainingJobs.length, "Invalid trainingJobId");
        require(roundNumber > 0 && roundNumber <= trainingRounds[jobId].length, "Invalid roundNumber");

        uint256[] storage updateIds = trainingRoundModelUpdateIds[jobId][roundNumber];
        updates = new ModelUpdate[](updateIds.length);
        for (uint256 i = 0; i < updateIds.length; i++) {
            updates[i] = modelUpdates[updateIds[i]];
        }
    }

    function getLatestModel() external view returns (Model memory) {
        require(models.length > 0, "No models registered");
        return models[models.length - 1];
    }

    function getModels() external view returns (Model[] memory) {
        return models;
    }

    function getModelUpdates() external view returns (ModelUpdate[] memory) {
        return modelUpdates;
    }

    function getModelUpdateId(uint256 jobId, uint256 roundNumber, address client)
        external
        view
        returns (bool exists, uint256 updateId)
    {
        uint256 idPlusOne = modelUpdateIdByClientPlusOne[jobId][roundNumber][client];
        if (idPlusOne == 0) return (false, 0);
        return (true, idPlusOne - 1);
    }

    function _getTrainingJob(uint256 jobId) private view returns (TrainingJob storage) {
        require(jobId < trainingJobs.length, "Invalid trainingJobId");
        return trainingJobs[jobId];
    }

    function _getCurrentRound(TrainingJob storage job) private view returns (TrainingRound storage) {
        require(job.currentRound < job.plannedRounds, "No active round");
        require(trainingRounds[job.id].length == job.currentRound + 1, "No active round");
        return trainingRounds[job.id][job.currentRound];
    }

    function _createRound(uint256 jobId, uint256 roundNumber, string memory prevModelHash)
        private
        returns (TrainingRound storage trainingRound)
    {
        trainingRounds[jobId].push(
            TrainingRound({
                jobId: jobId,
                roundNumber: roundNumber,
                status: TrainingRoundStatus.RUNNING,
                modelUpdateCount: 0,
                prevModelHash: prevModelHash,
                aggregatedModelHash: "",
                startedAt: block.timestamp,
                completedAt: 0
            })
        );
        trainingRound = trainingRounds[jobId][roundNumber - 1];
        emit TrainingRoundStarted(jobId, roundNumber, block.timestamp);
    }

    function _addModel(address modelOwner, string memory modelHash) private returns (uint256 modelId) {
        require(bytes(modelHash).length > 0, "Model hash is required");
        bytes32 modelKey = keccak256(bytes(modelHash));
        uint256 existingIdPlusOne = modelIdByHashPlusOne[modelKey];
        if (existingIdPlusOne != 0) return existingIdPlusOne - 1;

        modelId = models.length;
        models.push(Model({owner: modelOwner, modelHash: modelHash, timestamp: block.timestamp}));
        modelIdByHashPlusOne[modelKey] = modelId + 1;
        emit ModelAdded(modelOwner, modelHash, block.timestamp);
    }
}
