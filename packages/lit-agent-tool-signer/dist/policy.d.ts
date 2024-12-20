/**
 * Type definition for the Signer Policy
 * This matches the Solidity struct:
 * struct SignerPolicy {
 *   bool allowAll;
 * }
 */
export interface SignerPolicy {
    allowAll: boolean;
}
/**
 * Schema for the Signer Policy, used for CLI prompts
 */
export declare const signerPolicySchema: {
    type: string;
    properties: {
        allowAll: {
            type: string;
            description: string;
            default: boolean;
        };
    };
    required: string[];
};
/**
 * Validates and encodes a SignerPolicy into the format expected by the Lit Action
 * @param policy The policy to encode
 * @returns The ABI encoded policy bytes
 */
export declare function encodeSignerPolicy(policy: SignerPolicy): string;
/**
 * Decodes an ABI encoded signer policy
 * @param encodedPolicy The ABI encoded policy bytes
 * @returns The decoded SignerPolicy object
 */
export declare function decodeSignerPolicy(encodedPolicy: string): SignerPolicy;
