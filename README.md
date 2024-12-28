# Lit Full Self Signing

A modular framework for building AI agents that can interact with blockchain and web3 infrastructure through the Lit Protocol ecosystem. This project enables the creation of autonomous agents that can execute blockchain transactions and interact with smart contracts based on natural language instructions, while maintaining security through configurable policies.

## Project Overview

The Lit AI Agent project consists of several packages that work together to provide a complete framework for building and deploying AI agents:

- `full-self-signing`: Core agent implementation that handles natural language processing and tool execution
- `fss-cli`: Command-line interface for interacting with Lit agents
- `fss-contracts`: Smart contracts for agent registry and policy management
- `fss-signer`: Handles authentication and signing of transactions
- `fss-tool-registry`: Registry for available agent tools and capabilities
- `fss-tool-erc20-send`: Example tool implementation for sending ERC20 tokens
- `fss-tool-policy-base`: Shared utilities and interfaces for building agent tools

## Running the Lit Agent CLI Demo

1. Install the Lit Agent CLI
   ```bash
   npm install -g @lit-protocol/fss-cli@latest
   ```
2. Run the Lit Agent CLI
   ```bash
   lit-agent
   ```
3. Select the `Generate New` options to generate a new Lit Auth private key
4. Follow the instructions to back up the key and fund the address with Lit test tokens:
   - Your private key will be saved in `.agent-cli-storage/auth-wallet`
    ```bash
    ℹ️  Generated new Lit auth wallet with address: 0xYOUR_ADDRESS
    Before continuing:
    1. Back up your private key in a secure location
    2. Fund your wallet (0xYOUR_ADDRESS) with Lit test tokens
    Get test tokens from: https://chronicle-yellowstone-faucet.getlit.dev/
    ```
5. Confirm in the CLI that you have funded your wallet
6. Provide your OpenAI API key to the CLI
   - Please make sure you have the `gpt-4o-mini` model enabled in your API key
7. You will be prompted:
   - Press `ENTER` or type `Y` and hit `ENTER` to use the default registry
    ```bash
    ? Would you like to use the default Lit PKP Tool Policy Registry? (recommended) (Y/n)
    ```
8. You should see that the Lit Agent has now been initialized and is ready to use
    ```bash
    ✅ Successfully initialized Lit Agent
    ```
9. You are now prompted with what you'd like the Lit Agent to do
    ```bash
    ? What would you like to do?
    ```
10. Enter a prompt to get the Lit Agent to send ERC20 tokens to an address:
    - For now there is only one Lit Agent tool available: [ERC20 Send](./packages/fss-tool-erc20-send)
    - You can use the `ERC20 Send` tool to send ERC20 tokens to an address by specifying:
      - The amount of tokens to send
      - The ERC20 contract address
      - The recipient address
        ```bash
        send <YOUR_AMOUNT> <ERC20_CONTRACT_ADDRESS> to <RECIPIENT_ADDRESS>
        ```
    - For demo purposes, an ERC20 contract address has been deployed on Base Sepolia that allows anyone to mint tokens to any address, it's available at: `0x4070c8325e278ca1056e602e08d16d2D5cd79b27`
    - There is a mint Forge script in the [./packages/fss-contracts](./packages/fss-contracts) package that you can use to mint tokens to the address you'd like to test with:
      - Don't forget to initialize the `.env` file using `cp .env.example .env`, the required ENVs for the below commands have default values
      - You'll also want to do the following for the Lit Agent wallet:
        - **NOTE:** Your Lit Agent's wallet address is saved to the `.agent-signer-storage/pkp` file
        - Send or mint DevERC20 tokens to the address for your Lit Agent, not the address of the Lit Auth wallet that was generated for you in `Step 2`
        - Send enough Base Sepolia ETH to your Lit Agent's wallet to cover the gas fees for the ERC20 transfer
        - Fund your Lit Agent's wallet with Lit test tokens (`0.011` is the default given by the [Lit faucet](https://chronicle-yellowstone-faucet.getlit.dev/))
      ```bash
      make mint-dev-erc20 ADDR=0xYOUR_ADDRESS AMT=100
      ```
    - There's also a Forge script to check the balance of an address:
      ```bash
      make dev-erc20-balance ADDR=0xYOUR_ADDRESS
      ```
    - After entering a prompt to trigger an ERC20 transfer like so:
      ```bash
      send 20 0x4070c8325e278ca1056e602e08d16d2D5cd79b27 to 0x600DC16993EA1AbdA674A20d432F93041cDa2ef4
      ```
      the Lit Agent will find a Lit Agent tool registered in the [./packages/fss-tool-registry](./packages/fss-tool-registry) package that satisfies your intent.
11. You should see that the Lit Agent found a Lit Agent tool and is attempting to execute it:
    ```bash
    ℹ️  Executing tool...
    ```
