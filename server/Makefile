.PHONY: verify-contract
verify-contract:
	@echo "Verifying contract..."
	@forge script scripts/FLRegistry.s.sol --broadcast \
	    --rpc-url ${JSON_RPC_URL} \
		--private-key ${PRIVATE_KEY} \
		--gas-estimate-multiplier 700 \
		--etherscan-api-key ${ETHERSCAN_API_KEY} \
		--verify

.PHONY: deploy-contract
deploy-contract:
	@echo "Deploying contract..."
	@forge script scripts/FLRegistry.s.sol --broadcast \
	    --rpc-url ${JSON_RPC_URL} \
		--private-key ${PRIVATE_KEY} \
		--gas-estimate-multiplier 700

.PHONY: estimate-gas
estimate-gas:
	@echo "Estimating gas..."
	@cast estimate --rpc-url ${JSON_RPC_URL} \
        --from ${FROM_ADDRESS} \
        --create "$(forge inspect FLRegistry bytecode)" \
        'constructor(string)' \
        '0x0'

.PHONY: start-dev
start-dev:
	@echo "Starting development infrastructure..."
	@docker-compose -f infrastructure/docker-compose.dev.yml up -d
	@anvil --state anvil/state.json

.PHONY: start-flwrclient1
start-flwrclient1:
	@echo "Starting flower client 1 infrastructure..."
	@AUTH_TOKEN=1 BFL4SVD_VERSION=0.1.0 \
	    docker-compose -f infrastructure/docker-compose.flwrclient1.yml up -d

.PHONY: start-flwrclient0
start-flwrclient2:
	@echo "Starting flower client 0 infrastructure..."
	@AUTH_TOKEN=2 BFL4SVD_VERSION=0.1.0 \
	    docker-compose -f infrastructure/docker-compose.flwrclient0.yml up -d

.PHONY: stop-dev
stop-dev:
	@echo "Stopping development infrastructure..."
	@docker-compose -f infrastructure/docker-compose.dev.yml stop

.PHONY: stop-flwrclient1
stop-flwrclient1:
	@echo "Stopping flower client 1 infrastructure..."
	@AUTH_TOKEN=1 BFL4SVD_VERSION=0.1.0 \
		docker-compose -f infrastructure/docker-compose.flwrclient1.yml stop

.PHONY: stop-flwrclient2
stop-flwrclient2:
	@echo "Stopping flower client 2 infrastructure..."
	@AUTH_TOKEN=1 BFL4SVD_VERSION=0.1.0 \
		docker-compose -f infrastructure/docker-compose.flwrclient2.yml stop

.PHONY: clean-dev
clean-dev:
	@echo "Cleaning up..."
	@docker-compose -f infrastructure/docker-compose.dev.yml down

.PHONY: clean-flwrclient1
clean-flwrclient1:
	@echo "Cleaning up flower client 1 infrastructure..."
	@BFL4SVD_VERSION=0.1.0 \
	    docker-compose -f infrastructure/docker-compose.flwrclient1.yml down

.PHONY: clean-flwrclient2
clean-flwrclient2:
	@echo "Cleaning up flower client 2 infrastructure..."
	@BFL4SVD_VERSION=0.1.0 \
	    docker-compose -f infrastructure/docker-compose.flwrclient2.yml down

.PHONY: setup
setup:
	@echo "Setting up development environment..."
	@ts-node -r tsconfig-paths/register setup/index.ts
