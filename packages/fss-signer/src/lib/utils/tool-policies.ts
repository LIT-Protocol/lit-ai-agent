import { ethers } from 'ethers';
import type { SigResponse } from '@lit-protocol/types';
import { SetToolPolicyOptions, ToolPolicy, RegisteredTools } from '../types';
import { LitAgentError, LitAgentErrorType } from '../errors';

const TOOL_POLICY_ABI = [
  'function setActionPolicy(string calldata ipfsCid, bytes calldata policy, string calldata version) external',
  'function removeActionPolicy(string calldata ipfsCid) external',
  'function getActionPolicy(address pkp, string calldata ipfsCid) external view returns (bytes memory policy, string memory version)',
  'function getRegisteredActions(address pkp) external view returns (string[] memory ipfsCids, bytes[] memory policyData, string[] memory versions)',
];

/**
 * Create a tool policy contract instance
 */
export function createToolPolicyContract(
  contractAddress: string,
  provider: ethers.providers.Provider
): ethers.Contract {
  return new ethers.Contract(contractAddress, TOOL_POLICY_ABI, provider);
}

/**
 * Helper function to parse signature and find the correct v value that recovers to the PKP address
 */
async function parseSignatureWithAddressRecovery(
  signature: SigResponse,
  messageHash: string,
  pkpAddress: string
): Promise<{ r: string; s: string; v: number }> {
  // Try both possible v values (27 and 28)
  const sig1 = {
    r: '0x' + signature.r,
    s: '0x' + signature.s,
    v: 27,
  };
  const sig2 = {
    r: '0x' + signature.r,
    s: '0x' + signature.s,
    v: 28,
  };

  // Try recovering with both v values
  const recovered1 = ethers.utils.recoverAddress(messageHash, sig1);
  const recovered2 = ethers.utils.recoverAddress(messageHash, sig2);

  // Check which v value gives us the correct PKP address
  const matchesV27 = recovered1.toLowerCase() === pkpAddress.toLowerCase();
  const matchesV28 = recovered2.toLowerCase() === pkpAddress.toLowerCase();

  if (!matchesV27 && !matchesV28) {
    throw new Error(
      `Signature verification failed. PKP address ${pkpAddress} could not be recovered. Got v27=${recovered1}, v28=${recovered2}`
    );
  }

  // Return the signature that gives us the correct address
  return matchesV27 ? sig1 : sig2;
}

/**
 * Set or update a policy for a specific tool
 */
export async function setToolPolicy(
  contract: ethers.Contract,
  pkpAddress: string,
  signCallback: (toSign: string) => Promise<SigResponse>,
  provider: ethers.providers.Provider,
  options: SetToolPolicyOptions
): Promise<ethers.ContractTransaction> {
  const { ipfsCid, policy, version } = options;

  try {
    let encodedPolicy;

    // Handle different policy types
    if (policy.type === 'SigningSimple') {
      // Encode SigningSimple policy - only needs allowedMessagePrefixes
      encodedPolicy = ethers.utils.defaultAbiCoder.encode(
        ['tuple(string[] allowedMessagePrefixes)'],
        [{
          allowedMessagePrefixes: policy.allowedMessagePrefixes || [],
        }]
      );
    } else {
      // Default case for SendERC20 and SwapUniswap
      const maxAmount = ethers.BigNumber.from(policy.maxAmount);
      const allowedTokens = (policy.allowedTokens || []).map((addr: string) =>
        ethers.utils.getAddress(addr)
      );
      const allowedRecipients = (policy.allowedRecipients || []).map(
        (addr: string) => ethers.utils.getAddress(addr)
      );

      encodedPolicy = ethers.utils.defaultAbiCoder.encode(
        [
          'tuple(uint256 maxAmount, address[] allowedTokens, address[] allowedRecipients)',
        ],
        [
          {
            maxAmount,
            allowedTokens,
            allowedRecipients,
          },
        ]
      );
    }

    // Encode the function call
    const data = contract.interface.encodeFunctionData('setActionPolicy', [
      ipfsCid,
      encodedPolicy,
      version,
    ]);

    // Sign and send the transaction
    const txRequest = {
      to: contract.address,
      data,
    };

    // Estimate gas for the transaction
    const gasEstimate = await provider.estimateGas({
      ...txRequest,
      from: pkpAddress,
    });

    // Add gas parameters to the transaction
    const [baseFee, priorityFee] = await Promise.all([
      provider.getBlock('latest').then((block) => block.baseFeePerGas),
      provider.getGasPrice().then((gasPrice) => gasPrice.div(100).mul(5)), // 5% of current gas price
    ]);

    // Set maxFeePerGas to 2x current base fee + priority fee
    const maxFeePerGas = baseFee
      ? baseFee.mul(2).add(priorityFee)
      : priorityFee;

    const finalTx = {
      ...txRequest,
      type: 2, // EIP-1559 transaction
      chainId: (await provider.getNetwork()).chainId,
      nonce: await provider.getTransactionCount(pkpAddress),
      maxFeePerGas: maxFeePerGas.toHexString(),
      maxPriorityFeePerGas: priorityFee.toHexString(),
      gasLimit: gasEstimate.mul(120).div(100).toHexString(), // Add 20% buffer
    };

    const signature = await signCallback(
      ethers.utils.keccak256(ethers.utils.serializeTransaction(finalTx))
    );

    const messageHash = ethers.utils.keccak256(
      ethers.utils.serializeTransaction(finalTx)
    );

    const sig = await parseSignatureWithAddressRecovery(
      signature,
      messageHash,
      pkpAddress
    );

    const signedTx = ethers.utils.serializeTransaction(finalTx, sig);

    // Send the signed transaction
    const sentTx = await provider.sendTransaction(signedTx);
    return sentTx;
  } catch (error) {
    throw new LitAgentError(
      LitAgentErrorType.TOOL_POLICY_REGISTRATION_FAILED,
      'Failed to register policy',
      { ipfsCid, policy, error }
    );
  }
}

