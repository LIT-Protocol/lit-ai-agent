import {
  AUTH_METHOD_SCOPE,
  AUTH_METHOD_SCOPE_VALUES,
  LIT_RPC,
} from "@lit-protocol/constants";
import { ethers } from "ethers";
import { getLitContractsClient } from "lit-agent-toolkit";

import { InitConfig } from "../../commands/init";

const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY;

export const addPermittedActionToPkp = async (
  config: Partial<InitConfig>,
  ipfsId: string,
  authMethodScopes: AUTH_METHOD_SCOPE_VALUES[] = [
    AUTH_METHOD_SCOPE.SignAnything,
  ]
) => {
  if (!config.network || !config.pkp?.tokenId) {
    throw new Error("Network and PKP Token ID are required");
  }

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

  return litContractsClient.addPermittedAction({
    pkpTokenId: config.pkp.tokenId,
    ipfsId,
    authMethodScopes,
  });
};
