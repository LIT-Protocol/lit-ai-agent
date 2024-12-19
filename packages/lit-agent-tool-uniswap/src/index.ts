export type UniswapMetadata = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate: boolean;
  Duration: number;
};

// This represents the actual Lit Action code as a string
export type UniswapLitActionString = string;

export const uniswapLitActionDescription =
  "A Lit Action that executes a token swap on Base using Uniswap V3. The AI must provide: tokenIn, tokenOut, amountIn";

// These will be populated by the build process
export const uniswapLitAction: UniswapLitActionString = "";
export const uniswapMetadata: { uniswapLitAction: UniswapMetadata } = {
  uniswapLitAction: {
    IpfsHash: "",
    PinSize: 0,
    Timestamp: "",
    isDuplicate: false,
    Duration: 0,
  },
};

// Export policy types and functions
export * from "./policy";
