import { Command } from "commander";

import { registerAddToolCommand } from "./add-tool";
import { registerListRegisteredActionsCommand } from "./list-registered-actions";

export function registerPkpCommands(program: Command): void {
  const pkpCommand = program
    .command("pkp")
    .description("PKP management commands");

  registerAddToolCommand(pkpCommand);
  registerListRegisteredActionsCommand(pkpCommand);
}