/**
 * Remove a policy for a specific tool
 */
export async function removeToolPolicy(
  contract: ethers.Contract,
  pkpAddress: string,
  signCallback: (toSign: string) => Promise<SigResponse>,
  provider: ethers.providers.Provider,
  ipfsCid: string
): Promise<ethers.ContractTransaction> {
  try {
    // Encode the function call
    const data = contract.interface.encodeFunctionData('removeActionPolicy', [
      ipfsCid,
    ]);

    // Sign and send the transaction
    const txRequest = {
      to: contract.address,
      data,
    };

    // Estimate gas for the transaction
    const gasEstimate = await provider.estimateGas({
      ...txRequest,
      from: pkpAddress,
    });

    // Add gas parameters to the transaction
    const [baseFee, priorityFee] = await Promise.all([
      provider.getBlock('latest').then((block) => block.baseFeePerGas),
      provider.getGasPrice().then((gasPrice) => gasPrice.div(100).mul(5)), // 5% of current gas price
    ]);

    // Set maxFeePerGas to 2x current base fee + priority fee
    const maxFeePerGas = baseFee
      ? baseFee.mul(2).add(priorityFee)
      : priorityFee;

    const finalTx = {
      ...txRequest,
      type: 2, // EIP-1559 transaction
      chainId: (await provider.getNetwork()).chainId,
      nonce: await provider.getTransactionCount(pkpAddress),
      maxFeePerGas: maxFeePerGas.toHexString(),
      maxPriorityFeePerGas: priorityFee.toHexString(),
      gasLimit: gasEstimate.mul(120).div(100).toHexString(), // Add 20% buffer
    };

    const signature = await signCallback(
      ethers.utils.keccak256(ethers.utils.serializeTransaction(finalTx))
    );

    const messageHash = ethers.utils.keccak256(
      ethers.utils.serializeTransaction(finalTx)
    );

    const sig = await parseSignatureWithAddressRecovery(
      signature,
      messageHash,
      pkpAddress
    );

    const signedTx = ethers.utils.serializeTransaction(finalTx, sig);

    // Send the signed transaction
    const sentTx = await provider.sendTransaction(signedTx);
    return sentTx;
  } catch (error) {
    throw new LitAgentError(
      LitAgentErrorType.TOOL_POLICY_REGISTRATION_FAILED,
      'Failed to remove policy',
      { ipfsCid, error }
    );
  }
}

/**
 * Get the policy for a specific tool
 */
export async function getToolPolicy(
  contract: ethers.Contract,
  pkpAddress: string,
  ipfsCid: string
): Promise<ToolPolicy> {
  const [policy, version] = await contract.getActionPolicy(pkpAddress, ipfsCid);
  return { policy, version };
}

/**
 * Get all registered tools and their policies
 */
export async function getRegisteredTools(
  contract: ethers.Contract,
  pkpAddress: string
): Promise<RegisteredTools> {
  const [ipfsCids, policyData, versions] = await contract.getRegisteredActions(
    pkpAddress
  );
  return { ipfsCids, policyData, versions };
}
