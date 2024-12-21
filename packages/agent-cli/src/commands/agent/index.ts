import { Command } from "commander";
import inquirer from "inquirer";
import { processAgentRequest } from "../../core/agent";

export function registerAgentCommand(program: Command): void {
  program
    .command("agent")
    .description("Start an interactive session with the Lit Agent")
    .action(async (_, command) => {
      try {
        // Get user input
        const { prompt } = await inquirer.prompt([
          {
            type: "input",
            name: "prompt",
            message: "What would you like the Lit Agent to do?",
            validate: (input) => {
              if (!input.trim()) {
                return "Please enter a prompt";
              }
              return true;
            },
          },
        ]);

        await processAgentRequest(prompt, command);
      } catch (error) {
        console.error(error);
        if (error instanceof Error) {
          command.error(`Error processing request: ${error.message}`);
        } else {
          command.error("An unknown error occurred");
        }
      }
    });
}
