import {
  SendERC20LitActionParameters,
  SendERC20LitActionSchema,
  SendERC20LitActionMetadata,
  SendERC20LitActionParameterDescriptions,
  isValidSendERC20Parameters,
  sendERC20LitActionDescription,
  SendERC20Policy,
  SendERC20PolicySchema,
  encodeSendERC20Policy,
  decodeSendERC20Policy,
  IPFS_CID as SendERC20IpfsCid,
} from '@lit-protocol/fss-tool-erc20-send';

import {
  SwapUniswapLitActionParameters,
  SwapUniswapLitActionSchema,
  SwapUniswapLitActionMetadata,
  SwapUniswapLitActionParameterDescriptions,
  isValidSwapUniswapParameters,
  swapUniswapLitActionDescription,
  SwapUniswapPolicy,
  SwapUniswapPolicySchema,
  encodeSwapUniswapPolicy,
  decodeSwapUniswapPolicy,
  IPFS_CID as SwapUniswapIpfsCid,
} from '@lit-protocol/fss-tool-swap-uniswap';

import {
  SigningSimpleLitActionParameters,
  SigningSimpleLitActionSchema,
  SigningSimpleLitActionMetadata,
  SigningSimpleLitActionParameterDescriptions,
  isValidSigningSimpleParameters,
  signingSimpleLitActionDescription,
  SigningSimplePolicy,
  SigningSimplePolicySchema,
  encodeSigningSimplePolicy,
  decodeSigningSimplePolicy,
  IPFS_CID as SigningSimpleIpfsCid,
} from '@lit-protocol/fss-tool-signing-simple';

import { ethers } from 'ethers';

/**
 * Minimal ERC-20 ABI for retrieving decimals.
 * Adjust as needed, but must include at least "decimals()".
 */
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
];

export const SendERC20 = {
  description: sendERC20LitActionDescription,
  ipfsCid: SendERC20IpfsCid,

  Parameters: {
    type: {} as SendERC20LitActionParameters,
    schema: SendERC20LitActionSchema,
    descriptions: SendERC20LitActionParameterDescriptions,
    validate: isValidSendERC20Parameters,
  },

  metadata: SendERC20LitActionMetadata,

  Policy: {
    type: {} as SendERC20Policy,
    schema: SendERC20PolicySchema,
    encode: encodeSendERC20Policy,
    decode: (encodedPolicy: string, version: string) =>
      decodeSendERC20Policy(encodedPolicy, version),
  },
} as const;

export const SwapUniswap = {
  description: swapUniswapLitActionDescription,
  ipfsCid: SwapUniswapIpfsCid,

  Parameters: {
    type: {} as SwapUniswapLitActionParameters,
    schema: SwapUniswapLitActionSchema,
    descriptions: SwapUniswapLitActionParameterDescriptions,
    validate: isValidSwapUniswapParameters,
  },

  metadata: SwapUniswapLitActionMetadata,

  Policy: {
    type: {} as SwapUniswapPolicy,
    schema: SwapUniswapPolicySchema,
    encode: encodeSwapUniswapPolicy,
    decode: (encodedPolicy: string, version: string) =>
      decodeSwapUniswapPolicy(encodedPolicy, version),
  },
} as const;

export const SigningSimple = {
  description: signingSimpleLitActionDescription,
  ipfsCid: SigningSimpleIpfsCid,

  Parameters: {
    type: {} as SigningSimpleLitActionParameters,
    schema: SigningSimpleLitActionSchema,
    descriptions: SigningSimpleLitActionParameterDescriptions,
    validate: isValidSigningSimpleParameters,
  },

  metadata: SigningSimpleLitActionMetadata,

  Policy: {
    type: {} as SigningSimplePolicy,
    schema: SigningSimplePolicySchema,
    encode: encodeSigningSimplePolicy,
    decode: (encodedPolicy: string, version: string) =>
      decodeSigningSimplePolicy(encodedPolicy, version),
  },
} as const;

export const SUPPORTED_TOOLS = ['SendERC20', 'SwapUniswap', 'SigningSimple'] as const;
export type SupportedToolTypes = (typeof SUPPORTED_TOOLS)[number];

export interface ToolInfo {
  name: string;
  description: string;
  ipfsCid: string;
  parameters: {
    name: string;
    description: string;
  }[];
}

export interface PolicyValues {
  type: string;
  version: string;
  maxAmount?: string;
  allowedTokens?: string[];
  allowedRecipients?: string[];
  allowedMessagePrefixes?: string[];
  [key: string]: string | string[] | undefined;
}

/**
 * Lists the available tools in the registry.
 */
