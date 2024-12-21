import { Command } from "commander";
import { registerInitCommand } from "./commands/init";
import { registerConfigCommands } from "./commands/config";
import { registerPkpCommands } from "./commands/pkp";
import { registerAgentCommand } from "./commands/agent";
import { registerDevCommands } from "./commands/dev";

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
registerAgentCommand(program);
registerDevCommands(program);

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
