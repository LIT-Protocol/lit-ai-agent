import { ethers, ContractFactory } from "ethers";
import Safe from '@safe-global/protocol-kit';

import PKPToolsArtifact from "../../artifacts/contracts/PKPTools.sol/PKPTools.json";

/**
 * PKP Tools Contract Deployment
 * --------------------------
 * Deploys a new PKPTools contract with optimized gas settings and safety checks.
 * 
 * Process:
 * 1. Creates contract factory from artifact
 * 2. Calculates optimal gas parameters based on current network conditions
 * 3. Deploys with conservative gas limit to ensure success
 * 4. Waits for deployment confirmation
 * 
 * @param signer - Ethereum wallet with sufficient funds for deployment
 * @param safeAddress - Address of the Safe that will own the contract
 * @returns Deployed contract instance
 * 
 * Gas Settings:
 * - Fixed gas limit: 3,000,000 units
 * - Dynamic maxFeePerGas based on current network price
 * - maxPriorityFeePerGas set to half of base fee
 */
export const deployToolsContract = async (
  signer: ethers.Wallet,
  safeAddress: string
) => {
  console.log("Deploying new PKPTools contract...");
  const PKPTools = new ContractFactory(
    PKPToolsArtifact.abi,
    PKPToolsArtifact.bytecode,
    signer
  );

  const gasPrice = await signer.provider.getGasPrice();
  console.log("Current gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");

  const estimatedGas = 3000000;
  const totalCost = gasPrice.mul(estimatedGas);
  console.log("Estimated deployment cost:", ethers.utils.formatEther(totalCost), "ETH");

  const pkpTools = await PKPTools.deploy(safeAddress, {
    gasLimit: estimatedGas,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: gasPrice.div(2)
  });
  
  await pkpTools.deployTransaction.wait();
  console.log("PKPTools contract deployed to:", pkpTools.address);
  return pkpTools;
};

/**
 * Safe Multi-Signature Transaction Processor
 * ----------------------------------------
 * Handles the complete lifecycle of a Safe transaction from signing to execution.
 * Requires signatures from both owners before executing the transaction.
 * 
 * Process Flow:
 * 1. Gets current gas price for optimal execution
 * 2. First owner signs transaction
 * 3. Second owner signs transaction
 * 4. Executes fully-signed transaction
 * 5. Waits for confirmation and verifies success
 * 
 * @param protocolKit - Safe instance
 * @param safeTransaction - Transaction to be processed
 * @param firstOwnerPrivateKey - Private key of first signer
 * @param secondOwnerPrivateKey - Private key of second signer
 * @param provider - Network provider
 * @param baseRpcUrl - RPC endpoint for the Base network
 * @returns Transaction receipt after successful execution
 * 
 * Gas Parameters:
 * - Gas limit: 1,000,000 units
 * - maxFeePerGas: 2x current gas price
 * - maxPriorityFeePerGas: 0.5x current gas price
 */
export const signAndExecuteSafeTransaction = async (
  protocolKit: Safe,
  safeTransaction: any,
  firstOwnerPrivateKey: string,
  secondOwnerPrivateKey: string,
  provider: ethers.providers.Provider,
  baseRpcUrl: string
) => {
  try {
    const gasPrice = await provider.getGasPrice();
    console.log("Current gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");

    console.log("Signing with first owner...");
    protocolKit = await protocolKit.connect({
      provider: baseRpcUrl,
      signer: `0x${firstOwnerPrivateKey}`
    });
    safeTransaction = await protocolKit.signTransaction(safeTransaction);

    console.log("Signing with second owner...");
    protocolKit = await protocolKit.connect({
      provider: baseRpcUrl,
      signer: `0x${secondOwnerPrivateKey}`
    });
    safeTransaction = await protocolKit.signTransaction(safeTransaction);

    console.log("Executing transaction from Safe...");
    const executeTxResponse = await protocolKit.executeTransaction(safeTransaction, {
      gasLimit: 1000000,
      maxFeePerGas: gasPrice.mul(2).toString(),
      maxPriorityFeePerGas: gasPrice.div(2).toString()
    });

    console.log("Waiting for transaction confirmation...");
    const receipt = await provider.waitForTransaction(executeTxResponse.hash, 1, 120000);
    
    if (receipt.status === 0) {
      throw new Error("Transaction failed during execution");
    }

    return receipt;

  } catch (error) {
    console.error("Transaction execution failed:", error);
    throw error;
  }
};

