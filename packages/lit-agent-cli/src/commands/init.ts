import inquirer from "inquirer";
import { Command } from "commander";
import { LIT_NETWORK } from "@lit-protocol/constants";

import { ConfigManager } from "../utils/config";
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
        console.log("DEBUG: Starting init command");
        const existingConfig = await ConfigManager.loadConfig();
        console.log("DEBUG: Loaded config:", existingConfig);
        console.log("DEBUG: About to prompt");

        const answers = await inquirer.prompt<InitPromptAnswers>([
          {
            type: "list",
            name: "network",
            message: "Which Lit network would you like to use?",
            default: existingConfig?.network || "datil-test",
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
            default: !!existingConfig?.capacityTokenId,
          },
          {
            type: "input",
            name: "capacityTokenId",
            message: "Enter your Capacity Credit token ID:",
            when: (answers) => answers.hasCapacityToken,
            default: existingConfig?.capacityTokenId || undefined,
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
            default: !!existingConfig?.pkp?.publicKey,
          },
          {
            type: "input",
            name: "pkpPublicKey",
            message: "Enter your PKP public key:",
            when: (answers) => answers.hasPKP,
            default: existingConfig?.pkp?.publicKey || undefined,
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
        console.log(
          `Config will be saved to: ${ConfigManager.getConfigPath()}`
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
          await ConfigManager.saveConfig(config);

          console.log("\nInitializing Lit Protocol...");
          const result = await initLitProtocol(config);

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
