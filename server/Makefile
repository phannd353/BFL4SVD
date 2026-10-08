.PHONY: verify-contract
verify-contract:
	@echo "Verifying contract..."
	@forge script scripts/FLRegistry.s.sol --broadcast \
	    --rpc-url ${JSON_RPC_PROVIDER_URL} \
		--private-key ${PRIVATE_KEY} \
		--gas-estimate-multiplier 700 \
		--etherscan-api-key ${ETHERSCAN_API_KEY} \
		--verify

.PHONY: deploy-contract
deploy-contract:
	@echo "Deploying contract..."
	@forge script scripts/FLRegistry.s.sol --broadcast \
	    --rpc-url ${JSON_RPC_PROVIDER_URL} \
		--private-key ${PRIVATE_KEY} \
		--gas-estimate-multiplier 700

.PHONY: estimate-gas
estimate-gas:
	@echo "Estimating gas..."
	@cast estimate --rpc-url ${JSON_RPC_PROVIDER_URL} \
        --from ${FROM_ADDRESS} \
        --create "$(forge inspect FLRegistry bytecode)" \
        'constructor(string,uint256,uint256,uint256,uint256,uint256)' \
        '0x0' 0 0 0 0 0
