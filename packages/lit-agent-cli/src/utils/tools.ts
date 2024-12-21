import {
  sendERC20Metadata,
  sendERC20LitActionDescription,
  SendERC20Policy,
  sendERC20PolicySchema,
  encodeSendERC20Policy,
  decodeSendERC20Policy,
} from "lit-agent-tool-send-erc20";

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
      name: "SendERC20",
      description: sendERC20LitActionDescription,
      ipfsId: sendERC20Metadata.sendERC20LitAction.IpfsHash,
      package: "lit-agent-tool-send-erc20",
      policySchema: sendERC20PolicySchema,
      encodePolicyFn: encodeSendERC20Policy,
      decodePolicyFn: decodeSendERC20Policy,
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
