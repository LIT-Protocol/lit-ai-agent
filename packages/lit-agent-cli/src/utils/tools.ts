// import {
//   uniswapMetadata,
//   uniswapLitActionDescription,
// } from "lit-agent-tool-uniswap";

const uniswapMetadata = {
  uniswapLitAction: {
    IpfsHash: "QmQ9611111111111111111111111111111111111111111111111",
  },
};
const uniswapLitActionDescription = "Uniswap Lit Action";
export interface LitAgentTool {
  name: string;
  description: string;
  ipfsId: string;
  package: string;
}

export const getAvailableTools = (): LitAgentTool[] => {
  return [
    {
      name: "Uniswap",
      description: uniswapLitActionDescription,
      ipfsId: uniswapMetadata.uniswapLitAction.IpfsHash,
      package: "lit-agent-tool-uniswap",
    },
  ];
};
