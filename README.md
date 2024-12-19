# Commands

- Deploy `PKPTools.sol` using existing Safe contract:

```bash
SAFE_ADDRESS=0x... forge script script/PKPTools.s.sol --rpc-url <your-rpc-url> --private-key <your-private-key>
```

- Deploy `PKPTools.sol` using new Safe contract:

```bash
forge script script/PKPTools.s.sol --rpc-url <your-rpc-url> --private-key <your-private-key>
```

- Deploy `LitAgentRegistry.sol`:

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy the contract
# First time setup
cp .env.example .env  # Create .env file from example
vim .env              # Edit to add private key from Anvil output

# Deploy
source .env
forge script script/DeployLitAgentRegistry.s.sol:DeployLitAgentRegistry --rpc-url http://localhost:8545 --broadcast
```
