import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import {
  LIT_NETWORK,
  LIT_RPC,
  AUTH_METHOD_SCOPE,
} from "@lit-protocol/constants";
import { ethers } from "ethers";

// Example of core functionality that lit-agent-toolkit should provide
async function example() {
  // 1. Initialize Lit Protocol clients
  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilTest,
    debug: false,
  });
  await litNodeClient.connect();

  const litContracts = new LitContracts({
    signer: new ethers.Wallet(
      process.env.PRIVATE_KEY!,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    ),
    network: LIT_NETWORK.DatilTest,
  });
  await litContracts.connect();

  // 2. Mint PKP if needed
  const pkp = await litContracts.pkpNftContractUtils.write.mint();
  console.log("PKP minted:", {
    tokenId: pkp.pkp.tokenId,
    publicKey: pkp.pkp.publicKey,
    ethAddress: pkp.pkp.ethAddress,
  });

  // 3. Add auth method to PKP
  await litContracts.addPermittedAction({
    ipfsId: "QmExample...", // IPFS hash of the Lit Action
    pkpTokenId: pkp.pkp.tokenId,
    authMethodScopes: [AUTH_METHOD_SCOPE.SignAnything],
  });

  // 4. Mint capacity credits if needed
  const capacityTokenId = await litContracts.mintCapacityCreditsNFT({
    requestsPerKilosecond: 10,
    daysUntilUTCMidnightExpiration: 1,
  });

  // 5. Match user intent to available Lit Actions
  const availableActions = [
    {
      ipfsId: "QmSwap...",
      description: "Swap tokens using Uniswap V3",
    },
    {
      ipfsId: "QmTransfer...",
      description: "Transfer ETH to another address",
    },
  ];

  const userInput = "swap 1 eth for usdc";
  const matches = await analyzeUserIntentAndMatchAction(
    litNodeClient,
    userInput,
    availableActions
  );

  if (matches.length > 0) {
    const bestMatch = matches[0];
    // 6. Execute the matched Lit Action
    const response = await litNodeClient.executeJs({
      ipfsId: bestMatch.ipfsId,
      jsParams: {
        amount: "1",
        tokenIn: "ETH",
        tokenOut: "USDC",
      },
    });
    console.log("Lit Action executed:", response);
  }
}

// Helper function to match user intent to actions
async function analyzeUserIntentAndMatchAction(
  litNodeClient: LitNodeClient,
  userInput: string,
  availableActions: Array<{
    ipfsId: string;
    description: string;
  }>
) {
  // This would be implemented with proper NLP/matching logic
  // For now, return mock implementation
  return availableActions
    .map((action) => ({
      ipfsId: action.ipfsId,
      confidence: Math.random(),
      description: action.description,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
