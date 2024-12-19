import {
  mintCapacityCredit,
  getLitContractsClient,
  mintPkp,
} from "lit-agent-toolkit";
import { ethers } from "ethers";
import { LIT_RPC } from "@lit-protocol/constants";
import type { Command } from "commander";

import type { InitConfig } from "../commands/init";
import { ConfigManager } from "../utils/config";
import { validateEnvVar } from "../utils/env";

const LIT_AGENT_REGISTRY_ABI = ["function registerPKP(address pkp) external"];

export const initLitProtocol = async (command: Command, config: InitConfig) => {
  let capacityTokenId = config.capacityTokenId;
  let pkp = config.pkp;

  if (capacityTokenId === null || pkp.publicKey === null) {
    const ethereumPrivateKey = validateEnvVar("ETHEREUM_PRIVATE_KEY", command);
    const litAgentRegistryAddress = validateEnvVar(
      "LIT_AGENT_REGISTRY_ADDRESS",
      command
    );
    const chainToSubmitTxnOnRpcUrl = validateEnvVar(
      "CHAIN_TO_SUBMIT_TXN_ON_RPC_URL",
      command
    );

    const ethersSignerChronicleYellowstone = new ethers.Wallet(
      ethereumPrivateKey,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );
    const ethersSignerChainToSubmitTxnOn = new ethers.Wallet(
      ethereumPrivateKey,
      new ethers.providers.JsonRpcProvider(chainToSubmitTxnOnRpcUrl)
    );

    const litContractsClient = await getLitContractsClient(
      ethersSignerChronicleYellowstone,
      config.network
    );

    if (capacityTokenId === null) {
      capacityTokenId = await mintCapacityCredit(litContractsClient);
      await ConfigManager.saveConfig({
        capacityTokenId,
      });
    }

    if (pkp.publicKey === null) {
      const pkpInfo = await mintPkp(litContractsClient);
      pkp = {
        publicKey: pkpInfo.pkp.publicKey,
        tokenId: pkpInfo.pkp.tokenId,
        ethAddress: pkpInfo.pkp.ethAddress,
      };

      // Register the PKP with the LitAgentRegistry
      const registryContract = new ethers.Contract(
        litAgentRegistryAddress,
        LIT_AGENT_REGISTRY_ABI,
        ethersSignerChainToSubmitTxnOn
      );

      try {
        console.log("Registering PKP with LitAgentRegistry...");
        const tx = await registryContract.registerPKP(pkp.ethAddress);
        await tx.wait();
        console.log("Successfully registered PKP with LitAgentRegistry");
        console.log(`Transaction hash: ${tx.hash}`);
      } catch (error) {
        console.error("Failed to register PKP with LitAgentRegistry:", error);
        throw error;
      }

      await ConfigManager.saveConfig({
        pkp,
      });
    }
  }

  return {
    capacityTokenId,
    pkp,
  };
};
