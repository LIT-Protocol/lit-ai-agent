import { OpenAI } from "openai";
import { ethers } from "ethers";
import {
  analyzeUserIntentAndMatchAction,
  executeLitAction,
  getLitNodeClient,
} from "lit-agent-toolkit";
import { Command } from "commander";

import { ConfigManager } from "../../utils/config";
import { validateEnvVar } from "../../utils/env";
import type { LitNodeClient } from "@lit-protocol/lit-node-client";

const LIT_AGENT_REGISTRY_ABI = [
  "function getRegisteredActions(address user, address pkp) external view returns (string[] memory ipfsCids, bytes[] memory descriptions, bytes[] memory policies)",
];

export interface AnalysisResult {
  analysis: any;
  matchedAction: any;
}

export async function processAgentRequest(
  prompt: string,
  command: Command
): Promise<void> {
  const config = await ConfigManager.loadConfig();

  if (!config.pkp?.tokenId) {
    command.error("No PKP found in config. Please run 'lit-agent init' first.");
  }

  // Validate environment variables
  const openaiApiKey = validateEnvVar("OPENAI_API_KEY", command);
  const litAgentRegistryAddress = validateEnvVar(
    "LIT_AGENT_REGISTRY_ADDRESS",
    command
  );
  const ethereumPrivateKey = validateEnvVar("ETHEREUM_PRIVATE_KEY", command);
  const chainToSubmitTxnOnRpcUrl = validateEnvVar(
    "CHAIN_TO_SUBMIT_TXN_ON_RPC_URL",
    command
  );
  const chainToSubmitTxnOnChainId = validateEnvVar(
    "CHAIN_TO_SUBMIT_TXN_ON_CHAIN_ID",
    command
  );

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: openaiApiKey,
  });

  console.log("\nAnalyzing your request...");
  const ethersSigner = new ethers.Wallet(
    ethereumPrivateKey,
    new ethers.providers.JsonRpcProvider(chainToSubmitTxnOnRpcUrl)
  );
  const litAgentRegistryContract = new ethers.Contract(
    litAgentRegistryAddress,
    LIT_AGENT_REGISTRY_ABI,
    ethersSigner
  );

  const { analysis, matchedAction } = await analyzeUserIntentAndMatchAction(
    openai,
    prompt,
    litAgentRegistryContract,
    ethersSigner.address,
    config.pkp!.ethAddress!
  );

  console.log(`My analysis: ${JSON.stringify(analysis, null, 2)}`);

  if (!matchedAction) {
    console.log("\n❌ No matching action found for your request.");
    console.log(
      "Please try rephrasing your request or check available actions with 'lit-agent pkp list-actions'"
    );

    return;
  }

  console.log("\n✅ Found a matching action!");
  console.log("Action Details:");
  console.log(`- Description: ${matchedAction.description}`);
  console.log(`- IPFS CID: ${matchedAction.ipfsCid}`);

  // Log additional parameters if they exist
  if (analysis.tokenIn) console.log(`- Token In: ${analysis.tokenIn}`);
  if (analysis.tokenOut) console.log(`- Token Out: ${analysis.tokenOut}`);
  if (analysis.amountIn) console.log(`- Amount In: ${analysis.amountIn}`);
  if (analysis.recipientAddress)
    console.log(`- Recipient: ${analysis.recipientAddress}`);

  let litNodeClient: LitNodeClient;
  try {
    litNodeClient = await getLitNodeClient(config.network!);
    const executionResult = await executeLitAction(
      litNodeClient,
      ethersSigner,
      { publicKey: config.pkp!.publicKey!, tokenId: config.pkp!.tokenId! },
      matchedAction.ipfsCid,
      {
        chainInfo: {
          rpcUrl: chainToSubmitTxnOnRpcUrl,
          chainId: parseInt(chainToSubmitTxnOnChainId),
        },
        pkp: config.pkp,
        params: {
          ...analysis,
          user: ethersSigner.address,
          ipfsCid: matchedAction.ipfsCid,
        },
      }
    );

    console.log(
      `Execution result: ${JSON.stringify(executionResult, null, 2)}`
    );
  } finally {
    litNodeClient!.disconnect();
  }
}
