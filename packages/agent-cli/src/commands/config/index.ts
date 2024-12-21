import { Command } from "commander";
import { registerShowCommand } from "./show";
import { registerRemoveCommand } from "./remove";

export function registerConfigCommands(program: Command): void {
  const config = program.command("config");
  registerShowCommand(config);
  registerRemoveCommand(config);
}
