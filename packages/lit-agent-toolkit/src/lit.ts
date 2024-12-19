import { LitNodeClient } from "@lit-protocol/lit-node-client";
import {
  AUTH_METHOD_SCOPE,
  AUTH_METHOD_SCOPE_VALUES,
  LIT_ABILITY,
  LIT_NETWORK,
} from "@lit-protocol/constants";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { ethers } from "ethers";
import {
  AuthSig,
  createSiweMessage,
  generateAuthSig,
  LitAccessControlConditionResource,
  LitActionResource,
  LitPKPResource,
} from "@lit-protocol/auth-helpers";

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

export const mintPkp = async (litContracts: LitContracts) => {
  return await litContracts.pkpNftContractUtils.write.mint();
};

export const addPermittedActionToPkp = async (
  litContracts: LitContracts,
  pkpPublicKey: string,
  ipfsId: string,
  authMethodScopes: AUTH_METHOD_SCOPE_VALUES[] = [
    AUTH_METHOD_SCOPE.SignAnything,
  ]
) => {
  return litContracts.addPermittedAction({
    pkpTokenId: pkpPublicKey,
    ipfsId,
    authMethodScopes,
  });
};

export const getPermittedActionsForPkp = async (
  litContracts: LitContracts,
  pkpTokenId: string
) => {
  return litContracts.pkpPermissionsContractUtils.read.getPermittedActions(
    pkpTokenId
  );
};

const getCapacityCreditDelegationAuthSig = async (
  litNodeClient: LitNodeClient,
  ethersWallet: ethers.Wallet,
  capacityTokenId: string,
  delegateeAddresses: string[],
  uses: string = "1",
  expiration: string = new Date(Date.now() + 1000 * 60 * 10).toISOString() // 10 minutes
): Promise<AuthSig> => {
  const { capacityDelegationAuthSig } =
    await litNodeClient.createCapacityDelegationAuthSig({
      dAppOwnerWallet: ethersWallet,
      capacityTokenId,
      delegateeAddresses,
      uses,
      expiration,
    });

  return capacityDelegationAuthSig;
};

const getSessionSigs = async (
  litNodeClient: LitNodeClient,
  ethersWallet: ethers.Wallet,
  pkpInfo: { publicKey: string; tokenId: string },
  expiration: string = new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
  capacityDelegationAuthSig?: AuthSig
) => {
  return litNodeClient.getSessionSigs({
    chain: "ethereum",
    expiration,
    capabilityAuthSigs: capacityDelegationAuthSig
      ? [capacityDelegationAuthSig]
      : undefined,
    resourceAbilityRequests: [
      {
        resource: new LitActionResource("*"),
        ability: LIT_ABILITY.LitActionExecution,
      },
      {
        resource: new LitPKPResource(pkpInfo.tokenId),
        ability: LIT_ABILITY.PKPSigning,
      },
    ],
    authNeededCallback: async ({
      uri,
      expiration,
      resourceAbilityRequests,
    }) => {
      const toSign = await createSiweMessage({
        uri,
        expiration,
        resources: resourceAbilityRequests,
        walletAddress: await ethersWallet.getAddress(),
        nonce: await litNodeClient.getLatestBlockhash(),
        litNodeClient,
      });

      return await generateAuthSig({
        signer: ethersWallet,
        toSign,
      });
    },
  });
};

export const executeLitAction = async (
  litNodeClient: LitNodeClient,
  ethersWallet: ethers.Wallet,
  pkpInfo: { publicKey: string; tokenId: string },
  ipfsId: string,
  parameters: any,
  capacityTokenId?: string,
  delegateeAddresses?: string[]
) => {
  let capacityDelegationAuthSig: AuthSig | undefined;
  if (capacityTokenId !== undefined && delegateeAddresses !== undefined) {
    capacityDelegationAuthSig = await getCapacityCreditDelegationAuthSig(
      litNodeClient,
      ethersWallet,
      capacityTokenId,
      delegateeAddresses
    );
  }

  const sessionSigs = await getSessionSigs(
    litNodeClient,
    ethersWallet,
    pkpInfo,
    undefined,
    capacityDelegationAuthSig
  );

  return litNodeClient.executeJs({
    sessionSigs,
    ipfsId,
    jsParams: parameters,
  });
};