/**
 * Safe Deployment Handler
 * ----------------------
 * Deploys a new Safe contract to the network with specified configuration.
 * 
 * Process:
 * 1. Creates deployment transaction
 * 2. Gets external signer from Safe provider
 * 3. Sends deployment transaction
 * 4. Waits for and verifies deployment
 * 
 * @param protocolKit - Configured Safe instance
 * @param provider - Network provider
 * @param chain - Chain configuration object
 * @returns Transaction receipt of successful deployment
 */
export const deploySafe = async (
  protocolKit: Safe,
  provider: ethers.providers.Provider,
  chain: any
) => {
  const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction();
  const client = await protocolKit.getSafeProvider().getExternalSigner();
  const txHash = await client!.sendTransaction({
    to: deploymentTransaction.to,
    value: BigInt(deploymentTransaction.value),
    data: deploymentTransaction.data as `0x${string}`,
    chain
  });

  const txReceipt = await provider.waitForTransaction(txHash);
  console.log("Safe deployed, tx receipt:", txReceipt);
  return txReceipt;
};

/**
 * Account Balance Validator
 * -----------------------
 * Checks ETH balances of all relevant accounts and ensures sufficient funds
 * for operations. Throws errors if minimum requirements aren't met.
 * 
 * Checks:
 * 1. First owner wallet balance
 * 2. Second owner wallet balance
 * 3. Safe contract balance (if deployed)
 * 
 * Minimum Requirements:
 * - 0.0002 ETH (0.2 mETH) for each owner wallet
 * - Warning if Safe balance is below 0.0002 ETH
 * 
 * @param provider - Network provider
 * @param firstOwnerWallet - First owner's wallet
 * @param secondOwnerWallet - Second owner's wallet
 * @param safeAddress - Address of the Safe contract
 * @throws Error if any owner has insufficient funds
 */
export const checkBalances = async (
  provider: ethers.providers.Provider,
  firstOwnerWallet: ethers.Wallet,
  secondOwnerWallet: ethers.Wallet,
  safeAddress: string
) => {
  const firstBalance = await firstOwnerWallet.getBalance();
  const secondBalance = await secondOwnerWallet.getBalance();
  const safeBalance = await provider.getBalance(safeAddress);

  // 0.0002 ETH Minimum for gas fees
  const minimumBalance = ethers.utils.parseEther("0.0002"); 

  console.log("\nAccount Balances:");
  console.log("----------------");
  console.log(`First Owner (${firstOwnerWallet.address}): ${ethers.utils.formatEther(firstBalance)} ETH`);
  console.log(`Second Owner (${secondOwnerWallet.address}): ${ethers.utils.formatEther(secondBalance)} ETH`);
  console.log(`Safe (${safeAddress}): ${ethers.utils.formatEther(safeBalance)} ETH`);
  console.log("----------------\n");

  if (firstBalance.lt(minimumBalance)) {
    throw new Error(`Insufficient funds in first owner wallet. Has ${ethers.utils.formatEther(firstBalance)} ETH, needs at least 0.001 ETH`);
  }

  if (secondBalance.lt(minimumBalance)) {
    throw new Error(`Insufficient funds in second owner wallet. Has ${ethers.utils.formatEther(secondBalance)} ETH, needs at least 0.001 ETH`);
  } 
  if (safeBalance.gt(0) && safeBalance.lt(minimumBalance)) {
    console.warn(`Warning: Safe balance is low. Has ${ethers.utils.formatEther(safeBalance)} ETH, recommended at least 0.001 ETH`);
  }
};