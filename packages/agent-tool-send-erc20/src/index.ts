export type SendERC20Metadata = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate: boolean;
  Duration: number;
};

// This represents the actual Lit Action code as a string
export type SendERC20LitActionString = string;

export const sendERC20LitActionDescription =
  "A Lit Action that sends ERC-20 tokens. The AI must provide: tokenIn, recipientAddress, amountIn";

// These will be populated by the build process
export const sendERC20LitAction: SendERC20LitActionString = "";
export const sendERC20Metadata: { sendERC20LitAction: SendERC20Metadata } = {
  sendERC20LitAction: {
    IpfsHash: "",
    PinSize: 0,
    Timestamp: "",
    isDuplicate: false,
    Duration: 0,
  },
};

// Export policy types and functions
export * from "./policy";