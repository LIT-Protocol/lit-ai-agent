
export type UniswapMetadata = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate: boolean;
  Duration: number;
};

export type UniswapLitActionString = string;

export declare const uniswapLitActionDescription: string;
export declare const uniswapLitAction: UniswapLitActionString;
export declare const uniswapMetadata: {
  uniswapLitAction: UniswapMetadata;
};

export * from "./policy";
