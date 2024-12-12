# Lit AI Agent

This code example demonstrates how Lit Actions can be leveraged to create an AI agent that performs actions on behalf of users or other agents. These actions are immutable and only executed when approved by the implemented governance system. In this case, we use a 2/2 multisig Safe to authenticate the actions.

## Prerequisites

You'll need the following environment variables set up:

### Private Keys
1. `ETHEREUM_PRIVATE_KEY_1`
   - On Base mainnet:
     - Safe deployment gas fees
     - PKP Tools contract deployment
     - Adding Lit Action IPFS CIDs to the PKP Tools contract
     - First signature for Safe transactions
   - On Lit's Chronicle Yellowstone:
     - PKP minting costs
     - Capacity Credits minting costs
   - Requirements:
     - Small amount of ETH on Base mainnet for gas fees
     - tstLPX tokens on Chronicle Yellowstone network (available from the [faucet](https://chronicle-yellowstone-faucet.getlit.dev/))

2. `ETHEREUM_PRIVATE_KEY_2`
   - On Base mainnet:
     - Second signature for Safe transactions
   - Requirements:
     - Small amount of ETH on Base mainnet for gas fees

### API Keys
- `OPENAI_API_KEY`
  - Required for the `gpt-4o-mini` model (or modify code to use a different model)
  - Used for parsing intent and executing actions
  - Note: Any LLM provider can be used as an alternative

- `BASESCAN_API_KEY`
  - Required for contract verification on BaseScan

### RPC URL
- `BASE_RPC_URL`
  - RPC URL for Base mainnet (public URL provided in `.env.example`)

## Setup Instructions

1. Clone the repository
2. Navigate to the project directory: `cd lit-ai-agent`
3. Install dependencies: `yarn`
4. Create environment file: `cp .env.example .env`
5. Add required keys to `.env`

## Running the Example

1. Compile the PKP Tools contract:
```bash
yarn compile
```

2. Run the example:
```bash
yarn start
```

3. Verify the contract (optional):
```bash
yarn verify
```

The first run will generate a `safe-pkp-config.json` file containing Safe, PKP, and contract information, which is used for contract verification.

## Architecture Overview

### Lit Action Multisig Authentication
Implements a 2/2 multisig Safe for PKP action authentication.

#### Authentication Flow
1. Two owners sign an authentication message
2. Signatures are passed to Lit nodes' TEE (Trusted Execution Environment)
3. Lit nodes verify signatures against Safe owners
4. Session Signatures are generated for PKP action execution

#### Components
- Session Signatures for PKP authentication
- Capacity delegation for rate limiting

### Available Tools

#### 1. Token Swap Tool (`litActionSwap.ts`)
- Handles token swaps via Uniswap V3
- Manages token approvals and execution
- Returns transaction hashes

#### 2. ETH Transfer Tool (`litActionCode.ts`)
- Executes basic ETH transfers
- Signs and processes transactions via PKP
- Returns transaction hash

#### 3. WETH Unwrap Tool (`litActionUnwrap.ts`)
- Unwraps WETH to ETH
- Returns transaction hash

#### Common Features
- Gas optimization (2x current gas price)
- Error handling and status reporting
- Transaction verification
- Balance validation

## Project Structure

### Core Logic
- `./src/index.ts`: Main application logic

### Utility Functions
- `./src/utils/contractUtils.ts`: Contract interaction utilities
  - Tool permission management
  - Contract queries

- `./src/utils/deployUtils.ts`: Deployment utilities
  - Contract deployment
  - Safe transaction handling
  - Balance checking

- `./src/utils/saveInfoUtils.ts`: Configuration management
  - Config saving/loading
  - Deployment verification

- `./src/utils/subAgentUtils.ts`: Intent analysis and action matching

### Lit Actions
Pre-deployed actions with IPFS CIDs (source code available in `src/litActions/`):
- `customLitAction.ts`: Custom action implementation
- `litActionSwap.ts`: Token swap functionality
- `litActionCode.ts`: ETH transfer functionality
- `litActionUnwrap.ts`: WETH unwrapping functionality

### Smart Contracts
- `./contracts/PKPTools.sol`: PKP Tools contract implementation

### Verification
- `./scripts/verifyContract.ts`: BaseScan contract verification script
