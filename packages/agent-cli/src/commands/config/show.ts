import { Command } from "commander";
import {
  readNetworkFromStorage,
  readCapacityTokenIdFromStorage,
  readPkpFromStorage,
} from "@lit-protocol/agent-signer";

export function registerShowCommand(program: Command): void {
  program
    .command("show")
    .description("Show current configuration")
    .action(async (_, command) => {
      try {
        const network = readNetworkFromStorage();
        const capacityTokenId = readCapacityTokenIdFromStorage();
        const pkp = readPkpFromStorage();

        if (!network || !pkp) {
          console.log(
            "No configuration found. Run 'lit-agent init' to set up."
          );
          return;
        }

        console.log("\nCurrent Configuration:");
        console.log("---------------------");
        console.log(`Network: ${network}`);
        console.log(`Capacity Token ID: ${capacityTokenId}`);
        console.log("\nPKP:");
        console.log(`  Token ID: ${pkp.tokenId}`);
        console.log(`  Public Key: ${pkp.publicKey}`);
        console.log(`  ETH Address: ${pkp.ethAddress}`);
      } catch (error) {
        if (error instanceof Error) {
          command.error(`Error reading configuration: ${error.message}`);
        } else {
          command.error(
            "An unknown error occurred while reading configuration"
          );
        }
      }
    });
}
