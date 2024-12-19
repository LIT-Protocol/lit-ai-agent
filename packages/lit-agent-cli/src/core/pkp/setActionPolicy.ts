import { ethers } from "ethers";

const LIT_AGENT_REGISTRY_ABI = [
  "function setActionPolicy(address pkp, string calldata ipfsCid, bytes calldata description, bytes calldata policy) external",
];

interface SetActionPolicyParams {
  pkpAddress: string;
  ipfsCid: string;
  description: string;
  policy?: any;
}

export async function setActionPolicy({
  pkpAddress,
  ipfsCid,
  description,
  policy,
}: SetActionPolicyParams): Promise<ethers.ContractTransaction> {
  const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY;
  const LIT_AGENT_REGISTRY_ADDRESS = process.env.LIT_AGENT_REGISTRY_ADDRESS;

  if (!ETHEREUM_PRIVATE_KEY) {
    throw new Error("ETHEREUM_PRIVATE_KEY environment variable is required");
  }

  if (!LIT_AGENT_REGISTRY_ADDRESS) {
    throw new Error(
      "LIT_AGENT_REGISTRY_ADDRESS environment variable is required"
    );
  }

  const provider = new ethers.providers.JsonRpcProvider(
    "http://localhost:8545"
  );
  const signer = new ethers.Wallet(ETHEREUM_PRIVATE_KEY, provider);
  const registry = new ethers.Contract(
    LIT_AGENT_REGISTRY_ADDRESS,
    LIT_AGENT_REGISTRY_ABI,
    signer
  );

  const descriptionBytes = ethers.utils.toUtf8Bytes(description);
  const policyBytes = policy
    ? ethers.utils.toUtf8Bytes(JSON.stringify(policy))
    : "0x";

  const tx = await registry.setActionPolicy(
    pkpAddress,
    ipfsCid,
    descriptionBytes,
    policyBytes
  );

  return tx;
}
