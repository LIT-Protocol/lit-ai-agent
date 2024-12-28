import {
  BaseAgentToolPolicy,
  BaseLitActionPolicySchema,
  BaseEthereumAddressSchema,
  EthereumAddress,
} from '@lit-protocol/fss-tool-policy-base';
import { z } from 'zod';
import { ethers } from 'ethers';

// --- SendERC20 Policy Implementation ---
export interface SendERC20Policy extends BaseAgentToolPolicy {
  type: 'SendERC20';
  version: string;
  maxAmount: string;
  allowedTokens: EthereumAddress[];
  allowedRecipients: EthereumAddress[];
  [key: string]: string | string[] | undefined;
}

export const SendERC20PolicySchema = BaseLitActionPolicySchema.extend({
  type: z.literal('SendERC20'),
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
  allowedRecipients: z.array(BaseEthereumAddressSchema),
});

export function encodeSendERC20Policy(policy: SendERC20Policy): string {
  // Validate the policy using Zod
  SendERC20PolicySchema.parse(policy);

  return ethers.utils.defaultAbiCoder.encode(
    [
      'tuple(uint256 maxAmount, address[] allowedTokens, address[] allowedRecipients)',
    ],
    [
      {
        maxAmount: policy.maxAmount,
        allowedTokens: policy.allowedTokens,
        allowedRecipients: policy.allowedRecipients,
      },
    ]
  );
}

export function decodeSendERC20Policy(
  encodedPolicy: string,
  version: string
): SendERC20Policy {
  const decoded = ethers.utils.defaultAbiCoder.decode(
    [
      'tuple(uint256 maxAmount, address[] allowedTokens, address[] allowedRecipients)',
    ],
    encodedPolicy
  )[0];

  const policy: SendERC20Policy = {
    type: 'SendERC20',
    version,
    maxAmount: decoded.maxAmount.toString(),
    allowedTokens: decoded.allowedTokens,
    allowedRecipients: decoded.allowedRecipients,
  };

  // Validate the decoded policy
  return SendERC20PolicySchema.parse(policy);
}
