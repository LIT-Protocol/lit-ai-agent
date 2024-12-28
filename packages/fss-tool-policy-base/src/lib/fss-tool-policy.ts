import { z } from 'zod';

// Base schema for Ethereum addresses
export const BaseEthereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format');

// Base interface for all agent tool policies
export interface BaseAgentToolPolicy {
  type: string;
  version: string;
}

// Base schema for all Lit Action policies
export const BaseLitActionPolicySchema = z.object({
  type: z.string(),
  version: z.string(),
});

// Type for policy definition
interface PolicyDefinition<T extends BaseAgentToolPolicy> {
  schema: z.ZodType<T>;
  encode: (policy: T) => string;
  decode: (encoded: string, version: string) => T;
}

// Policy registry
const policyRegistry: Record<string, PolicyDefinition<any>> = {};

// Register a new policy type
export function registerPolicy<T extends BaseAgentToolPolicy>(
  type: string,
  definition: PolicyDefinition<T>
) {
  policyRegistry[type] = definition;
}

// Validate a policy
export function validatePolicy<T extends BaseAgentToolPolicy>(
  type: string,
  policy: unknown
): T {
  const definition = policyRegistry[type];
  if (!definition) {
    throw new Error(`No policy definition found for type: ${type}`);
  }
  return definition.schema.parse(policy) as T;
}

// Encode a policy
export function encodePolicy<T extends BaseAgentToolPolicy>(
  type: string,
  policy: T
): string {
  const definition = policyRegistry[type];
  if (!definition) {
    throw new Error(`No policy definition found for type: ${type}`);
  }
  return definition.encode(policy);
}

// Decode a policy
export function decodePolicy<T extends BaseAgentToolPolicy>(
  type: string,
  encoded: string,
  version: string
): T {
  const definition = policyRegistry[type];
  if (!definition) {
    throw new Error(`No policy definition found for type: ${type}`);
  }
  return definition.decode(encoded, version);
}
