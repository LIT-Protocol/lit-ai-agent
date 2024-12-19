import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from "@lit-protocol/constants";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { ethers } from "ethers";

export const getLitNodeClient = async (
  litNetwork: (typeof LIT_NETWORK)[keyof typeof LIT_NETWORK],
  debug: boolean = false
) => {
  const litNodeClient = new LitNodeClient({
    litNetwork,
    debug,
  });
  await litNodeClient.connect();
  return litNodeClient;
};

export const getLitContractsClient = async (
  ethersSigner: ethers.Wallet,
  litNetwork: (typeof LIT_NETWORK)[keyof typeof LIT_NETWORK],
  debug: boolean = false
) => {
  const litContractsClient = new LitContracts({
    signer: ethersSigner,
    network: litNetwork,
    debug,
  });
  await litContractsClient.connect();
  return litContractsClient;
};

export const mintCapacityCredit = async (
  litContractsClient: LitContracts,
  requestsPerKilosecond: number = 10,
  daysUntilUTCMidnightExpiration: number = 1
) => {
  return (
    await litContractsClient.mintCapacityCreditsNFT({
      requestsPerKilosecond,
      daysUntilUTCMidnightExpiration,
    })
  ).capacityTokenIdStr;
};

export const getPkpInfoFromMintReceipt = async (
  txReceipt: ethers.ContractReceipt,
  litContractsClient: LitContracts
) => {
  const pkpMintedEvent = txReceipt!.events!.find(
    (event) =>
      event.topics[0] ===
      "0x3b2cc0657d0387a736293d66389f78e4c8025e413c7a1ee67b7707d4418c46b8"
  );

  const publicKey = "0x" + pkpMintedEvent!.data.slice(130, 260);
  const tokenId = ethers.utils.keccak256(publicKey);
  const ethAddress =
    await litContractsClient.pkpNftContract.read.getEthAddress(tokenId);

  return {
    tokenId: ethers.BigNumber.from(tokenId).toString(),
    publicKey,
    ethAddress,
  };
};

export const mintPkp = async (litContracts: LitContracts) => {
  return await litContracts.pkpNftContractUtils.write.mint();
};

export const addAuthMethodToPkp = async () => {};
