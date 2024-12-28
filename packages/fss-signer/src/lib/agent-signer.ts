import { ethers } from 'ethers';
import type {
  ExecuteJsResponse,
  LIT_NETWORKS_KEYS,
  SigResponse,
  JsonExecutionSdkParams,
} from '@lit-protocol/types';
import {
  AUTH_METHOD_SCOPE,
  AUTH_METHOD_SCOPE_VALUES,
} from '@lit-protocol/constants';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LIT_RPC } from '@lit-protocol/constants';
import { LIT_NETWORK } from '@lit-protocol/constants';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';

import {
  CapacityCreditMintOptions,
  SetToolPolicyOptions,
  ToolPolicy,
  RegisteredTools,
  PkpInfo,
  ExecuteJsParams,
  ToolPolicyRegistryConfig,
} from './types';
import { LocalStorageImpl } from './storage';
import {
  loadPkpFromStorage,
  createPkpWallet,
  permitLitAction,
  listPermittedActions,
  loadCapacityCreditFromStorage,
  requiresCapacityCredit,
  mintCapacityCredit,
  getCapacityCreditDelegationAuthSig,
  getPkpSessionSigs,
  createToolPolicyContract,
  setToolPolicy,
  removeToolPolicy,
  getToolPolicy,
  getRegisteredTools,
} from './utils';
import { LitAgentError, LitAgentErrorType } from './errors';

export class AgentSigner {
  private litNodeClient: LitNodeClientNodeJs | null = null;
  private ethersWallet: ethers.Wallet | null = null;
  private litContracts: LitContracts | null = null;
  private toolPolicyContract: ethers.Contract | null = null;
  private pkpInfo: PkpInfo | null = null;

  private storage = new LocalStorageImpl();

  /**
   * Get PKP info from storage
   */
  static getPkpInfoFromStorage(): PkpInfo | null {
    const storage = new LocalStorageImpl();
    return loadPkpFromStorage(storage);
  }

  /**
   * Get the Lit token balance of the PKP wallet
   */
  async getLitTokenBalance(): Promise<ethers.BigNumber> {
    const pkpInfo = loadPkpFromStorage(this.storage);
    if (!pkpInfo) {
      throw new LitAgentError(
        LitAgentErrorType.INITIALIZATION_FAILED,
        'No PKP wallet found in storage'
      );
    }

    if (!this.ethersWallet?.provider) {
      throw new LitAgentError(
        LitAgentErrorType.INITIALIZATION_FAILED,
        'Ethers provider not initialized'
      );
    }

    return await this.ethersWallet.provider.getBalance(pkpInfo.ethAddress);
  }

