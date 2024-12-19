import {
  mintCapacityCredit,
  getLitContractsClient,
  mintPkp,
} from "lit-agent-toolkit";
import { ethers } from "ethers";
import { LIT_RPC } from "@lit-protocol/constants";

import type { InitConfig } from "../commands/init";
import { ConfigManager } from "../utils/config";

const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY;
const LIT_AGENT_REGISTRY_ADDRESS = process.env.LIT_AGENT_REGISTRY_ADDRESS;

// ABI for the registerPKP function
const LIT_AGENT_REGISTRY_ABI = ["function registerPKP(address pkp) external"];

export const initLitProtocol = async (config: InitConfig) => {
  let capacityTokenId = config.capacityTokenId;
  let pkp = config.pkp;

  if (capacityTokenId === null || pkp.publicKey === null) {
    if (!ETHEREUM_PRIVATE_KEY) {
      throw new Error("ETHEREUM_PRIVATE_KEY environment variable is required");
    }

    if (!LIT_AGENT_REGISTRY_ADDRESS) {
      throw new Error(
        "LIT_AGENT_REGISTRY_ADDRESS environment variable is required"
      );
    }

    const ethersSignerChronicleYellowstone = new ethers.Wallet(
      ETHEREUM_PRIVATE_KEY,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );
    const ethersSignerLocalhost = new ethers.Wallet(
      ETHEREUM_PRIVATE_KEY,
      new ethers.providers.JsonRpcProvider("http://localhost:8545")
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
        LIT_AGENT_REGISTRY_ADDRESS,
        LIT_AGENT_REGISTRY_ABI,
        ethersSignerLocalhost
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
