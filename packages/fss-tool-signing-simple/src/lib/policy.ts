import {
  BaseAgentToolPolicy,
  BaseLitActionPolicySchema,
} from '@lit-protocol/fss-tool-policy-base';
import { z } from 'zod';
import { ethers } from 'ethers';

// --- SigningSimple Policy Implementation ---

/**
 * Policy for the Signing Simple tool
 */
export interface SigningSimplePolicy extends BaseAgentToolPolicy {
  type: 'SigningSimple';
  version: string;
  allowedMessagePrefixes: string[];
  [key: string]: string | string[] | undefined;
}

/**
 * Schema for validating SigningSimple policies
 */
export const SigningSimplePolicySchema = BaseLitActionPolicySchema.extend({
  type: z.literal('SigningSimple'),
  allowedMessagePrefixes: z.array(z.string()),
});

/**
 * Encode a SigningSimple policy into a string
 */
export function encodeSigningSimplePolicy(policy: SigningSimplePolicy): string {
  try {
    SigningSimplePolicySchema.parse(policy);
    return ethers.utils.defaultAbiCoder.encode(
      ['tuple(string[] allowedMessagePrefixes)'],
      [{
        allowedMessagePrefixes: policy.allowedMessagePrefixes || [],
      }]
    );
  } catch (e) {
    throw new Error(`Invalid SigningSimple policy: ${e}`);
  }
}

/**
 * Decode a SigningSimple policy from a string
 */
export function decodeSigningSimplePolicy(
  encodedPolicy: string,
  version: string
): SigningSimplePolicy {
  try {
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ['tuple(string[] allowedMessagePrefixes)'],
      encodedPolicy
    )[0];

    const policy: SigningSimplePolicy = {
      type: 'SigningSimple',
      version,
      allowedMessagePrefixes: decoded.allowedMessagePrefixes,
    };

    SigningSimplePolicySchema.parse(policy);
    return policy;
  } catch (e) {
    throw new Error(`Invalid SigningSimple policy: ${e}`);
  }
}
