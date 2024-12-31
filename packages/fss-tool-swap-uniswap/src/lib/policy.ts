import {
  BaseAgentToolPolicy,
  BaseLitActionPolicySchema,
  BaseEthereumAddressSchema,
  EthereumAddress,
} from '@lit-protocol/fss-tool-policy-base';
import { z } from 'zod';
import { ethers } from 'ethers';

// --- SwapUniswap Policy Implementation ---
export interface SwapUniswapPolicy extends BaseAgentToolPolicy {
  type: 'SwapUniswap';
  version: string;
  maxAmount: string;
  allowedTokens: EthereumAddress[];
  [key: string]: string | string[] | undefined;
}

export const SwapUniswapPolicySchema = BaseLitActionPolicySchema.extend({
  type: z.literal('SwapUniswap'),
  maxAmount: z.string().refine(
    (val) => {
      try {
        const bn = ethers.BigNumber.from(val);
        // Ensure the number is not negative
        return !bn.isNegative();
      } catch {
        return false;
      }
    },
    { message: 'Invalid amount format. Must be a non-negative integer.' }
  ),
  allowedTokens: z.array(BaseEthereumAddressSchema),
});

export function encodeSwapUniswapPolicy(policy: SwapUniswapPolicy): string {
  // Validate the policy using Zod
  SwapUniswapPolicySchema.parse(policy);

  return ethers.utils.defaultAbiCoder.encode(
    [
      'tuple(uint256 maxAmount, address[] allowedTokens)',
    ],
    [
      {
        maxAmount: policy.maxAmount,
        allowedTokens: policy.allowedTokens,
      },
    ]
  );
}

export function decodeSwapUniswapPolicy(
  encodedPolicy: string,
  version: string
): SwapUniswapPolicy {
  const decoded = ethers.utils.defaultAbiCoder.decode(
    [
      'tuple(uint256 maxAmount, address[] allowedTokens)',
    ],
    encodedPolicy
  )[0];

  const policy: SwapUniswapPolicy = {
    type: 'SwapUniswap',
    version,
    maxAmount: decoded.maxAmount.toString(),
    allowedTokens: decoded.allowedTokens,
  };

  // Validate the decoded policy
  return SwapUniswapPolicySchema.parse(policy);
}
