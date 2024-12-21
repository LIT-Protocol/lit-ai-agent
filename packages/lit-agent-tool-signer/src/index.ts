export type SignerMetadata = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate: boolean;
  Duration: number;
};

// This represents the actual Lit Action code as a string
export type SignerLitActionString = string;

export const signerLitActionDescription =
  "Lit Action for signing arbitrary messages";

// These will be populated by the build process
export const signerLitAction: SignerLitActionString = "";
export const signerMetadata: { signerLitAction: SignerMetadata } = {
  signerLitAction: {
    IpfsHash: "",
    PinSize: 0,
    Timestamp: "",
    isDuplicate: false,
    Duration: 0,
  },
};

// Export policy types and functions
export * from "./policy";
