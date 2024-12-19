import { Command } from "commander";
import inquirer from "inquirer";
import { OpenAI } from "openai";
import { ethers } from "ethers";

import { ConfigManager } from "../../utils/config";
import { analyzeUserIntentAndMatchAction } from "lit-agent-toolkit";

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
        if (!openaiApiKey) {
          command.error(
            "Missing OPENAI_API_KEY environment variable. Please set it in your .env file."
          );
        }

        // Initialize OpenAI client
        const openai = new OpenAI({
          apiKey: openaiApiKey,
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

        // TODO: Replace with actual registry contract instance
        // This is a placeholder - you'll need to add the actual contract integration
        const mockRegistry = new ethers.Contract(
          "0x0000000000000000000000000000000000000000",
          [],
          ethers.providers.getDefaultProvider()
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
