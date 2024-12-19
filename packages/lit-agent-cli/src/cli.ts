import { Command } from "commander";
import { registerInitCommand } from "./commands/init";
import { registerConfigCommands } from "./commands/config";
import { registerPkpCommands } from "./commands/pkp";

const program = new Command();

// Basic program information
program
  .name("lit-agent")
  .description("CLI tool for Lit Protocol agent operations")
  .version("0.1.0");

// Register commands
registerInitCommand(program);
registerConfigCommands(program);
registerPkpCommands(program);

// Interactive Mode
program
  .command("interact")
  .description("Start interactive mode for natural language interactions")
  .action(() => {
    console.log("Starting interactive mode...");
    // Here we would implement the natural language processing to match
    // user intent with available Lit Actions
  });

try {
  program.parse();
} catch (error) {
  if (error instanceof Error) {
    console.error("Error:", error.message);
  } else {
    console.error("An unknown error occurred");
  }
  process.exit(1);
}
