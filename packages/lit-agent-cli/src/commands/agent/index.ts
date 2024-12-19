import { Command } from "commander";
import inquirer from "inquirer";
import { OpenAI } from "openai";
import { ethers } from "ethers";
import { analyzeUserIntentAndMatchAction } from "lit-agent-toolkit";

import { ConfigManager } from "../../utils/config";

const LIT_AGENT_REGISTRY_ABI = ["function registerPKP(address pkp) external"];

export function registerAgentCommand(program: Command): void {
  program
    .command("agent")
    .description("Start an interactive session with the Lit Agent")
    .action(async (_, command) => {
      try {
        const config = await ConfigManager.loadConfig();

        if (!config.pkp?.tokenId) {
          command.error(
            "No PKP found in config. Please run 'lit-agent init' first."
          );
        }

        // Check for OpenAI API key
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (openaiApiKey === "" || openaiApiKey === undefined) {
          command.error(
            "Missing OPENAI_API_KEY environment variable. Please set it in your .env file."
          );
        }

        // Check for LIT_AGENT_REGISTRY_ADDRESS
        const litAgentRegistryAddress = process.env.LIT_AGENT_REGISTRY_ADDRESS;
        if (
          litAgentRegistryAddress === "" ||
          litAgentRegistryAddress === undefined
        ) {
          command.error(
            "Missing LIT_AGENT_REGISTRY_ADDRESS environment variable. Please set it in your .env file."
          );
        }

        // Initialize OpenAI client
        const openai = new OpenAI({
          apiKey: openaiApiKey as string,
        });

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

        console.log("\nAnalyzing your request...");

        const mockRegistry = new ethers.Contract(
          litAgentRegistryAddress as string,
          LIT_AGENT_REGISTRY_ABI,
          new ethers.providers.JsonRpcProvider("http://localhost:8545")
        );

        const { analysis, matchedAction } =
          await analyzeUserIntentAndMatchAction(
            openai,
            prompt,
            mockRegistry,
            config.pkp!.ethAddress!,
            config.pkp!.tokenId!
          );

        if (matchedAction) {
          console.log("\n✅ Found a matching action!");
          console.log("Action Details:");
          console.log(`- Description: ${matchedAction.description}`);
          console.log(`- IPFS CID: ${matchedAction.ipfsCid}`);

          // Log additional parameters if they exist
          if (analysis.tokenIn) console.log(`- Token In: ${analysis.tokenIn}`);
          if (analysis.tokenOut)
            console.log(`- Token Out: ${analysis.tokenOut}`);
          if (analysis.amountIn)
            console.log(`- Amount In: ${analysis.amountIn}`);
          if (analysis.recipientAddress)
            console.log(`- Recipient: ${analysis.recipientAddress}`);

          // TODO: Add execution confirmation and handling
        } else {
          console.log("\n❌ No matching action found for your request.");
          console.log(
            "Please try rephrasing your request or check available actions with 'lit-agent pkp list-actions'"
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          command.error(`Error processing request: ${error.message}`);
        } else {
          command.error("An unknown error occurred");
        }
      }
    });
}
