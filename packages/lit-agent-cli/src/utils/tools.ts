import {
  uniswapMetadata,
  uniswapLitActionDescription,
} from "lit-agent-tool-uniswap";

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