  /**
   * Initialize the SDK
   */
  static async create(
    authPrivateKey: string,
    {
      litNetwork = LIT_NETWORK.DatilTest,
      debug = false,
      toolPolicyRegistryConfig = {
        rpcUrl: LIT_RPC.CHRONICLE_YELLOWSTONE,
        contractAddress: '0xD78e1C1183A29794A092dDA7dB526A91FdE36020',
      },
    }: {
      litNetwork?: LIT_NETWORKS_KEYS;
      debug?: boolean;
      toolPolicyRegistryConfig?: ToolPolicyRegistryConfig;
    }
  ): Promise<AgentSigner> {
    const agentSigner = new AgentSigner();

    // Initialize Lit Node Client
    agentSigner.litNodeClient = new LitNodeClientNodeJs({
      litNetwork,
      debug,
    });
    await agentSigner.litNodeClient.connect();

    // Initialize Ethers Wallet
    agentSigner.ethersWallet = new ethers.Wallet(
      authPrivateKey,
      new ethers.providers.JsonRpcProvider(toolPolicyRegistryConfig.rpcUrl)
    );

    const ethersWalletBalance = await agentSigner.ethersWallet.getBalance();
    if (ethersWalletBalance.lt(ethers.utils.parseEther('0.01'))) {
      throw new Error(
        'Insufficient balance: Auth wallet does not have enough Lit test tokens'
      );
    }

    // Initialize Lit Contracts
    agentSigner.litContracts = new LitContracts({
      signer: agentSigner.ethersWallet,
      network: litNetwork,
      debug,
    });
    await agentSigner.litContracts.connect();

    // Load PKP from storage
    agentSigner.pkpInfo = loadPkpFromStorage(agentSigner.storage);

    // Initialize tool policy registry
    try {
      await agentSigner.initToolPolicyRegistry(
        toolPolicyRegistryConfig.contractAddress
      );
    } catch (error) {
      throw new Error(
        `Failed to initialize tool policy registry at ${
          toolPolicyRegistryConfig.contractAddress
        }: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return agentSigner;
  }

  /**
   * Initialize the tool policy registry
   */
  private async initToolPolicyRegistry(contractAddress: string) {
    if (!this.ethersWallet) {
      throw new Error(
        'Cannot initialize tool policy registry: Agent signer not properly initialized'
      );
    }

    try {
      this.toolPolicyContract = createToolPolicyContract(
        contractAddress,
        this.ethersWallet.provider
      );

      // Verify the contract exists by calling a view function
      await this.toolPolicyContract.getActionPolicy(
        this.ethersWallet.address,
        '0x0000000000000000000000000000000000000000000000000000000000000000' // dummy IPFS CID
      );
    } catch {
      throw new Error(
        `Failed to initialize tool policy registry: Contract not found at ${contractAddress} or is not a valid tool policy registry`
      );
    }
  }

  /**
   * Create a new PKP wallet
   */
  async createWallet(options: CapacityCreditMintOptions = {}) {
    if (!this.litContracts) {
      throw new Error('Agent signer not properly initialized');
    }

    // Create PKP wallet
    const walletInfo = await createPkpWallet(this.litContracts, this.storage);
    this.pkpInfo = walletInfo.pkpInfo;

    // Mint capacity credit if needed
    if (this.litContracts) {
      await mintCapacityCredit(this.litContracts, this.storage, options);
    }

    return walletInfo;
  }

  /**
   * Sign data with the PKP
   */
  async pkpSign({ toSign }: { toSign: string }): Promise<SigResponse> {
    if (!this.litNodeClient || !this.litContracts || !this.ethersWallet) {
      throw new Error('Agent signer not properly initialized');
    }

    if (!this.pkpInfo) {
      throw new Error('PKP not set');
    }

    let capacityDelegationAuthSig;
    if (requiresCapacityCredit(this.litContracts)) {
      const capacityCreditId = loadCapacityCreditFromStorage(this.storage);
      if (!capacityCreditId) {
        throw new Error('Capacity credit not found');
      }

      capacityDelegationAuthSig = await getCapacityCreditDelegationAuthSig(
        this.litNodeClient,
        this.ethersWallet,
        capacityCreditId,
        {
          delegateeAddresses: [this.pkpInfo.ethAddress],
        }
      );
    }

    const sessionSigs = await getPkpSessionSigs(
      this.litNodeClient,
      this.ethersWallet,
      {
        capacityDelegationAuthSig,
      }
    );

    return this.litNodeClient.pkpSign({
      pubKey: this.pkpInfo.publicKey,
      sessionSigs,
      toSign: ethers.utils.arrayify(toSign),
    });
  }

  /**
   * Execute JavaScript code
   */
  async executeJs(params: ExecuteJsParams): Promise<ExecuteJsResponse> {
    if (!this.litNodeClient || !this.litContracts || !this.ethersWallet) {
      throw new Error('Agent signer not properly initialized');
    }

    if (!this.pkpInfo) {
      throw new Error('PKP not set');
    }

    let capacityDelegationAuthSig;
    if (requiresCapacityCredit(this.litContracts)) {
      const capacityCreditId = loadCapacityCreditFromStorage(this.storage);
      if (!capacityCreditId) {
        throw new Error('Capacity credit not found');
      }

      capacityDelegationAuthSig = await getCapacityCreditDelegationAuthSig(
        this.litNodeClient,
        this.ethersWallet,
        capacityCreditId,
        {
          delegateeAddresses: [this.pkpInfo.ethAddress],
        }
      );
    }

    const sessionSigs = await getPkpSessionSigs(
      this.litNodeClient,
      this.ethersWallet,
      {
        capacityDelegationAuthSig,
      }
    );

    try {
      // Convert our simpler ExecuteJsParams to JsonExecutionSdkParams
      const execParams: JsonExecutionSdkParams = {
        ...params,
        sessionSigs,
      };

      return this.litNodeClient.executeJs(execParams);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to execute JS: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Set or update a policy for a specific tool
   */
  async setToolPolicy(
    options: SetToolPolicyOptions
  ): Promise<ethers.ContractTransaction> {
    if (!this.toolPolicyContract || !this.ethersWallet || !this.pkpInfo) {
      throw new Error('Tool policy manager not initialized');
    }

    try {
      return await setToolPolicy(
        this.toolPolicyContract,
        this.pkpInfo.ethAddress,
        (toSign: string) => this.pkpSign({ toSign }),
        this.ethersWallet.provider,
        options
      );
    } catch (error) {
      // Wrap any errors in LitAgentError
      let errorMessage = 'Failed to set tool policy';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new LitAgentError(
        LitAgentErrorType.TOOL_POLICY_REGISTRATION_FAILED,
        errorMessage,
        { options, originalError: error }
      );
    }
  }

  /**
   * Remove a policy for a specific tool
   */
  async removeToolPolicy(ipfsCid: string): Promise<ethers.ContractTransaction> {
    if (!this.toolPolicyContract || !this.ethersWallet || !this.pkpInfo) {
      throw new Error('Tool policy manager not initialized');
    }

    try {
      return await removeToolPolicy(
        this.toolPolicyContract,
        this.pkpInfo.ethAddress,
        (toSign: string) => this.pkpSign({ toSign }),
        this.ethersWallet.provider,
        ipfsCid
      );
    } catch (error) {
      // Wrap any errors in LitAgentError
      if (error instanceof LitAgentError) {
        throw error;
      }
      let errorMessage = 'Failed to remove tool policy';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new LitAgentError(
        LitAgentErrorType.TOOL_POLICY_REGISTRATION_FAILED,
        errorMessage,
        { ipfsCid, originalError: error }
      );
    }
  }

  /**
   * Get the policy for a specific tool
   */
  async getToolPolicy(ipfsCid: string): Promise<ToolPolicy> {
    if (!this.toolPolicyContract || !this.pkpInfo) {
      throw new Error('Tool policy manager not initialized');
    }

    return getToolPolicy(
      this.toolPolicyContract,
      this.pkpInfo.ethAddress,
      ipfsCid
    );
  }

  /**
   * Get all registered tools and their policies
   */
  async getRegisteredTools(): Promise<RegisteredTools> {
    if (!this.toolPolicyContract || !this.pkpInfo) {
      throw new Error('Tool policy manager not initialized');
    }

    return getRegisteredTools(this.toolPolicyContract, this.pkpInfo.ethAddress);
  }

  /**
   * Disconnect from the Lit Node Client
   */
  async disconnectLitNodeClient() {
    if (this.litNodeClient) {
      await this.litNodeClient.disconnect();
    }
  }

  /**
   * Permit a Lit Action to be executed by this PKP
   */
  async pkpPermitLitAction({
    ipfsCid,
    signingScopes = [AUTH_METHOD_SCOPE.SignAnything],
  }: {
    ipfsCid: string;
    signingScopes?: AUTH_METHOD_SCOPE_VALUES[];
  }) {
    if (!this.litContracts || !this.pkpInfo) {
      throw new Error('Agent signer not properly initialized');
    }

    return permitLitAction(this.litContracts, this.pkpInfo, {
      ipfsCid,
      signingScopes,
    });
  }

  /**
   * List all permitted Lit Actions for this PKP
   */
  async pkpListPermittedActions() {
    if (!this.litContracts || !this.pkpInfo) {
      throw new Error('Agent signer not properly initialized');
    }

    return listPermittedActions(this.litContracts, this.pkpInfo);
  }
}
