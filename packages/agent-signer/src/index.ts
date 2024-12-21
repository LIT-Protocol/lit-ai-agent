import * as LitJsSdk from '@lit-protocol/lit-node-client-nodejs';
import {
  LIT_NETWORK,
  LIT_RPC,
  AUTH_METHOD_SCOPE,
  AUTH_METHOD_SCOPE_VALUES,
} from '@lit-protocol/constants';
import { ethers } from 'ethers';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import {
  ExecuteJsResponse,
  LIT_NETWORKS_KEYS,
  MintWithAuthResponse,
  SigResponse,
  SessionSigsMap,
} from '@lit-protocol/types';
import { LocalStorage } from 'node-localstorage';

import { getSessionSigs } from './utils';

// @ts-expect-error we are trying to inject a global
global.localStorage = new LocalStorage('./lit-session-storage');
// @ts-expect-error assigning the global to a local variable
export const localStorage = global.localStorage as LocalStorage;

type ExecuteJsParams = {
  jsParams: object;
} & (
  | { code: string; ipfsId?: never }
  | { code?: never; ipfsId: string }
);

export class LitClient {
  litNodeClient: LitJsSdk.LitNodeClientNodeJs | null = null;
  ethersWallet: ethers.Wallet | null = null;
  litContracts: LitContracts | null = null;
  private pkp: MintWithAuthResponse<ethers.ContractReceipt>['pkp'] | null =
    null;
  private capacityCreditId: string | null = null;

  /**
   * Initialize the SDK
   * @param authKey The authentication key
   * @returns A Promise that resolves to a new LitClient instance
   */
  static async create(
    authKey: string,
    {
      litNetwork = LIT_NETWORK.DatilDev,
      debug = false,
    }: {
      litNetwork?: LIT_NETWORKS_KEYS;
      debug?: boolean;
    } = {}
  ): Promise<LitClient> {
    const client = new LitClient();
    client.litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
      litNetwork,
      debug,
    });
    await client.litNodeClient.connect();

    client.ethersWallet = new ethers.Wallet(
      authKey,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );

    client.litContracts = new LitContracts({
      signer: client.ethersWallet,
      network: litNetwork,
      debug,
    });
    await client.litContracts.connect();

    // Load PKP and capacity credit ID from storage
    try {
      const pkp = localStorage.getItem('pkp');
      const capacityCreditId = localStorage.getItem('capacityCreditId');
      
      if (pkp) {
        client.pkp = JSON.parse(pkp) as MintWithAuthResponse<ethers.ContractReceipt>['pkp'];
      }
      if (capacityCreditId) {
        client.capacityCreditId = capacityCreditId;
      }
    } catch (error) {
      // If storage files don't exist yet, that's okay - we'll create them when needed
      console.log('Storage not initialized yet: ', error);
    }

    return client;
  }

  private constructor() {}

  /**
   * Check if the client is ready
   */
  isReady(): boolean {
    if (!this.litNodeClient) {
      throw new Error('LitNodeClient not initialized');
    }
    return this.litNodeClient.ready;
  }

  /**
   * Execute JavaScript code
   */
  async executeJs(params: ExecuteJsParams): Promise<ExecuteJsResponse> {
    if (!this.litNodeClient) {
      throw new Error('LitNodeClient not initialized');
    }
    try {
      const sessionSigs = await getSessionSigs(this);

      return this.litNodeClient.executeJs({
        sessionSigs,
        ...params,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to execute JS: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a new wallet
   */
  async createWallet(): Promise<{
    pkp: { tokenId: string; publicKey: string; ethAddress: string };
    tx: ethers.ContractTransaction;
    tokenId: string;
    res: MintWithAuthResponse<ethers.ContractReceipt>;
  }> {
    if (!this.litContracts || !this.ethersWallet) {
      throw new Error('Client not properly initialized');
    }

    const mintInfo = await this.litContracts.pkpNftContractUtils.write.mint();

    // Save to storage
    localStorage.setItem('pkp', JSON.stringify(mintInfo.pkp));
    this.pkp = mintInfo.pkp;

    if (this.litContracts.network === LIT_NETWORK.DatilTest || this.litContracts.network === LIT_NETWORK.Datil) {
      const capacityCreditInfo = await this.litContracts.mintCapacityCreditsNFT({
        requestsPerKilosecond: 10,
        daysUntilUTCMidnightExpiration: 1,
      });
      localStorage.setItem("capacityCreditId", capacityCreditInfo.capacityTokenIdStr);
      this.capacityCreditId = capacityCreditInfo.capacityTokenIdStr;
    }

    return mintInfo;
  }

  /**
   * Get the PKP
   */
  getPkp() {
    const pkp = localStorage.getItem('pkp');
    return pkp
      ? (JSON.parse(pkp) as MintWithAuthResponse<ethers.ContractReceipt>['pkp'])
      : null;
  }

  /**
   * Add a permitted action to the PKP
   */
  async addPermittedAction({
    ipfsId,
    scopes = [AUTH_METHOD_SCOPE.SignAnything],
  }: {
    ipfsId: string;
    scopes?: AUTH_METHOD_SCOPE_VALUES[];
  }) {
    if (!this.ethersWallet || !this.pkp || !this.litContracts) {
      throw new Error('Client not properly initialized or PKP not set');
    }

    return this.litContracts.addPermittedAction({
      ipfsId,
      authMethodScopes: scopes,
      pkpTokenId: this.pkp.tokenId,
    });
  }

  /**
   * Sign a message
   */
  async sign({ toSign }: { toSign: string }): Promise<SigResponse> {
    if (!this.litNodeClient || !this.pkp) {
      throw new Error('Client not properly initialized or PKP not set');
    }

    const sessionSigs = await getSessionSigs(this);

    const signingResult = await this.litNodeClient.pkpSign({
      pubKey: this.pkp.publicKey,
      sessionSigs,
      toSign: ethers.utils.arrayify(toSign),
    });

    return signingResult;
  }

  /**
   * Disconnect the client and cleanup
   */
  async disconnect() {
    if (this.litNodeClient) {
      await this.litNodeClient.disconnect();
    }
  }

  /**
   * Get permitted auth methods for the PKP
   */
  async getPermittedAuthMethods() {
    if (!this.litNodeClient || !this.ethersWallet || !this.pkp || !this.litContracts) {
      throw new Error('Client not properly initialized or PKP not set');
    }

    return this.litContracts.pkpPermissionsContract.read.getPermittedAuthMethods(
      this.pkp.tokenId
    );
  }

  getCapacityCreditId() {
    return this.capacityCreditId;
  }

  getNetwork() {
    return this.litContracts?.network;
  }
}
