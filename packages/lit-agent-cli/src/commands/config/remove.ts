import { Command } from "commander";
import inquirer from "inquirer";

import { ConfigManager } from "../../utils/config";

export function registerRemoveCommand(program: Command): void {
  program
    .command("remove")
    .description("Remove the configuration file")
    .option("-f, --force", "Skip confirmation prompt", false)
    .action(async (options, command) => {
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
            {
              type: "confirm",
              name: "confirm",
              message: "Are you sure you want to remove the configuration?",
              default: false,
            },
          ]);

          if (!confirm) {
            console.log("Operation cancelled");
            return;
          }
        }

        ConfigManager.clearConfig();
        console.log("Configuration removed successfully");
      } catch (error) {
        if (error instanceof Error) {
          command.error(`Error removing configuration: ${error.message}`);
        } else {
          command.error(
            "An unknown error occurred while removing configuration"
          );
        }
      }
    });
}
