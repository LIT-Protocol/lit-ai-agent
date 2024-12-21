import { Command } from "commander";
import inquirer from "inquirer";
import fs from 'fs';
import path from 'path';

export function registerRemoveCommand(program: Command): void {
  program
    .command("remove")
    .description("Remove the lit-session-storage directory")
    .option("-f, --force", "Skip confirmation prompt", false)
    .action(async (options, command) => {
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
            {
              type: "confirm",
              name: "confirm",
              message: "Are you sure you want to remove lit-session-storage?",
              default: false,
            },
          ]);

          if (!confirm) {
            console.log("Operation cancelled");
            return;
          }
        }

        const storagePath = path.resolve('../lit-session-storage');
        if (fs.existsSync(storagePath)) {
          fs.rmSync(storagePath, { recursive: true, force: true });
          console.log("@lit-protocol/session-storage removed successfully");
        } else {
          console.log("@lit-protocol/session-storage not found");
        }
      } catch (error) {
        if (error instanceof Error) {
          command.error(`Error removing lit-session-storage: ${error.message}`);
        } else {
          command.error(
            "An unknown error occurred while removing lit-session-storage"
          );
        }
      }
    });
}