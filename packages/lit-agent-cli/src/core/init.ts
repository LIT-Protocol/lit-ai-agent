import { ethers } from "ethers";
import type { Command } from "commander";

import { validateEnvVar } from "../utils/env";
import { LitClient } from "@lit-protocol/agent-signer";
import type { InitConfig } from "../commands/init";

const LIT_AGENT_REGISTRY_ABI = ["function registerPKP(address pkp) external"];

export const initLitProtocol = async (command: Command, config: InitConfig) => {
  // Only mint new PKP and capacity credits if they don't exist
  if (!config.pkp.publicKey || !config.capacityTokenId) {
    const ethereumPrivateKey = validateEnvVar("ETHEREUM_PRIVATE_KEY", command);
    const litAgentRegistryAddress = validateEnvVar(
      "LIT_AGENT_REGISTRY_ADDRESS",
      command,
    );
    const chainToSubmitTxnOnRpcUrl = validateEnvVar(
      "CHAIN_TO_SUBMIT_TXN_ON_RPC_URL",
      command,
    );

    const ethersSignerChainToSubmitTxnOn = new ethers.Wallet(
      ethereumPrivateKey,
      new ethers.providers.JsonRpcProvider(chainToSubmitTxnOnRpcUrl),
    );

    const litClient = await LitClient.create(
      "0x" + validateEnvVar("ETHEREUM_PRIVATE_KEY", command),
      {
        litNetwork: config.network,
      },
    );

    if (!config.pkp.publicKey) {
      const walletInfo = await litClient.createWallet();
      config.pkp = {
        publicKey: walletInfo.pkp.publicKey,
        tokenId: walletInfo.pkp.tokenId,
        ethAddress: walletInfo.pkp.ethAddress,
      };

      // Register the PKP with the LitAgentRegistry
      const registryContract = new ethers.Contract(
        litAgentRegistryAddress,
        LIT_AGENT_REGISTRY_ABI,
        ethersSignerChainToSubmitTxnOn,
      );

      try {
        console.log("Registering PKP with LitAgentRegistry...");
        const tx = await registryContract.registerPKP(config.pkp.ethAddress);
        await tx.wait();
        console.log("Successfully registered PKP with LitAgentRegistry");
        console.log(`Transaction hash: ${tx.hash}`);
      } catch (error) {
        console.error("Failed to register PKP with LitAgentRegistry:", error);
        throw error;
      }
    }

    if (!config.capacityTokenId) {
      config.capacityTokenId = litClient.getCapacityCreditId();
    }

    await litClient.disconnect();
  }

  return {
    capacityTokenId: config.capacityTokenId,
    pkp: config.pkp,
  };
};
