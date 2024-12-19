import { Command } from "commander";
import { ConfigManager } from "../../utils/config";

export function registerShowCommand(program: Command): void {
  program
    .command("show")
    .description("Show current configuration")
    .action(async (_, command) => {
      try {
        const currentConfig = await ConfigManager.loadConfig();

        if (Object.keys(currentConfig).length === 0) {
          console.log(
            "No configuration found. Run 'lit-agent init' to set up."
          );
          return;
        }

        console.log("\nCurrent Configuration:");
        console.log("---------------------");
        console.log(`Config Location: ${ConfigManager.getConfigPath()}`);

        // Format each config entry
        Object.entries(currentConfig).forEach(([key, value]) => {
          if (key === "pkp" && value) {
            console.log("pkp:");
            Object.entries(value).forEach(([pkpKey, pkpValue]) => {
              console.log(`  ${pkpKey}: ${pkpValue || "Not set"}`);
            });
          } else {
            console.log(`${key}: ${value || "Not set"}`);
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          command.error(`Error reading configuration: ${error.message}`);
        } else {
          command.error(
            "An unknown error occurred while reading configuration"
          );
        }
      }
    });
}
