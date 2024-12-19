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

export const initLitProtocol = async (config: InitConfig) => {
  let capacityTokenId = config.capacityTokenId;
  let pkpPublicKey = config.pkpPublicKey;
  if (capacityTokenId === null || pkpPublicKey === null) {
    if (!ETHEREUM_PRIVATE_KEY) {
      throw new Error("ETHEREUM_PRIVATE_KEY environment variable is required");
    }

    const ethersSigner = new ethers.Wallet(
      ETHEREUM_PRIVATE_KEY,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );

    const litContractsClient = await getLitContractsClient(
      ethersSigner,
      config.network
    );

    if (capacityTokenId === null) {
      await ConfigManager.saveConfig({
        capacityTokenId: await mintCapacityCredit(litContractsClient),
      });
    }

    if (pkpPublicKey === null) {
      const pkpInfo = await mintPkp(litContractsClient);
      await ConfigManager.saveConfig({
        pkpPublicKey: pkpInfo.pkp.publicKey,
      });
    }
  }

  return {
    capacityTokenId,
    pkpPublicKey,
  };
};
