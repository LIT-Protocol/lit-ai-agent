import {
    BaseAgentToolPolicy,
    BaseLitActionPolicySchema,
  } from '@lit-protocol/fss-tool-policy-base';
  import { z } from 'zod';
  import { ethers } from 'ethers';
  
  // --- Boilerplate Policy Implementation ---
  
  /**
   * Policy for the Boilerplate tool
   */
  export interface BoilerplatePolicy extends BaseAgentToolPolicy {
    type: 'Boilerplate';
    version: string;
    allowedMessagePrefixes: string[];
    [key: string]: string | string[] | undefined;
  }
  
  /**
   * Schema for validating Boilerplate policies
   */
  export const BoilerplatePolicySchema = BaseLitActionPolicySchema.extend({
    type: z.literal('Boilerplate'),
    allowedMessagePrefixes: z.array(z.string()),
  });
  
  /**
   * Encode a Boilerplate policy into a string
   */
  export function encodeBoilerplatePolicy(policy: BoilerplatePolicy): string {
    try {
      BoilerplatePolicySchema.parse(policy);
      return ethers.utils.defaultAbiCoder.encode(
        ['tuple(string[] allowedMessagePrefixes)'],
        [{
          allowedMessagePrefixes: policy.allowedMessagePrefixes || [],
        }]
      );
    } catch (e) {
      throw new Error(`Invalid Boilerplate policy: ${e}`);
    }
  }
  
  /**
   * Decode a Boilerplate policy from a string
   */
  export function decodeBoilerplatePolicy(
    encodedPolicy: string,
    version: string
  ): BoilerplatePolicy {
    try {
      const decoded = ethers.utils.defaultAbiCoder.decode(
        ['tuple(string[] allowedMessagePrefixes)'],
        encodedPolicy
      )[0];
  
      const policy: BoilerplatePolicy = {
        type: 'Boilerplate',
        version,
        allowedMessagePrefixes: decoded.allowedMessagePrefixes,
      };
  
      BoilerplatePolicySchema.parse(policy);
      return policy;
    } catch (e) {
      throw new Error(`Invalid Boilerplate policy: ${e}`);
    }
  }
  