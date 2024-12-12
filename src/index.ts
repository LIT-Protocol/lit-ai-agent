import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK, LIT_ABILITY, LIT_RPC, AUTH_METHOD_SCOPE } from "@lit-protocol/constants";
import { LitActionResource, LitPKPResource } from "@lit-protocol/auth-helpers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import Safe from '@safe-global/protocol-kit';
import * as readline from 'readline';
import { ethers } from "ethers";

import { deployToolsContract, deploySafe, checkBalances, signAndExecuteSafeTransaction } from "./utils/deployUtils";
import { addPermittedTool, getPermittedTools } from "./utils/contractUtils";
import { analyzeUserIntentAndMatchAction } from "./utils/subAgentUtils";
import { ConfigManager } from './utils/saveInfoUtils.js';
import PKPToolsArtifact from "../artifacts/contracts/PKPTools.sol/PKPTools.json";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Network and authentication constants
const BASE_CHAIN_ID = 8453;
const BASE_RPC_URL = process.env.BASE_RPC_URL!;
const LIT_NET = LIT_NETWORK.DatilTest;

const ETHEREUM_PRIVATE_KEY_1 = process.env.ETHEREUM_PRIVATE_KEY_1!;
if (!ETHEREUM_PRIVATE_KEY_1) {
  throw new Error("ETHEREUM_PRIVATE_KEY_1 is not set");
}

const ETHEREUM_PRIVATE_KEY_2 = process.env.ETHEREUM_PRIVATE_KEY_2!;
if (!ETHEREUM_PRIVATE_KEY_2) {
  throw new Error("ETHEREUM_PRIVATE_KEY_2 is not set");
}

/**
 * Safe PKP System Initializer
 * --------------------------
 * Main entry point for setting up and managing a Safe with PKP integration.
 * Handles deployment, configuration, and interactive user sessions.
 * 
 * Core Components:
 * 1. Lit Protocol Integration
 *    - Node client for executing actions
 *    - Contract interactions for PKP management
 *    - Session signature handling
 * 
 * 2. Safe Management
 *    - Multi-signature wallet deployment
 *    - Owner configuration
 *    - Transaction handling
 * 
 * 3. PKP Setup
 *    - Token minting
 *    - Tools configuration
 *    - Safe ownership transfer
 * 
 * Constants:
 * - BASE_CHAIN_ID: 8453 (Base network)
 * - Required Environment Variables:
 *   * BASE_RPC_URL: Network endpoint
 *   * ETHEREUM_PRIVATE_KEY_1: First owner's key
 *   * ETHEREUM_PRIVATE_KEY_2: Second owner's key
 * 
 * Lit Actions:
 * 1. Token Swaps (QmWjMP2Do2...)
 *    - Uniswap V3 integration
 *    - Token pair handling
 * 
 * 2. ETH Transfers (QmXjLSxsTx3...)
 *    - Direct ETH sending
 *    - Trusted wallet transfers
 * 
 * 3. WETH Unwrapping (QmSNtQAbYLc5...)
 *    - WETH to ETH conversion
 * 
 * Security Features:
 * - Multi-signature requirements
 * - Session-based authentication
 * - Deployment verification
 * - Configuration persistence
 * 
 * @function createSafePKP
 * @async
 * @returns {Promise<string>} "done" on successful completion
 * @throws {Error} On setup or execution failure
 */
