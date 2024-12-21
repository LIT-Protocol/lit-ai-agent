import inquirer from "inquirer";
import { Command } from "commander";
import { LIT_NETWORK } from "@lit-protocol/constants";
import {
  readNetworkFromStorage,
  readCapacityTokenIdFromStorage,
  readPkpFromStorage,
} from "@lit-protocol/agent-signer";

import { initLitProtocol } from "../core/init";

export interface PKPInfo {
  publicKey: string | null;
  tokenId: string | null;
  ethAddress: string | null;
}

export interface InitConfig {
  network: (typeof LIT_NETWORK)[keyof typeof LIT_NETWORK];
  capacityTokenId: string | null;
  pkp: PKPInfo;
}

interface InitPromptAnswers {
  network: (typeof LIT_NETWORK)[keyof typeof LIT_NETWORK];
  hasCapacityToken: boolean;
  capacityTokenId?: string;
  hasPKP: boolean;
  pkpPublicKey?: string;
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize Lit Protocol configuration and clients")
    .action(async (_, command) => {
      try {
        const answers = await inquirer.prompt<InitPromptAnswers>([
          {
            type: "list",
            name: "network",
            message: "Which Lit network would you like to use?",
            default: readNetworkFromStorage() || "datil-test",
            choices: [
              { name: "Datil Mainnet", value: "datil" },
              { name: "Datil Test Network", value: "datil-test" },
              { name: "Datil Devnet", value: "datil-dev" },
            ],
          },
          {
            type: "confirm",
            name: "hasCapacityToken",
            message: "Do you have an existing Capacity Credit token ID?",
            default: !!readCapacityTokenIdFromStorage(),
          },
          {
            type: "input",
            name: "capacityTokenId",
            message: "Enter your Capacity Credit token ID:",
            when: (answers) => answers.hasCapacityToken,
            default: readCapacityTokenIdFromStorage() || undefined,
            validate: (input) => {
              if (input.trim() === "") {
                return "Token ID cannot be empty";
              }
              return true;
            },
          },
          {
            type: "confirm",
            name: "hasPKP",
            message: "Do you have an existing PKP?",
            default: !!readPkpFromStorage()?.publicKey,
          },
          {
            type: "input",
            name: "pkpPublicKey",
            message: "Enter your PKP public key:",
            when: (answers) => answers.hasPKP,
            default: readPkpFromStorage()?.publicKey || undefined,
            validate: (input) => {
              if (input.trim() === "") {
                return "Public key cannot be empty";
              }
              return true;
            },
          },
        ]);

        // Transform answers into final config
        const config: InitConfig = {
          network: answers.network,
          capacityTokenId: answers.hasCapacityToken
            ? answers.capacityTokenId!
            : null,
          pkp: {
            publicKey: answers.hasPKP ? answers.pkpPublicKey! : null,
            tokenId: null,
            ethAddress: null,
          },
        };

        console.log("\nConfiguration Summary:");
        console.log("--------------------");
        console.log(`Network: ${config.network}`);
        console.log(
          `Capacity Token ID: ${config.capacityTokenId || "Will be minted"}`
        );
        console.log(
          `PKP Public Key: ${config.pkp.publicKey || "Will be minted"}`
        );

        const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
          {
            type: "confirm",
            name: "confirm",
            message: "Would you like to proceed with this configuration?",
            default: true,
          },
        ]);

        if (confirm) {
          console.log("\nSaving initial configuration...");

          console.log("\nInitializing Lit Protocol...");
          const result = await initLitProtocol(command, config);

          if (result.capacityTokenId || result.pkp.publicKey) {
            console.log("\nMinted Resources Summary:");
            console.log("----------------------");
            if (result.capacityTokenId) {
              console.log(`New Capacity Token ID: ${result.capacityTokenId}`);
            }
            if (result.pkp.publicKey) {
              console.log(`New PKP Public Key: ${result.pkp.publicKey}`);
              console.log(`New PKP Token ID: ${result.pkp.tokenId}`);
              console.log(`New PKP ETH Address: ${result.pkp.ethAddress}`);
            }
          }

          console.log("\nInitialization completed successfully");
        } else {
          console.log("\nInitialization cancelled");
        }
      } catch (error) {
        console.error(error);
        if (error instanceof Error) {
          command.error(`Error during initialization: ${error.message}`);
        } else {
          command.error("An unknown error occurred during initialization");
        }
      }
    });
}
