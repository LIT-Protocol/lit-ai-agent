import { Command } from "commander";
import { ethers } from "ethers";

import { getAvailableTools, LitAgentTool } from "../../utils/tools";
import { LitClient, readNetworkFromStorage, readPkpFromStorage } from "lit-agent-signer";
import { validateEnvVar } from "../../utils/env";

export function registerListActionsCommand(program: Command): void {
  program
    .command("list-actions")
    .description("List all permitted actions for the PKP")
    .action(async (_, command) => {
      try {
        const pkp = readPkpFromStorage();

        if (!pkp?.tokenId) {
          command.error(
            "No PKP found in config. Please run 'lit-agent init' first."
          );
        }

        const litClient = await LitClient.create("0x" + process.env.ETHEREUM_PRIVATE_KEY!, {
          litNetwork: readNetworkFromStorage()!,
        });
        console.log("\nFetching permitted actions...");
        const actions = await litClient.getPermittedActions();

        litClient.disconnect();

        if (actions.length === 0) {
          console.log("No permitted actions found for this PKP.");
          return;
        }

        // Get available tools for metadata lookup
        const availableTools = getAvailableTools();

        console.log("\nPermitted Actions:");
        console.log("------------------");
        actions.forEach((actionIpfsCid, index) => {
          // Convert hex to bytes then to base58
          const bytes = ethers.utils.arrayify(actionIpfsCid);
          const base58Cid = ethers.utils.base58.encode(bytes);

          // Find matching tool if any
          const matchingTool = availableTools.find(
            (tool) => tool.ipfsId === base58Cid
          );

          console.log(`\n${index + 1}. Action Details:`);
          console.log(`   IPFS ID (hex)   : ${actionIpfsCid}`);
          console.log(`   IPFS ID (base58): ${base58Cid}`);

          if (matchingTool) {
            console.log(`   Tool Name       : ${matchingTool.name}`);
            console.log(`   Description     : ${matchingTool.description}`);
            console.log(`   Package         : ${matchingTool.package}`);
          } else {
            console.log("   Note: This is not a recognized tool action");
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          command.error(`Error listing permitted actions: ${error.message}`);
        } else {
          command.error("An unknown error occurred");
        }
      }
    });
}
