import { Command } from "commander";
import inquirer from "inquirer";

import { getAvailableTools, LitAgentTool } from "../../utils/tools";
import { setActionPolicy } from "../../core/pkp/setActionPolicy";
import {
  LitClient,
  readNetworkFromStorage,
  readPkpFromStorage,
} from "@lit-protocol/agent-signer";
import { validateEnvVar } from "../../utils/env";

async function promptForPolicy(
  tool: LitAgentTool,
): Promise<string | undefined> {
  if (!tool.policySchema) {
    return undefined;
  }

  console.log("\nConfiguring tool policy:");
  const schema = tool.policySchema as any;
  const answers: Record<string, any> = {};

  // Handle each property in sequence
  for (const [key, prop] of Object.entries<any>(schema.properties)) {
    if (prop.type === "boolean") {
      // Special handling for boolean values
      const { value } = await inquirer.prompt<{ value: boolean }>([
        {
          type: "confirm",
          name: "value",
          message: prop.description,
          default: prop.default,
        },
      ]);
      answers[key] = value;
    } else if (prop.type === "array") {
      console.log(`\n${prop.description}`);
      if (prop.example) {
        console.log("Examples:", JSON.stringify(prop.example, null, 2));
      }
      console.log("Enter values as a comma-separated list");

      const { input } = await inquirer.prompt<{ input: string }>([
        {
          type: "input",
          name: "input",
          message: `Enter ${prop.items.description}:`,
          validate: (input: string) => {
            if (!input.trim()) {
              return true; // Allow empty input for empty arrays
            }

            const items = input.split(",").map((item) => item.trim());
            if (prop.items.pattern) {
              const regex = new RegExp(prop.items.pattern);
              const invalidItems = items.filter((item) => !regex.test(item));
              if (invalidItems.length > 0) {
                return `These items do not match the required pattern ${prop.items.pattern}:\n${invalidItems.join("\n")}`;
              }
            }
            return true;
          },
        },
      ]);

      answers[key] = input.trim()
        ? input.split(",").map((item) => item.trim())
        : [];
    } else {
      // Handle non-array inputs
      const { value } = await inquirer.prompt<{ value: string }>([
        {
          type: "input",
          name: "value",
          message: `Enter ${prop.description}${prop.example ? ` (example: ${prop.example})` : ""}:`,
        },
      ]);
      answers[key] = value;
    }
  }

  return tool.encodePolicyFn ? tool.encodePolicyFn(answers) : undefined;
}

export function registerAddToolCommand(program: Command): void {
  program
    .command("add-tool")
    .description("Add a Lit Agent tool to a PKP")
    .action(async (_, command) => {
      try {
        const pkp = readPkpFromStorage();

        if (!pkp?.tokenId) {
          command.error(
            "No PKP found in config. Please run 'lit-agent init' first.",
          );
        }

        const availableTools = getAvailableTools();

        if (availableTools.length === 0) {
          command.error("No Lit Agent tools available.");
        }

        const { selectedTool } = await inquirer.prompt<{
          selectedTool: LitAgentTool;
        }>([
          {
            type: "list",
            name: "selectedTool",
            message: "Which Lit Agent tool would you like to add?",
            choices: availableTools.map((tool) => ({
              name: `${tool.name} - ${tool.description}`,
              value: tool,
            })),
          },
        ]);

        console.log(`\nAdding ${selectedTool.name} tool to PKP...`);
        console.log("Tool details:");
        console.log(`- Package: ${selectedTool.package}`);
        console.log(`- IPFS ID: ${selectedTool.ipfsId}`);

        // Prompt for policy configuration if the tool has a policy schema
        const encodedPolicy = await promptForPolicy(selectedTool);

        const litClient = await LitClient.create(
          "0x" + validateEnvVar("ETHEREUM_PRIVATE_KEY", command),
          {
            litNetwork: readNetworkFromStorage()!,
          },
        );

        await litClient.addPermittedAction({ ipfsId: selectedTool.ipfsId });

        litClient.disconnect();

        console.log("Setting action policy in registry...");
        const policyTx = await setActionPolicy({
          command,
          pkpAddress: pkp!.ethAddress!,
          ipfsCid: selectedTool.ipfsId,
          description: selectedTool.description,
          policy: encodedPolicy,
        });
        await policyTx.wait();
        console.log("Successfully set action policy in registry!");
        console.log(`Transaction hash: ${policyTx.hash}`);

        console.log(`\nSuccessfully added ${selectedTool.name} tool to PKP`);
      } catch (error) {
        if (error instanceof Error) {
          command.error(`Error adding tool to PKP: ${error.message}`);
        } else {
          command.error("An unknown error occurred");
        }
      }
    });
}