export function listAvailableTools(): ToolInfo[] {
  return [
    {
      name: 'SendERC20',
      description: SendERC20.description as string,
      ipfsCid: SendERC20.ipfsCid,
      parameters: Object.entries(SendERC20.Parameters.descriptions).map(
        ([name, description]) => ({
          name,
          description: description as string,
        })
      ),
    },
    {
      name: 'SwapUniswap',
      description: SwapUniswap.description as string,
      ipfsCid: SwapUniswap.ipfsCid,
      parameters: Object.entries(SwapUniswap.Parameters.descriptions).map(
        ([name, description]) => ({
          name,
          description: description as string,
        })
      ),
    },
    {
      name: 'SigningSimple',
      description: SigningSimple.description as string,
      ipfsCid: SigningSimple.ipfsCid,
      parameters: Object.entries(SigningSimple.Parameters.descriptions).map(
        ([name, description]) => ({
          name,
          description: description as string,
        })
      ),
    },
  ];
}

/**
 * Checks if a given string is one of the supported tool types.
 */
export function isToolSupported(
  toolType: string
): toolType is SupportedToolTypes {
  return SUPPORTED_TOOLS.includes(toolType as SupportedToolTypes);
}

/**
 * Fetches a tool from the registry by name, or throws if unsupported.
 */
export function getToolFromRegistry(toolName: string) {
  if (!isToolSupported(toolName)) {
    throw new Error(`Unsupported tool: ${toolName}`);
  }

  if (toolName === 'SendERC20') return SendERC20;
  if (toolName === 'SwapUniswap') return SwapUniswap;
  if (toolName === 'SigningSimple') return SigningSimple;

  // TypeScript will catch if we miss any supported tool
  throw new Error(`Tool ${toolName} is supported but not implemented in registry`);
}

/**
 * Validates parameters against a policy.
 */
export async function validateParamsAgainstPolicy(
  tool: ToolInfo,
  params: Record<string, string>,
  policyValues: PolicyValues,
  provider: ethers.providers.Provider
): Promise<void> {
  // Create a new provider if chainId/rpcUrl are provided in params
  if (params.chainId && params.rpcUrl) {
    const chainId = parseInt(params.chainId);
    provider = new ethers.providers.JsonRpcProvider(params.rpcUrl, chainId);
  }

  // Loop through each policy entry
  for (const [key, value] of Object.entries(policyValues)) {
    // Skip these known fields
    if (key === 'type' || key === 'version') continue;

    // Handle arrays (like allowedTokens, allowedRecipients, allowedMessagePrefixes)
    if (Array.isArray(value) && value.length > 0) {
      if (key === 'allowedMessagePrefixes' && params.message) {
        // For SigningSimple, check message prefixes
        const isAllowed = value.some((prefix: string) =>
          params.message.startsWith(prefix)
        );

        if (!isAllowed) {
          throw new Error(
            `Message does not start with any of the allowed prefixes: ${value.join(
              ', '
            )}`
          );
        }
      } else {
        // For other tools (SendERC20, SwapUniswap), check allowed values
        const paramKey = Object.keys(params).find((param) =>
          key
            .toLowerCase()
            .includes(param.toLowerCase().replace('in', '').replace('address', ''))
        );

        if (paramKey) {
          const paramValue = params[paramKey].toLowerCase();
          const allowedValues = value.map((v: string) => v.toLowerCase());

          if (!allowedValues.includes(paramValue)) {
            throw new Error(
              `${paramKey} ${params[paramKey]} is not in the allowed list`
            );
          }
        }
      }
    }
    // Handle numeric restrictions (like "maxAmount")
    else if (key.toLowerCase().startsWith('max') && typeof value === 'string') {
      // Find the corresponding parameter by looking for a parameter
      // that includes 'amount' in its name
      const paramKey = Object.keys(params).find((param) =>
        param.toLowerCase().includes('amount')
      );

      if (paramKey) {
        try {
          // Attempt to find which token param pairs with this amount param
          // e.g., if paramKey is "amountIn", the token param might be "tokenIn"
          const tokenKey = paramKey.replace('amount', 'token');
          const tokenAddress = params[tokenKey];

          if (!tokenAddress) {
            throw new Error(
              `No token address found for paramKey="${paramKey}". ` +
              `Expected something like "${tokenKey}": "0x..."`
            );
          }

          // Create a contract for the token to retrieve decimals
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const decimals = await tokenContract.decimals().catch(() => 18); // Default to 18 if call fails

          // Convert user-supplied amount to a BigNumber using on-chain decimals
          const userAmountBN = ethers.utils.parseUnits(params[paramKey], decimals);

          // Convert policy max amount to a BigNumber using the same decimals
          const policyMaxBN = ethers.utils.parseUnits(value, decimals);

          // Compare
          if (userAmountBN.gt(policyMaxBN)) {
            throw new Error(
              `Failed to validate amount: "${paramKey}" ` +
              `${ethers.utils.formatUnits(userAmountBN, decimals)} ` +
              `exceeds policy maximum of ${ethers.utils.formatUnits(policyMaxBN, decimals)}`
            );
          }
        } catch (err) {
          const error = err as Error;
          throw new Error(`Failed to validate amount: ${error.message}`);
        }
      }
    }
  }
}
