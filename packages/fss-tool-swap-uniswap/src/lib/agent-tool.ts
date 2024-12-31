import { z } from 'zod';

export const swapUniswapLitActionDescription =
  'A Lit Action that swaps two ERC-20 tokens using Uniswap V3.';

/**
 * Descriptions of each parameter for the Swap Uniswap Lit Action
 * These descriptions are designed to be consumed by LLMs to understand the required parameters
 */
export const SwapUniswapLitActionParameterDescriptions = {
  tokenIn:
    'The Ethereum contract address of the ERC20 token you want to send. Must be a valid Ethereum address starting with 0x.',
  tokenOut:
    'The Ethereum contract address of the ERC20 token you want to receive. Must be a valid Ethereum address starting with 0x.',
  amountIn:
    'The amount of tokens to send, specified as a string. This should be a decimal number (e.g. "1.5" or "100"). The amount will be automatically adjusted based on the token\'s decimals.',
  chainId:
    'The ID of the blockchain network to send the tokens on (e.g. 1 for Ethereum mainnet, 84532 for Base Sepolia).',
  rpcUrl:
    'The RPC URL of the blockchain network to connect to (e.g. "https://base-sepolia-rpc.publicnode.com").',
} as const;

/**
 * Parameters required for the ERC20 Send Lit Action
 * @property tokenIn - The ERC20 token contract address to send
 * @property recipientAddress - The Ethereum address to receive the tokens
 * @property amountIn - The amount of tokens to send as a string (will be parsed based on token decimals)
 * @property chainId - The ID of the blockchain network
 * @property rpcUrl - The RPC URL of the blockchain network
 */
export interface SwapUniswapLitActionParameters {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chainId: string;
  rpcUrl: string;
}

/**
 * Metadata about the ERC20 Send Lit Action parameters including their descriptions and validation rules
 */
export const SwapUniswapLitActionMetadata = {
  name: 'SwapUniswapLitAction',
  version: '1.0.0',
  description: swapUniswapLitActionDescription,
  parameters: SwapUniswapLitActionParameterDescriptions,
  required: [
    'tokenIn',
    'tokenOut',
    'amountIn',
    'chainId',
    'rpcUrl',
  ] as const,
  validation: {
    tokenIn:
      'Must be a valid Ethereum contract address (0x followed by 40 hexadecimal characters)',
    tokenOut:
      'Must be a valid Ethereum contract address (0x followed by 40 hexadecimal characters)',
    amountIn:
      'Must be a valid decimal number as a string (e.g. "1.5" or "100")',
    chainId: 'Must be a valid chain ID number as a string',
    rpcUrl: 'Must be a valid HTTPS URL for the blockchain RPC endpoint',
  },
} as const;

/**
 * Zod schema for validating SendERC20LitActionParameters
 */
export const SwapUniswapLitActionSchema = z.object({
  tokenIn: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      SwapUniswapLitActionMetadata.validation.tokenIn
    ),
  tokenOut: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      SwapUniswapLitActionMetadata.validation.tokenOut
    ),
  amountIn: z
    .string()
    .regex(/^\d*\.?\d+$/, SwapUniswapLitActionMetadata.validation.amountIn),
  chainId: z
    .string()
    .regex(/^\d+$/, SwapUniswapLitActionMetadata.validation.chainId),
  rpcUrl: z
    .string()
    .url()
    .startsWith('https://', SwapUniswapLitActionMetadata.validation.rpcUrl),
});

/**
 * Type guard to check if parameters match the required schema
 */
export const isValidSwapUniswapParameters = (
  params: unknown
): params is SwapUniswapLitActionParameters => {
  return SwapUniswapLitActionSchema.safeParse(params).success;
};