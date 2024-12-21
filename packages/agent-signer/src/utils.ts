import { LitClient } from '.';

import { LIT_ABILITY, LIT_NETWORK } from '@lit-protocol/constants';
import {
  LitActionResource,
  LitPKPResource,
  createSiweMessage,
  generateAuthSig,
} from '@lit-protocol/auth-helpers';
import { SessionSigsMap } from '@lit-protocol/types';


export async function getSessionSigs(
  litClient: LitClient
): Promise<SessionSigsMap> {
  if (!litClient.litNodeClient) {
    throw new Error('Lit Node Client not properly initialized');
  }
  if (!litClient.ethersWallet) {
    throw new Error('Ethers Wallet not properly initialized');
  }
  if(!litClient.litContracts) {
    throw new Error('Lit Contracts not properly initialized');
  }

  let capacityDelegationAuthSig;
  if (litClient.litContracts.network === LIT_NETWORK.DatilTest || litClient.litContracts.network === LIT_NETWORK.Datil) {
    const capacityCreditId = litClient.getCapacityCreditId();
    if (capacityCreditId) {
      capacityDelegationAuthSig = await litClient.litNodeClient.createCapacityDelegationAuthSig({
        dAppOwnerWallet: litClient.ethersWallet,
        capacityTokenId: capacityCreditId,
        delegateeAddresses: [litClient.ethersWallet.address],
        uses: "1",
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString()
      });
    }
  }

  // get session sigs
  const sessionSigs = await litClient.litNodeClient.getSessionSigs({
    chain: 'ethereum',
    expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
    capabilityAuthSigs: capacityDelegationAuthSig
      ? [capacityDelegationAuthSig.capacityDelegationAuthSig]
      : undefined,
    resourceAbilityRequests: [
      {
        resource: new LitActionResource('*'),
        ability: LIT_ABILITY.LitActionExecution,
      },
      {
        resource: new LitPKPResource('*'),
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
        walletAddress: await litClient.ethersWallet!.getAddress(),
        nonce: await litClient.litNodeClient!.getLatestBlockhash(),
        litNodeClient: litClient.litNodeClient,
      });

      return await generateAuthSig({
        signer: litClient.ethersWallet!,
        toSign,
      });
    },
  });
  return sessionSigs;
}
