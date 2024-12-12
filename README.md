# Lit AI Agent

This code example demonstrates how an Lit Action can be leveraged to create an AI agent that can perform actions on behalf of a user, or even other agents. These actions are immutable and only permitted when the governance system has approved the action.

## Prerequisites

The prerequisites for this example are as follows:

  - ETHEREUM_PRIVATE_KEY_1
    - Covers:
      - Safe deployment gas fees (Ethereum on Base)
      - PKP minting costs (tstLPX on Chronicle Yellowstone)
      - Capacity Credits minting costs (tstLPX on Chronicle Yellowstone)
      - PKP Tools contract deployment (tstLPX on Chronicle Yellowstone)
      - Adding Lit Action IPFS CIDs to the PKP Tools contract (Ethereum on Base)
      - First signature for the Safe transaction (Ethereum on Base)
    - You will need to have fund this wallet with a small of ETH on the Base mainnet to cover gas fees. You will also need to have some tstLPX on the Chronicle Yellowstone network to cover the PKP minting costs.
      The faucet for the Chronicle Yellowstone network is available [here](https://chronicle-yellowstone-faucet.getlit.dev/).
  - ETHEREUM_PRIVATE_KEY_2
    - Covers:
      - Second signature for the Safe transaction (Ethereum on Base)
    - You will need to have fund this wallet with a small of ETH on the Base mainnet to cover gas fees.

  - OPENAI_API_KEY
    - This example uses the `gpt-4o-mini` model, please enable this model on your API key or change it in the code if needed. 
    - The AI is used to parse a given intent and provide and execute the best course of action.
    - You are not limited to using OpenAI, you can use any LLM provider that you have access to.

  - BASESCAN_API_KEY
    - This is used to verify our PKP Tools contract on BaseScan.

  - BASE_RPC_URL
    - This is the RPC URL for the Base mainnet. The public RPC URL is already provided in the `.env.example` file.

## Installation and Setup

1. Clone the repository
2. `cd` into the code example directory: `cd lit-ai-agent`
3. Install the dependencies: `yarn`
4. Create and fill in the `.env` file: `cp .env.example .env`
5. Add the two Ethereum private keys, OpenAI API key, and BaseScan API key to the `.env` file.

## Executing the Example

Before running the example, we'll need to compile the PKP Tools contract. This can be done with running `yarn compile`.

Executing the example can be done with running `yarn start`.

After the first run, the Safe, PKP, and contract information will be saved to the `safe-pkp-config.json` file. This file will be used to verify the contract on BaseScan.

To verify the contract, run `yarn verify`.

Here's an overview of how the code example works:

### Lit Action Multisig Auth Overview
Purpose: Authenticates PKP actions using a 2/2 multisig Safe

#### Inputs
- pkpPublicKey: PKP's public key
- safeAddress: Address of the Safe contract
- signatures: Array of owner signatures [sig1, sig2]
- messageToSign: Authentication message with timestamp
- chainName: "base"

#### Process
1. Both owners sign an authentication message
2. Signatures are passed to the Lit nodes' TEE (Trusted Execution Environment)
3. The Lit nodes verify the signatures match the Safe owners
4. Our Session Signatures are created and we can now use them to execute actions on behalf of the PKP

Expected Output:
- Session signatures for authenticating PKP actions
- Capacity delegation for rate limiting

### Lit Action Tools Overview
#### Token Swap Tool (litActionSwap.ts)
   Inputs:
   - tokenIn: Source token address
   - tokenOut: Target token address
   - amountIn: Amount to swap
   - decimalsIn/Out: Token decimal places
   
   Process:
   - Approves token spending
   - Executes swap via Uniswap V3
   - Returns transaction hashes

#### ETH Transfer Tool (litActionCode.ts)
   Inputs:
   - recipientAddress: Destination address
   - value: Amount in ETH
   
   Process:
   - Creates and signs basic ETH transfer
   - Executes via PKP
   - Returns transaction hash

#### WETH Unwrap Tool (litActionUnwrap.ts)
   Inputs:
   - amountIn: Amount of WETH to unwrap
   
   Process:
   - Calls WETH contract's withdraw function
   - Returns signed transaction

Common Features:
- Gas optimization (2x current gas price)
- Error handling and status reporting
- Transaction verification
- Balance checks before execution


## Specific Files to Reference

### Core Logic

- [./src/index.ts](./src/index.ts): Contains the core logic for the example

### Utility Functions

- [./src/utils/contractUtils.ts](./src/utils/contractUtils.ts): Contains the utility functions for interacting with the contract:
  - `removeAllPermittedTools`: Removes all permitted tools from the PKP Tools contract
  - `addPermittedTool`: Adds a new permitted tool to the PKP Tools contract
  - `getPermittedTools`: Gets all permitted tools from the PKP Tools contract

- [./src/utils/deployUtils.ts](./src/utils/deployUtils.ts): Contains the utility functions for deploying the contract:
  - `deployToolsContract`: Deploys the PKP Tools contract
  - `signAndExecuteSafeTransaction`: Signs and executes a Safe transaction
  - `deploySafe`: Deploys the Safe contract
  - `checkBalances`: Checks the balances of the relevant accounts

- [./src/utils/saveInfoUtils.ts](./src/utils/saveInfoUtils.ts): Contains the utility functions for saving the PKP, Safe, contract, and other information to a JSON file.
  - `saveConfig`: Saves the PKP, Safe, contract, and other information to a JSON file
  - `validateConfig`: Validates the configuration file
  - `loadConfig`: Loads the configuration file
  - `verifyDeployments`: Verifies the deployments specified in the configuration file

- [./src/utils/subAgentUtils.ts](./src/utils/subAgentUtils.ts): Contains the utility functions for analyzing the user's intent and matching it to an appropriate action.

### Lit Actions

This code has already been uploaded to the IPFS, and the code uses those IPFS CIDs. If you'd like to edit the Lit Actions or test them by referencing the code locally, you can do so by refercing the exported constants in the `src/litActions` directory.

- [./src/litActions/customLitAction.ts](./src/litActions/customLitAction.ts): Contains the custom Lit Action code
- [./src/litActions/litActionSwap.ts](./src/litActions/litActionSwap.ts): Contains the Token Swap Lit Action code
- [./src/litActions/litActionCode.ts](./src/litActions/litActionCode.ts): Contains the ETH Transfer Lit Action code
- [./src/litActions/litActionUnwrap.ts](./src/litActions/litActionUnwrap.ts): Contains the WETH Unwrap Lit Action code

### Contract

- [./contracts/PKPTools.sol](./contracts/PKPTools.sol): Contains the PKP Tools contract code

#### Verification

- [./scripts/verifyContract.ts](./scripts/verifyContract.ts): Contains the script for verifying the PKP Tools contract on BaseScan
