import type { ContractTransaction } from 'ethers';
import type { ExecuteJsResponse, SigResponse } from '@lit-protocol/types';

export interface PkpInfo {
  tokenId: string;
  publicKey: string;
  ethAddress: string;
}

export interface CapacityCreditMintOptions {
  requestsPerKilosecond?: number;
  daysUntilUTCMidnightExpiration?: number;
}

export interface CapacityCreditDelegationAuthSigOptions {
  delegateeAddresses: string[];
  uses?: string;
  expiration?: string;
}

export interface AuthSig {
  sig: string;
  derivedVia: string;
  signedMessage: string;
  address: string;
}

export interface PkpSessionSigsOptions {
  capacityDelegationAuthSig?: AuthSig;
  expiration?: string;
}

/**
 * Parameters for executing JavaScript code
 * Note: sessionSigs are handled internally by the AgentSigner
 */
export interface ExecuteJsParams {
  /**
   * JavaScript code to execute. Required if ipfsId is not provided.
   */
  code?: string;
  /**
   * IPFS CID of the JavaScript code to execute. Required if code is not provided.
   */
  ipfsId?: string;
  /**
   * Optional authentication signature
   */
  authSig?: AuthSig;
  /**
   * Optional parameters to pass to the JavaScript code
   */
  jsParams?: Record<string, unknown>;
  /**
   * Enable debug mode
   */
  debug?: boolean;
}

/**
 * Options for setting a tool policy
 */
export interface ToolPolicyData {
  maxAmount?: string;
  allowedTokens?: string[];
  allowedRecipients?: string[];
  allowedMessagePrefixes?: string[];
  [key: string]: string | string[] | undefined;
}

export interface SetToolPolicyOptions {
  /**
   * IPFS CID of the tool (must be CID v0)
   */
  ipfsCid: string;
  /**
   * Tool-specific policy data that will be ABI encoded
   */
  policy: ToolPolicyData;
  /**
   * Version of the policy (e.g., "1.0.0")
   */
  version: string;
}

/**
 * Tool policy information returned from the registry
 */
export interface ToolPolicy {
  /**
   * ABI encoded policy data
   */
  policy: string;
  /**
   * Version of the policy
   */
  version: string;
}

/**
 * Registered tool information
 */
export interface RegisteredTools {
  /**
   * Array of IPFS CIDs for registered tools
   */
  ipfsCids: string[];
  /**
   * Array of ABI encoded policy data
   */
  policyData: string[];
  /**
   * Array of policy versions
   */
  versions: string[];
}

/**
 * Tool policy registry configuration
 */
export interface ToolPolicyRegistryConfig {
  /**
   * RPC URL for the tool policy registry contract
   * @default 'https://yellowstone-rpc.litprotocol.com/'
   */
  rpcUrl: string;

  /**
   * Contract address for the tool policy registry
   * @default '0xD78e1C1183A29794A092dDA7dB526A91FdE36020'
   */
  contractAddress: string;
}

export interface PermittedAction {
  ipfsCid: string;
  scopes: string[];
  status: string;
}

export interface AgentSigner {
  setToolPolicy(options: SetToolPolicyOptions): Promise<ContractTransaction>;
  removeToolPolicy(ipfsCid: string): Promise<ContractTransaction>;
  getToolPolicy(ipfsCid: string): Promise<ToolPolicy>;
  getRegisteredTools(): Promise<RegisteredTools>;
  executeJs(params: ExecuteJsParams): Promise<ExecuteJsResponse>;
  pkpSign({ toSign }: { toSign: string }): Promise<SigResponse>;
  pkpPermitLitAction(params: {
    ipfsCid: string;
    signingScopes?: string[];
  }): Promise<PermittedAction>;
  pkpListPermittedActions(): Promise<PermittedAction[]>;
  disconnectLitNodeClient(): Promise<void>;
}
