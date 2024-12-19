import { Command } from "commander";
import { ethers } from "ethers";
import { ConfigManager } from "../../utils/config";
import { getAvailableTools } from "../../utils/tools";

const LIT_AGENT_REGISTRY_ABI = [
  "function getRegisteredActions(address user, address pkp) external view returns (string[] memory ipfsCids, bytes[] memory descriptions, bytes[] memory policies)",
];

export function registerListRegisteredActionsCommand(program: Command): void {
  program
    .command("list-registered-actions")
    .description(
      "List all registered actions for the current PKP in the LitAgentRegistry"
    )
    .action(async (_, command) => {
      try {
        const config = await ConfigManager.loadConfig();

        if (!config.pkp?.tokenId || !config.pkp?.ethAddress) {
          command.error(
            "No PKP found in config. Please run 'lit-agent init' first."
          );
        }

        const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY;
        const LIT_AGENT_REGISTRY_ADDRESS =
          process.env.LIT_AGENT_REGISTRY_ADDRESS;

        if (!ETHEREUM_PRIVATE_KEY) {
          throw new Error(
            "ETHEREUM_PRIVATE_KEY environment variable is required"
          );
        }

        if (!LIT_AGENT_REGISTRY_ADDRESS) {
          throw new Error(
            "LIT_AGENT_REGISTRY_ADDRESS environment variable is required"
          );
        }

        // Get all available tools for metadata lookup
        const availableTools = getAvailableTools();
        const toolsByIpfsId = availableTools.reduce(
          (acc, tool) => {
            acc[tool.ipfsId] = tool;
            return acc;
          },
          {} as Record<string, (typeof availableTools)[0]>
        );

        // Connect to registry contract
        const provider = new ethers.providers.JsonRpcProvider(
          "http://localhost:8545"
        );
        const signer = new ethers.Wallet(ETHEREUM_PRIVATE_KEY, provider);
        const registry = new ethers.Contract(
          LIT_AGENT_REGISTRY_ADDRESS,
          LIT_AGENT_REGISTRY_ABI,
          signer
        );

        console.log("\nFetching registered actions...");

        const [ipfsCids, descriptions, policies] =
          await registry.getRegisteredActions(
            signer.address,
            config.pkp!.ethAddress!
          );

        if (ipfsCids.length === 0) {
          console.log("No registered actions found for this PKP.");
          return;
        }

        console.log("\nRegistered Actions:");
        console.log("------------------");

        for (let i = 0; i < ipfsCids.length; i++) {
          const ipfsCid = ipfsCids[i];
          const description = ethers.utils.toUtf8String(descriptions[i]);
          const policy =
            policies[i] !== "0x"
              ? JSON.parse(ethers.utils.toUtf8String(policies[i]))
              : null;

          console.log(`\n${i + 1}. IPFS CID: ${ipfsCid}`);
          console.log(`   Description: ${description}`);

          // Add metadata from available tools if found
          const toolMetadata = toolsByIpfsId[ipfsCid];
          if (toolMetadata) {
            console.log(`   Name: ${toolMetadata.name}`);
            console.log(`   Package: ${toolMetadata.package}`);
          }

          if (policy) {
            console.log("   Policy:");
            console.log("   -------");
            Object.entries(policy).forEach(([key, value]) => {
              console.log(`   ${key}: ${value}`);
            });
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          command.error(`Error listing registered actions: ${error.message}`);
        } else {
          command.error("An unknown error occurred");
        }
      }
    });
}
