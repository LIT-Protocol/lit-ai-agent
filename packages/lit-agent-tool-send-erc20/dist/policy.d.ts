/**
 * Type definition for the SendERC20 Policy
 * This matches the Solidity struct:
 * struct SendERC20Policy {
 *   uint256 maxAmount;
 *   address[] allowedTokens;
 *   address[] allowedRecipients;
 * }
 */
export interface SendERC20Policy {
    maxAmount: string;
    allowedTokens: string[];
    allowedRecipients: string[];
}
/**
 * Schema for the SendERC20 Policy, used for CLI prompts
 */
export declare const sendERC20PolicySchema: {
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
        allowedRecipients: {
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
 * Validates and encodes a SendERC20Policy into the format expected by the Lit Action
 */
export declare function encodeSendERC20Policy(policy: SendERC20Policy): string;
/**
 * Decodes an ABI encoded SendERC20 policy
 */
export declare function decodeSendERC20Policy(encodedPolicy: string): SendERC20Policy;