export const runSubAgent = async (): Promise<string> => {
  // Initialize configuration and check for existing setup
  const configManager = new ConfigManager();
  const existingConfig = configManager.loadConfig();

  console.log("🔄 Connecting to the Lit network...");
  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NET,
    debug: false,
  });
  await litNodeClient.connect();
  console.log("✅ Connected to the Lit network");

  console.log("🔄 Connecting LitContracts client to network...");
  const litContracts = new LitContracts({
    signer: new ethers.Wallet(
      ETHEREUM_PRIVATE_KEY_1, 
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    ),
    network: LIT_NET,
  });
  await litContracts.connect();
  console.log("✅ Connected LitContracts client to network");

  try {
    const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL!);
    const firstOwnerWallet = new ethers.Wallet(ETHEREUM_PRIVATE_KEY_1, provider);
    const secondOwnerWallet = new ethers.Wallet(ETHEREUM_PRIVATE_KEY_2, provider);

    let safeAddress: string;
    let pkp: any;
    let pkpToolsAddress: string;
    let protocolKit: any;

    if (existingConfig && await configManager.verifyDeployments(provider)) {
      console.log("🔄 Loading existing configuration...");
      safeAddress = existingConfig.safeAddress;
      pkp = existingConfig.pkp;
      pkpToolsAddress = existingConfig.pkpToolsAddress;
      
      protocolKit = await Safe.default.init({
        provider: BASE_RPC_URL!,
        signer: ETHEREUM_PRIVATE_KEY_1,
        safeAddress
      });
      
      console.log("ℹ Loaded configuration:", {
        safeAddress,
        pkpTokenId: pkp.tokenId,
        pkpToolsAddress
      });
    } else {
      console.log("ℹ️ No existing configuration found or verification failed. Setting up new Safe and PKP...");
      
      const predictedSafe = {
        safeAccountConfig: {
          owners: [firstOwnerWallet.address, secondOwnerWallet.address],
          threshold: 2
        },
      };

      protocolKit = await Safe.default.init({
        provider: BASE_RPC_URL!,
        signer: ETHEREUM_PRIVATE_KEY_1,
        predictedSafe
      });

      safeAddress = await protocolKit.getAddress();

      await checkBalances(provider, firstOwnerWallet, secondOwnerWallet, safeAddress);

      if (!(await protocolKit.isSafeDeployed())) {
        console.log("🔄 Safe not deployed. Deploying...");
        const deployTx = await deploySafe(protocolKit, provider, {
          id: BASE_CHAIN_ID,
          name: 'base',
          network: 'mainnet',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: [BASE_RPC_URL!] } }
        });
        
        console.log("🔄 Waiting for Safe deployment to be confirmed...");
        await provider.waitForTransaction(deployTx.transactionHash, 1);
        
        if (!(await protocolKit.isSafeDeployed())) {
          throw new Error("❌ Safe deployment failed to confirm");
        }
        console.log("✅ Safe deployed successfully");
      }

      protocolKit = await Safe.default.init({
        provider: BASE_RPC_URL!,
        signer: ETHEREUM_PRIVATE_KEY_1,
        safeAddress
      });

      console.log("🔄 Minting PKP...");
      const mintPKPResult = await litContracts.pkpNftContractUtils.write.mint();
      pkp = mintPKPResult.pkp;
      console.log("✅ PKP minted:", {
        tokenId: pkp.tokenId,
        publicKey: pkp.publicKey,
        ethAddress: pkp.ethAddress
      });

      const pkpToolsContract = await deployToolsContract(firstOwnerWallet, safeAddress);
      pkpToolsAddress = pkpToolsContract.address;
      
      console.log("🔄 Adding multisig authentication action to PKP...");
      await litContracts.addPermittedAction({
        ipfsId: "QmTGriBhEYZ7ivCLBVi9rrv2LNJzm278G75wVX93Nmw7GJ",
        pkpTokenId: pkp.tokenId,
        authMethodScopes: [AUTH_METHOD_SCOPE.SignAnything],
      });
      console.log("✅ Added multisig authentication action to PKP");

      console.log("🔄 Transferring PKP to Safe...");
      const transferTx = await litContracts.pkpNftContract.write.transferFrom(
        firstOwnerWallet.address,
        safeAddress,
        pkp.tokenId
      );
      await transferTx.wait();
      console.log("✅ PKP transferred to Safe");

      console.log("🔄 No Capacity Credit provided, minting a new one...");
      const mintCapacityResult = await litContracts.mintCapacityCreditsNFT({
        requestsPerKilosecond: 10,
        daysUntilUTCMidnightExpiration: 1,
      });
      const capacityTokenId = mintCapacityResult.capacityTokenIdStr;
      console.log(`✅ Minted new Capacity Credit with ID: ${capacityTokenId}`);

      configManager.saveConfig({
        pkp,
        safeAddress,
        pkpToolsAddress,
        chainId: BASE_CHAIN_ID,
        owners: [firstOwnerWallet.address, secondOwnerWallet.address],
        threshold: 2,
        network: {
          name: 'base',
          rpcUrl: BASE_RPC_URL,
          chainId: BASE_CHAIN_ID
        },
        capacityTokenId
      });
      console.log("✅ Configuration saved successfully");
    }

    console.log("🔄 Adding Lit Action tools to our PKP's execution scope...");
    await addLitActionTools(
      protocolKit,
      new ethers.Contract(pkpToolsAddress, PKPToolsArtifact.abi, provider),
      provider
    );
    console.log("✅ Added Lit Action tools to our PKP's execution scope");

    let capacityTokenId = existingConfig?.capacityTokenId;
    if (!capacityTokenId) {
      console.log("🔄 No Capacity Credit provided, minting a new one...");
      const mintResult = await litContracts.mintCapacityCreditsNFT({
        requestsPerKilosecond: 10,
        daysUntilUTCMidnightExpiration: 1,
      });
      capacityTokenId = mintResult.capacityTokenIdStr;
      console.log(`✅ Minted new Capacity Credit with ID: ${capacityTokenId}`);
      
      configManager.saveConfig({
        ...existingConfig,
        capacityTokenId
      });
    } else {
      console.log(`ℹ️  Using provided Capacity Credit with ID: ${capacityTokenId}`);
    }

    console.log("🔄 Creating capacityDelegationAuthSig...");
    const { capacityDelegationAuthSig } = await litNodeClient.createCapacityDelegationAuthSig({
      dAppOwnerWallet: firstOwnerWallet,
      capacityTokenId,
      delegateeAddresses: [pkp.ethAddress],
      uses: "1",
    });
    console.log("✅ Capacity Delegation Auth Sig created");

    const messageToSign = "Auth message: " + Date.now().toString();
    const signature1 = await firstOwnerWallet.signMessage(messageToSign);
    const signature2 = await secondOwnerWallet.signMessage(messageToSign);
    const signatures = [signature1, signature2];

    console.log("🔄 Getting Session Signatures...");
    const sessionSigs = await litNodeClient.getLitActionSessionSigs({
      pkpPublicKey: pkp.publicKey,
      capabilityAuthSigs: [capacityDelegationAuthSig],
      resourceAbilityRequests: [
        {
          resource: new LitActionResource("*"), 
          ability: LIT_ABILITY.LitActionExecution
        },
        {
          resource: new LitPKPResource(pkp.tokenId),
          ability: LIT_ABILITY.PKPSigning
        },
      ],
      // Authentication parameters
      litActionIpfsId: "QmTGriBhEYZ7ivCLBVi9rrv2LNJzm278G75wVX93Nmw7GJ",
      jsParams: {
        pkpPublicKey: pkp.publicKey,
        safeAddress,
        signatures,
        messageToSign,
        chainName: "base"
      },
    });
    console.log("✅ Got Session Signatures");

    const pkpBalance = await provider.getBalance(pkp.ethAddress);
    const minimumPkpBalance = ethers.utils.parseEther("0.00001");

    if (pkpBalance.lt(minimumPkpBalance)) {
      console.warn(`⚠️  Warning: PKP balance is low. Any action is likely to fail due to insufficient funds, especially for gas.
        Has ${ethers.utils.formatEther(pkpBalance)} ETH, recommended at least 0.00001 ETH`);
    }

    /**
     * User Action Processor
     * -------------------
     * Handles continuous user input loop for processing AI actions.
     * 
     * Process:
     * 1. Prompts for user intent
     * 2. Analyzes intent against permitted actions
     * 3. Executes matched action with Lit Protocol
     * 4. Continues until 'quit' command
     * 
     * @returns Promise that resolves when processing ends
     * @throws Error if action execution fails
     */
    const processUserActions = async () => {
      while (true) {
        const userIntent = await new Promise<string>((resolve) => {
          rl.question('\nYou are an AI. What is your action? ', (answer) => {
            resolve(answer.trim());
          });
        });

        if (userIntent.toLowerCase() === 'quit') {
          console.log("\nGoodbye!");
          await new Promise<void>(resolve => {
            rl.close();
            resolve();
          });
          break;
        }

        try {
          console.log("\nProcessing intent:", userIntent);
          const { analysis, matchedAction } = await analyzeUserIntentAndMatchAction(
            userIntent,
            new ethers.Contract(pkpToolsAddress, PKPToolsArtifact.abi, provider),
            provider
          );
          
          console.log("Analysis:", analysis);
          console.log("Matched action:", matchedAction);
          
          if (matchedAction) {
            const baseParams = {
              chainInfo: {
                rpcUrl: BASE_RPC_URL!,
                chainId: BASE_CHAIN_ID
              },
              publicKey: pkp.publicKey,
              pkpEthAddress: pkp.ethAddress
            };
        
            const response = await litNodeClient.executeJs({
              sessionSigs,
              ipfsId: matchedAction.ipfsCid,
              jsParams: {
                ...baseParams,
                params: analysis
              }
            });
            
            console.log("Action response:", response);
          } else {
            console.log("No matching action found for this intent.");
          }
        } catch (error) {
          console.error("Error processing action:", error);
          console.log("You can try another action or type 'quit' to exit.");
        }
      }
    };

    await processUserActions();
    return "done";

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Required Actions Initializer
 * --------------------------
 * Sets up the predefined Lit Actions in the PKP Tools contract.
 */
