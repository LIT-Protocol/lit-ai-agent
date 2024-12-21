import { ethers } from "ethers";
/**
 * Schema for the SendERC20 Policy, used for CLI prompts
 */
export const sendERC20PolicySchema = {
    type: "object",
    properties: {
        maxAmount: {
            type: "string",
            description: "Maximum amount allowed for token transfers (in wei)",
            example: "1000000000000000000",
        },
        allowedTokens: {
            type: "array",
            items: {
                type: "string",
                pattern: "^0x[a-fA-F0-9]{40}$",
                description: "Ethereum address of allowed token",
            },
            description: "Array of token addresses that can be sent",
            example: [
                "0x4200000000000000000000000000000000000006, 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            ],
        },
        allowedRecipients: {
            type: "array",
            items: {
                type: "string",
                pattern: "^0x[a-fA-F0-9]{40}$",
                description: "Ethereum address of allowed recipient",
            },
            description: "Array of addresses that can receive tokens",
            example: [
                "0x1234567890123456789012345678901234567890, 0x9876543210987654321098765432109876543210",
            ],
        },
    },
    required: ["maxAmount", "allowedTokens", "allowedRecipients"],
};
/**
 * Validates and encodes a SendERC20Policy into the format expected by the Lit Action
 */
export function encodeSendERC20Policy(policy) {
    // Validate maxAmount is a valid number
    try {
        ethers.BigNumber.from(policy.maxAmount);
    }
    catch (e) {
        throw new Error("Invalid maxAmount: must be a valid number string");
    }
    // Handle comma-separated strings for arrays
    const processAddresses = (addresses) => {
        if (typeof addresses === 'string') {
            return addresses.split(',').map(addr => addr.trim());
        }
        return addresses;
    };
    const allowedTokens = processAddresses(policy.allowedTokens);
    const allowedRecipients = processAddresses(policy.allowedRecipients);
    // Validate addresses
    for (const token of allowedTokens) {
        if (!ethers.utils.isAddress(token)) {
            throw new Error(`Invalid token address: ${token}`);
        }
    }
    for (const recipient of allowedRecipients) {
        if (!ethers.utils.isAddress(recipient)) {
            throw new Error(`Invalid recipient address: ${recipient}`);
        }
    }
    return ethers.utils.defaultAbiCoder.encode(["tuple(uint256 maxAmount, address[] allowedTokens, address[] allowedRecipients)"], [{
            maxAmount: policy.maxAmount,
            allowedTokens,
            allowedRecipients,
        }]);
}
/**
 * Decodes an ABI encoded SendERC20 policy
 */
export function decodeSendERC20Policy(encodedPolicy) {
    const decoded = ethers.utils.defaultAbiCoder.decode(["tuple(uint256 maxAmount, address[] allowedTokens, address[] allowedRecipients)"], encodedPolicy)[0];
    return {
        maxAmount: decoded.maxAmount.toString(),
        allowedTokens: decoded.allowedTokens,
        allowedRecipients: decoded.allowedRecipients,
    };
}
