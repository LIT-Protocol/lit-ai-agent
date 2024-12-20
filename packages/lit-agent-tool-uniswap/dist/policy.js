import { ethers } from "ethers";
/**
 * Schema for the Uniswap Swap Policy, used for CLI prompts
 */
export const swapPolicySchema = {
    type: "object",
    properties: {
        maxAmount: {
            type: "string",
            description: "Maximum amount allowed for swaps (in wei)",
            example: "1000000000000000000",
        },
        allowedTokens: {
            type: "array",
            items: {
                type: "string",
                pattern: "^0x[a-fA-F0-9]{40}$",
                description: "Ethereum address of allowed token",
            },
            description: "Array of token addresses that can be used in swaps",
            example: [
                "0x4200000000000000000000000000000000000006, 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            ],
        },
    },
    required: ["maxAmount", "allowedTokens"],
};
/**
 * Validates and encodes a SwapPolicy into the format expected by the Lit Action
 * @param policy The policy to encode
 * @returns The ABI encoded policy bytes
 * @throws Error if the policy is invalid
 */
export function encodeSwapPolicy(policy) {
    // Validate maxAmount is a valid number
    try {
        ethers.BigNumber.from(policy.maxAmount);
    }
    catch (e) {
        throw new Error("Invalid maxAmount: must be a valid number string");
    }
    // Validate allowedTokens are valid addresses
    for (const token of policy.allowedTokens) {
        if (!ethers.utils.isAddress(token)) {
            throw new Error(`Invalid token address: ${token}`);
        }
    }
    // Encode the policy using the same format as the Lit Action
    return ethers.utils.defaultAbiCoder.encode(["tuple(uint256 maxAmount, address[] allowedTokens)"], [
        {
            maxAmount: policy.maxAmount,
            allowedTokens: policy.allowedTokens,
        },
    ]);
}
/**
 * Decodes an ABI encoded swap policy
 * @param encodedPolicy The ABI encoded policy bytes
 * @returns The decoded SwapPolicy object
 */
export function decodeSwapPolicy(encodedPolicy) {
    const decoded = ethers.utils.defaultAbiCoder.decode(["tuple(uint256 maxAmount, address[] allowedTokens)"], encodedPolicy)[0];
    return {
        maxAmount: decoded.maxAmount.toString(),
        allowedTokens: decoded.allowedTokens,
    };
}
