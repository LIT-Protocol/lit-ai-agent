import { ethers } from "ethers";
/**
 * Schema for the Signer Policy, used for CLI prompts
 */
export const signerPolicySchema = {
    type: "object",
    properties: {
        allowAll: {
            type: "boolean",
            description: "WARNING: This will allow the PKP to sign ANY message. Are you sure you want to enable unrestricted signing?",
            default: false,
        },
    },
    required: ["allowAll"],
};
/**
 * Validates and encodes a SignerPolicy into the format expected by the Lit Action
 * @param policy The policy to encode
 * @returns The ABI encoded policy bytes
 */
export function encodeSignerPolicy(policy) {
    // Encode the policy using a simple boolean
    return ethers.utils.defaultAbiCoder.encode(["tuple(bool allowAll)"], [{ allowAll: policy.allowAll }]);
}
/**
 * Decodes an ABI encoded signer policy
 * @param encodedPolicy The ABI encoded policy bytes
 * @returns The decoded SignerPolicy object
 */
export function decodeSignerPolicy(encodedPolicy) {
    const decoded = ethers.utils.defaultAbiCoder.decode(["tuple(bool allowAll)"], encodedPolicy)[0];
    return {
        allowAll: decoded.allowAll,
    };
}
