import { Command } from "commander";
import inquirer from "inquirer";

import { ConfigManager } from "../../utils/config";
import { getAvailableTools, LitAgentTool } from "../../utils/tools";
import { addPermittedActionToPkp } from "../../core/pkp/addPermittedAction";
import { setActionPolicy } from "../../core/pkp/setActionPolicy";

export function registerAddToolCommand(program: Command): void {
  program
    .command("add-tool")
    .description("Add a Lit Agent tool to a PKP")
    .action(async (_, command) => {
      try {
        const config = await ConfigManager.loadConfig();

        if (!config.pkp?.tokenId) {
          command.error(
            "No PKP found in config. Please run 'lit-agent init' first."
          );
        }

        const availableTools = getAvailableTools();

        if (availableTools.length === 0) {
          command.error("No Lit Agent tools available.");
        }

        const { selectedTool } = await inquirer.prompt<{
          selectedTool: LitAgentTool;
        }>([
          {
            type: "list",
            name: "selectedTool",
            message: "Which Lit Agent tool would you like to add?",
            choices: availableTools.map((tool) => ({
              name: `${tool.name} - ${tool.description}`,
              value: tool,
            })),
          },
        ]);

        console.log(`\nAdding ${selectedTool.name} tool to PKP...`);
        console.log("Tool details:");
        console.log(`- Package: ${selectedTool.package}`);
        console.log(`- IPFS ID: ${selectedTool.ipfsId}`);

        const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
          {
            type: "confirm",
            name: "confirm",
            message: "Would you like to proceed?",
            default: true,
          },
        ]);

        if (!confirm) {
          console.log("Operation cancelled");
          return;
        }

        await addPermittedActionToPkp(config, selectedTool.ipfsId);

        console.log("Setting action policy in registry...");
        const policyTx = await setActionPolicy({
          pkpAddress: config.pkp!.ethAddress!,
          ipfsCid: selectedTool.ipfsId,
          description: selectedTool.description,
          command,
        });
        await policyTx.wait();
        console.log("Successfully set action policy in registry!");
        console.log(`Transaction hash: ${policyTx.hash}`);

        console.log(`\nSuccessfully added ${selectedTool.name} tool to PKP`);
      } catch (error) {
        if (error instanceof Error) {
          command.error(`Error adding tool to PKP: ${error.message}`);
        } else {
          command.error("An unknown error occurred");
        }
      }
    });
}
