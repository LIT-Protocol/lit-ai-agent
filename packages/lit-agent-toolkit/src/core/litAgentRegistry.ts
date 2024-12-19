import { ethers } from "ethers";

export type LitAction = {
  ipfsCid: string;
  description: string;
  policy: any;
};

/**
 * Get all permitted actions and their policies for a PKP
 * @param registry LitAgentRegistry contract instance
 * @param user Address of the user who owns the PKP
 * @param pkp Address of the PKP
 * @returns Array of permitted actions with their policies
 */
export async function getPermittedActions(
  registry: ethers.Contract,
  user: string,
  pkp: string
): Promise<LitAction[]> {
  const [ipfsCids, descriptions, policies] =
    await registry.getRegisteredActions(user, pkp);

  return ipfsCids.map((ipfsCid: string, index: number) => ({
    ipfsCid,
    description: ethers.utils.toUtf8String(descriptions[index]),
    policy:
      policies[index].length > 0
        ? JSON.parse(ethers.utils.toUtf8String(policies[index]))
        : {},
  }));
}

/**
 * Get policy for a specific action
 * @param registry LitAgentRegistry contract instance
 * @param user Address of the user who owns the PKP
 * @param pkp Address of the PKP
 * @param ipfsCid IPFS CID of the Lit Action
 * @returns Whether the action is permitted and its policy
 */
export async function getActionPolicy(
  registry: ethers.Contract,
  user: string,
  pkp: string,
  ipfsCid: string
): Promise<{
  isPermitted: boolean;
  description: string;
  policy: any;
}> {
  const [isPermitted, description, policy] = await registry.getActionPolicy(
    user,
    pkp,
    ipfsCid
  );
  return {
    isPermitted,
    description: ethers.utils.toUtf8String(description),
    policy:
      policy.length > 0 ? JSON.parse(ethers.utils.toUtf8String(policy)) : {},
  };
}

/**
 * Set policy for a specific action
 * @param registry LitAgentRegistry contract instance
 * @param pkp Address of the PKP
 * @param ipfsCid IPFS CID of the Lit Action
 * @param description Human-readable description of what this action does
 * @param policy Optional policy configuration
 */
export async function setActionPolicy(
  registry: ethers.Contract,
  pkp: string,
  ipfsCid: string,
  description: string,
  policy: any = {}
): Promise<ethers.ContractTransaction> {
  return registry.setActionPolicy(
    pkp,
    ipfsCid,
    ethers.utils.toUtf8Bytes(description),
    ethers.utils.toUtf8Bytes(JSON.stringify(policy))
  );
}