12. Because we've just minted the Lit Agent wallet, there are currently no permitted Agent Tools for it to use. You should see a prompt for the CLI to permit the Agent Tool that the Lit Agent is attempting to use to fulfil your intent:
    ```
    ⚠️  Tool Permission Required

    Name: SendERC20
    Description: A Lit Action that sends ERC-20 tokens.
    IPFS CID: QmdNViKYxNrF6Rpm5z8afytyLBEpZ1KE1aq7L545EjXdMi
    Parameters:
      - tokenIn: The Ethereum contract address of the ERC20 token you want to send. Must be a valid Ethereum address starting with 0x.
      - recipientAddress: The Ethereum wallet address of the recipient who will receive the tokens. Must be a valid Ethereum address starting with 0x.
      - amountIn: The amount of tokens to send, specified as a string. This should be a decimal number (e.g. "1.5" or "100"). The amount will be automatically adjusted based on the token's decimals.
      - chainId: The ID of the blockchain network to send the tokens on (e.g. 1 for Ethereum mainnet, 84532 for Base Sepolia).
      - rpcUrl: The RPC URL of the blockchain network to connect to (e.g. "https://base-sepolia-rpc.publicnode.com").
    
    ? Would you like to permit this tool for your agent wallet? (Y/n)
    ```
    - Press `ENTER` or type `Y` and hit `ENTER` to permit the Agent Tool for your Lit Agent's wallet
13. If the Agent Tool has a policy associated with it, the CLI will prompt you with the option to configure a policy:
    ```
    ⚠️  Tool Policy Configuration
    Tool: SendERC20
    ? Would you like to configure a policy for this tool? (Y/n)
    ```
    - While this is optional, it's highly recommended to configure a policy for your Agent Tools to ensure they are within the bounds you are comfortable with
    - Press `ENTER` or type `Y` and hit `ENTER` to being the policy configuration process
14. The CLI will now parse the Agent Tool's policy and prompt you with the option to configure each parameter:
    - For the `SendERC20` tool, the CLI will prompt you with the option to configure:
      - `maxAmount` - The maximum amount of tokens the Lit Agent is allowed to send in a single transaction
        - Specify this is as a decimal or whole number of tokens. The `SendERC20` tool will automatically adjust the amount based on the token's decimals, so that `20` becomes `20000000000000000000` if the token has 18 decimals
      - `allowedTokens` - A list of ERC20 contract addresses that the Lit Agent is allowed to send
        - First type `Y` and hit `ENTER` to begin this configuration step
          - You can also just press `ENTER` to skip this step
        - You will be prompted to enter each ERC20 contract address one at a time:
          ```bash
          ? Enter a value for allowedTokens (or leave empty to finish):
          ```
          Enter the ERC20 contract address, then press `ENTER` to be prompted for the next address.
        - Pressing `ENTER` without entering an address will finish the configuration step
      - `allowedRecipients` - A list of Ethereum wallet addresses that the Lit Agent is allowed to send tokens to
        - First type `Y` and hit `ENTER` to begin this configuration step
          - You can also just press `ENTER` to skip this step
        - This configuration step follows the same process as the `allowedTokens` step
    - After going through all the configuration steps, you will be prompted to confirm the policy configuration:
      ```bash
      ⚠️  Tool Policy Configuration
      Tool: SendERC20
      ✔ Would you like to configure a policy for this tool? Yes
      ✔ Enter maxAmount (in ETH): 20
      ✔ Would you like to configure allowedTokens? Yes
      ✔ Enter a value for allowedTokens (or leave empty to finish): 0x4070c8325e278ca1056e602e08d16d2D5cd79b27
      ✔ Enter a value for allowedTokens (or leave empty to finish): 
      ✔ Would you like to configure allowedRecipients? Yes
      ✔ Enter a value for allowedRecipients (or leave empty to finish): 0x600DC16993EA1AbdA674A20d432F93041cDa2ef4
      ✔ Enter a value for allowedRecipients (or leave empty to finish): 

      ℹ️  Policy Summary:
      type: SendERC20
      version: 1.0.0
      maxAmount: 20.0 ETH
      allowedTokens: 0x4070c8325e278ca1056e602e08d16d2D5cd79b27
      allowedRecipients: 0x600DC16993EA1AbdA674A20d432F93041cDa2ef4
      ? Would you like to proceed with this policy? (Y/n)
      ```
      - Press `ENTER` or type `Y` and hit `ENTER` to confirm the policy configuration
15. You should see that the policy has been successfully registered on-chain using Lit's [PKP Tool Policy Registry](./packages/fss-contracts/src/PKPToolPolicyRegistry.sol):
    ```
    ℹ️  Registering policy on chain...
    ✅ Policy successfully registered! Transaction hash: 0xb8ab7e8e45ffd6cdaffbf44247c95bfb36ab548474786b1b25da29cfa26657d2
    ```
