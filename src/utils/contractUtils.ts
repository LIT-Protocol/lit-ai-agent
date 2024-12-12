import { ethers } from "ethers";
import Safe from '@safe-global/protocol-kit';

import PKPToolsArtifact from "../../artifacts/contracts/PKPTools.sol/PKPTools.json";

/**
 * Permitted Action Creator
 * ----------------------
 * Creates a new permitted action in the PKP Permissions contract through Safe.
 * 
 * Process:
 * 1. Encodes function call for setPermittedAction
 * 2. Creates Safe transaction with encoded data
 * 3. Returns unsigned transaction for later execution
 * 
 * @param protocolKit - Safe instance for transaction creation
 * @param pkpPermissions - PKP Permissions contract instance
 * @param ipfsCid - IPFS hash of the permitted action
 * @param description - Human-readable description of the action
 * @returns Unsigned Safe transaction
 * @throws Error if transaction creation fails
 */
export const addPermittedTool = async (
  protocolKit: Safe,
  pkpPermissions: ethers.Contract,
  ipfsCid: string,
  description: string
) => {
  try {
    console.log("Creating permitted action with:", {
      ipfsCid,
      description,
      contractAddress: pkpPermissions.address
    });

    const pkpPermissionsInterface = new ethers.utils.Interface(PKPToolsArtifact.abi);
    const setPermittedActionData = pkpPermissionsInterface.encodeFunctionData(
      "setPermittedAction",
      [ipfsCid, true, description]
    );

    const safeTransaction = await protocolKit.createTransaction({
      transactions: [{
        to: pkpPermissions.address,
        value: '0',
        data: setPermittedActionData,
        operation: 0
      }]
    });

    return safeTransaction;
  } catch (error) {
    console.error("Error creating permitted action:", error);
    throw error;
  }
};

/**
 * Permitted Actions Retriever
 * -------------------------
 * Fetches all permitted actions from the PKP Permissions contract.
 * 
 * Process:
 * 1. Connects to contract with provider
 * 2. Retrieves all actions via getAllPermittedActions
 * 3. Maps contract data to structured objects
 * 
 * @param pkpPermissions - PKP Permissions contract instance
 * @param provider - Network provider for contract interaction
 * @returns Array of permitted actions with their details
 * @throws Error if retrieval fails
 * 
 * Return Structure:
 * - ipfsCid: IPFS content identifier
 * - permitted: Boolean permission status
 * - description: Action description
 */
export const getPermittedTools = async (pkpPermissions: ethers.Contract, provider: ethers.providers.Provider) => {
  try {
    const contract = new ethers.Contract(
      pkpPermissions.address,
      PKPToolsArtifact.abi,
      provider
    );
    
    const actions = await contract.functions.getAllPermittedActions();
    const [cids, permissions, descriptions] = actions;
    
    return cids.map((cid: string, i: number) => ({
      ipfsCid: cid,
      permitted: permissions[i],
      description: descriptions[i]
    }));

  } catch (error) {
    console.error("Error getting permitted actions:", error);
    console.error("Contract address:", pkpPermissions.address);
    throw error;
  }
};

/**
 * Permitted Actions Cleanup
 * -----------------------
 * Creates transaction to remove all permitted actions from the contract.
 * 
 * NOTE: NOT IMPLEMENTED IN THE CODE. 
 * This function is to help you manage your contract.
 * 
 * Process:
 * 1. Encodes removeAllPermittedActions function call
 * 2. Creates Safe transaction with encoded data
 * 3. Returns unsigned transaction for execution
 * 
 * @param protocolKit - Safe instance for transaction creation
 * @param pkpPermissions - PKP Permissions contract instance
 * @returns Unsigned Safe transaction
 * @throws Error if transaction creation fails
 * 
 * Security Note:
 * This is a destructive operation that removes all permissions
 */
export const removeAllPermittedTools = async (
  protocolKit: Safe,
  pkpPermissions: ethers.Contract,
) => {
  try {
    const pkpPermissionsInterface = new ethers.utils.Interface(PKPToolsArtifact.abi);
    const removeAllData = pkpPermissionsInterface.encodeFunctionData("removeAllPermittedActions", []);

    const safeTransaction = await protocolKit.createTransaction({
      transactions: [{
        to: pkpPermissions.address,
        value: '0',
        data: removeAllData,
        operation: 0
      }]
    });

    console.log("Created transaction to remove all permitted actions");
    return safeTransaction;
  } catch (error) {
    console.error("Error removing permitted actions:", error);
    throw error;
  }
};