export const addLitActionTools = async (
  protocolKit: Safe,
  pkpToolsContract: ethers.Contract,
  provider: ethers.providers.Provider
): Promise<void> => {
  try {
    const requiredActions = [
      {
        ipfsCid: "QmWjMP2Do2Sq3sNG9DkGx7QFZf6nHWKpmrZD58oSnwnZ1o", 
        description: 'A Lit Action that executes a token swap on Base using Uniswap V3. The AI must provide: tokenIn, tokenOut, amountIn'
      },
      {
        ipfsCid: "QmXjLSxsTx3fXeW6QjhuqbL2em3csRc3tWJBYCMtw6p7Pq", 
        description: 'A Lit Action that sends ETH to a trusted wallet. The AI must provide: amountIn, recipientAddress'
      },
      {
        ipfsCid: "QmSNtQAbYLc5pDrGEjAeUqaih1657V7ht4RJe2mwKBrmWQ", 
        description: 'A Lit Action that unwraps WETH to ETH. The AI must provide: amountIn'
      }
    ];

    for (const requiredAction of requiredActions) {
      const permittedActions = await getPermittedTools(pkpToolsContract, provider);
      const actionExists = permittedActions.some(
        (action: any) => action.ipfsCid === requiredAction.ipfsCid && action.permitted
      );

      if (actionExists) {
        console.log(`Action ${requiredAction.ipfsCid} already exists`);
        continue;
      }

      // Create and execute transaction to add new action
      const addActionTx = await addPermittedTool(
        protocolKit,
        pkpToolsContract, 
        requiredAction.ipfsCid,
        requiredAction.description
      );

      await signAndExecuteSafeTransaction(
        protocolKit,
        addActionTx,
        ETHEREUM_PRIVATE_KEY_1,
        ETHEREUM_PRIVATE_KEY_2,
        provider,
        BASE_RPC_URL
      );

      console.log(`Permitted action ${requiredAction.ipfsCid} added successfully`);
    }
  } catch (error) {
    console.error("Error adding required permitted actions:", error);
    throw error;
  }
};