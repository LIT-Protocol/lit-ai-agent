/**
 * Type definition for the Uniswap Swap Policy
 * This matches the Solidity struct:
 * struct SwapPolicy {
 *   uint256 maxAmount;
 *   address[] allowedTokens;
 * }
 */
export interface SwapPolicy {
    maxAmount: string;
    allowedTokens: string[];
}
/**
 * Schema for the Uniswap Swap Policy, used for CLI prompts
 */
export declare const swapPolicySchema: {
    type: string;
    properties: {
        maxAmount: {
            type: string;
            description: string;
            example: string;
        };
        allowedTokens: {
            type: string;
            items: {
                type: string;
                pattern: string;
                description: string;
            };
            description: string;
            example: string[];
        };
    };
    required: string[];
};
/**
 * Validates and encodes a SwapPolicy into the format expected by the Lit Action
 * @param policy The policy to encode
 * @returns The ABI encoded policy bytes
 * @throws Error if the policy is invalid
 */
export declare function encodeSwapPolicy(policy: SwapPolicy): string;
/**
 * Decodes an ABI encoded swap policy
 * @param encodedPolicy The ABI encoded policy bytes
 * @returns The decoded SwapPolicy object
 */
export declare function decodeSwapPolicy(encodedPolicy: string): SwapPolicy;
