import { Command } from "commander";
import { ConfigManager } from "../../utils/config";

export function registerRemoveCommand(program: Command): void {
  program
    .command("remove")
    .description("Remove the configuration file")
    .option("-f, --force", "Skip confirmation prompt", false)
    .action(async (options) => {
      try {
        if (!options.force) {
          const inquirer = (await import("inquirer")).default;
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
        console.error("Error removing configuration:", error);
        process.exit(1);
      }
    });
}
