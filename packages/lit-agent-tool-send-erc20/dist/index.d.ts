export type SendERC20Metadata = {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
    isDuplicate: boolean;
    Duration: number;
};
export type SendERC20LitActionString = string;
export declare const sendERC20LitActionDescription = "A Lit Action that sends ERC-20 tokens. The AI must provide: tokenIn, recipientAddress, amountIn";
export declare const sendERC20LitAction: SendERC20LitActionString;
export declare const sendERC20Metadata: {
    sendERC20LitAction: SendERC20Metadata;
};
export * from "./policy";
