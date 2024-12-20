import {
  uniswapMetadata,
  uniswapLitActionDescription,
  SwapPolicy,
  swapPolicySchema,
  encodeSwapPolicy,
  decodeSwapPolicy,
} from "lit-agent-tool-uniswap";

import {
  signerMetadata,
  signerLitActionDescription,
  SignerPolicy,
  signerPolicySchema,
  encodeSignerPolicy,
  decodeSignerPolicy,
} from "lit-agent-tool-signer";

export interface LitAgentTool {
  name: string;
  description: string;
  ipfsId: string;
  package: string;
  policySchema?: object;
  encodePolicyFn?: (policy: any) => string;
  decodePolicyFn?: (encodedPolicy: string) => any;
}

export const getAvailableTools = (): LitAgentTool[] => {
  return [
    {
      name: "Uniswap",
      description: uniswapLitActionDescription,
      ipfsId: uniswapMetadata.uniswapLitAction.IpfsHash,
      package: "lit-agent-tool-uniswap",
      policySchema: swapPolicySchema,
      encodePolicyFn: encodeSwapPolicy,
      decodePolicyFn: decodeSwapPolicy,
    },
    {
      name: "Signer",
      description: signerLitActionDescription,
      ipfsId: signerMetadata.signerLitAction.IpfsHash,
      package: "lit-agent-tool-signer",
      policySchema: signerPolicySchema,
      encodePolicyFn: encodeSignerPolicy,
      decodePolicyFn: decodeSignerPolicy,
    },
  ];
};
