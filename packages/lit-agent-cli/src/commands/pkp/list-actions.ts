import { Command } from "commander";

import { ConfigManager } from "../../utils/config";
import { listPermittedActions } from "../../core/pkp/listPermittedActions";

export function registerListActionsCommand(program: Command): void {
  program
    .command("list-actions")
    .description("List all permitted actions for the PKP")
    .action(async (_, command) => {
      try {
        const config = await ConfigManager.loadConfig();

        if (!config.pkp?.tokenId) {
          command.error(
            "No PKP found in config. Please run 'lit-agent init' first."
          );
        }

        console.log("\nFetching permitted actions...");
        const actions = await listPermittedActions(config);

        if (actions.length === 0) {
          console.log("No permitted actions found for this PKP.");
          return;
        }

        console.log("\nPermitted Actions:");
        console.log("------------------");
        actions.forEach((actionIpfsCid, index) => {
          console.log(`\n${index + 1}. Action Details:`);
          console.log(`   IPFS ID: ${actionIpfsCid}`);
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
