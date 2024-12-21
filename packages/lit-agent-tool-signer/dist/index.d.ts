export type SignerMetadata = {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
    isDuplicate: boolean;
    Duration: number;
};
export type SignerLitActionString = string;
export declare const signerLitActionDescription = "Lit Action for signing arbitrary messages";
export declare const signerLitAction: SignerLitActionString;
export declare const signerMetadata: {
    signerLitAction: SignerMetadata;
};
export * from "./policy";
