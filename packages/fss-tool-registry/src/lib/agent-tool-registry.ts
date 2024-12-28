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
import { ethers } from 'ethers';

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

export const SUPPORTED_TOOLS = ['SendERC20'] as const;
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
  [key: string]: string | string[] | undefined;
}

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
  ];
}

export function isToolSupported(
  toolType: string
): toolType is SupportedToolTypes {
  return SUPPORTED_TOOLS.includes(toolType as SupportedToolTypes);
}

export function getToolFromRegistry(toolName: string) {
  if (!isToolSupported(toolName)) {
    throw new Error(`Unsupported tool: ${toolName}`);
  }

  if (toolName === 'SendERC20') return SendERC20;

  // TypeScript will catch if we miss any supported tool
  throw new Error(
    `Tool ${toolName} is supported but not implemented in registry`
  );
}

export function validateParamsAgainstPolicy(
  tool: ToolInfo,
  params: Record<string, string>,
  policyValues: PolicyValues
): void {
  // Check each policy field
  for (const [key, value] of Object.entries(policyValues)) {
    // Skip type and version fields
    if (key === 'type' || key === 'version') continue;

    // Handle arrays (like allowedTokens, allowedRecipients)
    if (Array.isArray(value) && value.length > 0) {
      // Find the corresponding parameter by looking for a parameter that ends with the array name
      // e.g., 'allowedTokens' -> 'tokenIn', 'allowedRecipients' -> 'recipientAddress'
      const paramKey = Object.keys(params).find((param) =>
        key
          .toLowerCase()
          .includes(
            param.toLowerCase().replace('in', '').replace('address', '')
          )
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
    // Handle numeric restrictions (like maxAmount)
    else if (key.toLowerCase().startsWith('max') && typeof value === 'string') {
      // Find the corresponding parameter by looking for a parameter that ends with 'amount'
      const paramKey = Object.keys(params).find((param) =>
        param.toLowerCase().includes('amount')
      );

      if (paramKey) {
        try {
          // Convert both values to wei for comparison
          // params[paramKey] is in ether units (e.g., "10" means 10 ETH)
          const amount = ethers.utils.parseEther(params[paramKey]);
          // policyValues[key] is already in wei
          const maxAmount = ethers.BigNumber.from(value);

          if (amount.gt(maxAmount)) {
            throw new Error(
              `${paramKey} ${
                params[paramKey]
              } ETH exceeds policy maximum of ${ethers.utils.formatEther(
                maxAmount
              )} ETH`
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
