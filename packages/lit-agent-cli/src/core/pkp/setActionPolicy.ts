import { ethers } from "ethers";
import { Command } from "commander";
import { validateEnvVar } from "../../utils/env";

const LIT_AGENT_REGISTRY_ABI = [
  "function setActionPolicy(address pkp, string calldata ipfsCid, bytes calldata description, bytes calldata policy) external",
];

interface SetActionPolicyParams {
  pkpAddress: string;
  ipfsCid: string;
  description: string;
  policy?: any;
  command: Command;
}

export async function setActionPolicy({
  pkpAddress,
  ipfsCid,
  description,
  policy,
  command,
}: SetActionPolicyParams): Promise<ethers.ContractTransaction> {
  const ethereumPrivateKey = validateEnvVar("ETHEREUM_PRIVATE_KEY", command);
  const litAgentRegistryAddress = validateEnvVar(
    "LIT_AGENT_REGISTRY_ADDRESS",
    command
  );

  const provider = new ethers.providers.JsonRpcProvider(
    "http://localhost:8545"
  );
  const signer = new ethers.Wallet(ethereumPrivateKey, provider);
  const registry = new ethers.Contract(
    litAgentRegistryAddress,
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