16. Next, because an chain RPC URL and chain ID are required for the `SendERC20` tool, the CLI will prompt you with the option to select from a list of default chains, or enter the URL and ID for a new chain:
    ```
    ⚠️  Some parameters are missing. Please provide them:
    ? Select the chain to use: (Use arrow keys)
    ❯ Base Sepolia
    Base Mainnet
    ──────────────
    Add New Chain
    ```
    - Because the `DevERC20` contract is deployed on Base Sepolia, you'll want to select `Base Sepolia` for this demo
      - Press `ENTER` or type `Y` and hit `ENTER` to proceed with Base Sepolia
17. The CLI will now prompt you to confirm the parameters to send to the `SendERC20` tool:
    ```
    ℹ️  Parameters to be used:
    tokenIn: 0x4070c8325e278ca1056e602e08d16d2D5cd79b27
    recipientAddress: 0x600DC16993EA1AbdA674A20d432F93041cDa2ef4
    amountIn: 20.0
    rpcUrl: https://base-sepolia-rpc.publicnode.com
    chainId: 84532
    ? Would you like to proceed with these parameters? (Y/n)
    ```
    - Press `ENTER` or type `Y` and hit `ENTER` to proceed with the parameters
18. You should now see that the Agent Tool execution has completed successfully:
    ```bash
    ✅ Tool execution completed
    Result: {
        "success": true,
        "signedData": {},
        "decryptedData": {},
        "claimData": {},
        "response": "{\"status\":\"success\",\"transferHash\":\"0x634cf0ca6f7f4b4b9212bf5b8c76b2ed24f022000b1dc53ff2b5f5742a179213\"}",
        "logs": "Getting token info for: 0x4070c8325e278ca1056e602e08d16d2D5cd79b27\nCreating token contract instance...\nFetching token decimals and balance...\nToken decimals: 18\nToken balance: 100000000000000000000\nAmount to send: 20000000000000000000\nEstimated gas limit: 34885\nSigning transfer...\nBroadcasting transfer...\nResult: 0x634cf0ca6f7f4b4b9212bf5b8c76b2ed24f022000b1dc53ff2b5f5742a179213\n"
    }
    ```
    - The `Result` is the return object for the Lit Agent Tool execution

While that was a lot of steps, now that the Lit Agent is configured, if you run the ERC20 transfer prompt again, you will see that process is much simpler:

- **NOTE:** You can also bypass the Chain selection prompt by specifying the RPC URL and chain ID in the prompt like so:

```
✔ What would you like to do? send 20 0x4070c8325e278ca1056e602e08d16d2D5cd79b27 to 0x600DC16993EA1AbdA674A20d432F93041cDa2ef4 using rpcUrl: 
https://base-sepolia-rpc.publicnode.com and chainId: 84532

ℹ️  Executing tool...

✅ Tool execution completed
Result: {
  "success": true,
  "signedData": {},
  "decryptedData": {},
  "claimData": {},
  "response": "{\"status\":\"success\",\"transferHash\":\"0xfb735a6c9a0279a84f2ff32d73ebf8dc3bb79c14ff728d5781e2c10da33bfe03\"}",
  "logs": "Getting token info for: 0x4070c8325e278ca1056e602e08d16d2D5cd79b27\nCreating token contract instance...\nFetching token decimals and balance...\nToken decimals: 18\nToken balance: 60000000000000000000\nAmount to send: 20000000000000000000\nEstimated gas limit: 34885\nSigning transfer...\nBroadcasting transfer...\nResult: 0xfb735a6c9a0279a84f2ff32d73ebf8dc3bb79c14ff728d5781e2c10da33bfe03\n"
}
```

## Development

This is an Nx monorepo using pnpm workspaces. Here's how to work with it:

```bash
# Build a specific package
pnpm nx build <package-name>

# Test a specific package
pnpm nx test <package-name>

# Run a command across all packages
pnpm nx run-many -t <command>

# Generate a new package
pnpm nx g @nx/js:lib packages/new-package --publishable --importPath=@lit-protocol/new-package

# Visualize project dependencies
pnpm nx graph
```

## Architecture

The project follows a modular architecture where:

1. The core agent (`agent`) processes natural language through OpenAI and matches intents to available tools
2. Tools are registered in the `agent-tool-registry` with their capabilities and policies
3. The `agent-signer` handles secure transaction signing using Lit Protocol's PKPs
4. Smart contracts in `agent-contracts` manage on-chain policies and permissions
5. The `agent-tool-policy-base` provides shared utilities for building new tools

## Security

The framework includes multiple security layers:

1. Tool-specific policies that can restrict operations (e.g., max transaction amounts)
2. On-chain policy management through smart contracts
3. Secure key management through Lit Protocol's PKP system
4. Permission callbacks for user approval of sensitive operations

## Contributing

Contributions are welcome! Please check out our [Contributing Guide](CONTRIBUTING.md) for guidelines.

## License

MIT
