-include .env

.PHONY: help deploy-registry

help: ## Display this help screen
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

deploy-registry: ## Deploy the Lit Agent Registry contract
	@if [ -z "$(CHAIN_TO_DEPLOY_TO_RPC_URL)" ]; then \
		echo "Error: CHAIN_TO_DEPLOY_TO_RPC_URL is not set in .env"; \
		exit 1; \
	fi
	@echo "Deploying Lit Agent Registry to $(CHAIN_TO_DEPLOY_TO_RPC_URL)..."
	@forge script -vvv script/DeployLitAgentRegistry.s.sol:DeployLitAgentRegistry \
		--rpc-url $(CHAIN_TO_DEPLOY_TO_RPC_URL) \
		--broadcast \
		--private-key $(FORGE_DEPLOYER_PRIVATE_KEY) 