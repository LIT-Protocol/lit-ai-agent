import { Command } from "commander";

import { registerAddToolCommand } from "./add-tool";
import { registerListActionsCommand } from "./list-actions";

export function registerPkpCommands(program: Command): void {
  const pkp = program.command("pkp");
  registerAddToolCommand(pkp);
  registerListActionsCommand(pkp);
}
