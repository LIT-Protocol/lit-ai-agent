import { Command } from "commander";
import { ethers } from "ethers";
import { getAvailableTools } from "../../utils/tools";
import { validateEnvVar } from "../../utils/env";
import { readPkpFromStorage } from "@lit-protocol/agent-signer";

const LIT_AGENT_REGISTRY_ABI = [
  "function getRegisteredActions(address user, address pkp) external view returns (string[] memory ipfsCids, bytes[] memory descriptions, bytes[] memory policies)",
];

function base58ToHex(base58Str: string): string {
  try {
    const bytes = ethers.utils.base58.decode(base58Str);
    return ethers.utils.hexlify(bytes);
  } catch (error) {
    return base58Str; // Return original if conversion fails
  }
}

function hexToBase58(hexStr: string): string {
  try {
    if (!hexStr.startsWith("0x")) {
      hexStr = "0x" + hexStr;
    }
    const bytes = ethers.utils.arrayify(hexStr);
    return ethers.utils.base58.encode(bytes);
  } catch (error) {
    return hexStr; // Return original if conversion fails
  }
}

export function registerListRegisteredActionsCommand(program: Command): void {
  program
    .command("list-registered-actions")
    .description(
      "List all registered actions for the current PKP in the LitAgentRegistry"
    )
    .action(async (_, command) => {
      try {
        const pkp = readPkpFromStorage();

        if (!pkp?.tokenId || !pkp?.ethAddress) {
          command.error(
            "No PKP found in config. Please run 'lit-agent init' first."
          );
        }

        // Validate environment variables
        const ethereumPrivateKey = validateEnvVar(
          "ETHEREUM_PRIVATE_KEY",
          command
        );
        const litAgentRegistryAddress = validateEnvVar(
          "LIT_AGENT_REGISTRY_ADDRESS",
          command
        );
        const chainToSubmitTxnOnRpcUrl = validateEnvVar(
          "CHAIN_TO_SUBMIT_TXN_ON_RPC_URL",
          command
        );

        // Get all available tools for metadata lookup
        const availableTools = getAvailableTools();
        const toolsByIpfsId = availableTools.reduce(
          (acc, tool) => {
            // Store both hex and base58 versions as keys
            const hexId = tool.ipfsId.startsWith("0x")
              ? tool.ipfsId
              : base58ToHex(tool.ipfsId);
            const base58Id = tool.ipfsId.startsWith("0x")
              ? hexToBase58(tool.ipfsId)
              : tool.ipfsId;
            acc[hexId] = tool;
            acc[base58Id] = tool;
            return acc;
          },
          {} as Record<string, (typeof availableTools)[0]>
        );

        // Connect to registry contract
        const provider = new ethers.providers.JsonRpcProvider(
          chainToSubmitTxnOnRpcUrl
        );
        const signer = new ethers.Wallet(ethereumPrivateKey, provider);
        const registry = new ethers.Contract(
          litAgentRegistryAddress,
          LIT_AGENT_REGISTRY_ABI,
          signer
        );

        console.log("\nFetching registered actions...");

        const [ipfsCids, descriptions, policies] =
          await registry.getRegisteredActions(signer.address, pkp!.ethAddress!);

        if (ipfsCids.length === 0) {
          console.log("No registered actions found for this PKP.");
          return;
        }

        console.log("\nRegistered Actions:");
        console.log("------------------");

        for (let i = 0; i < ipfsCids.length; i++) {
          const ipfsCid = ipfsCids[i];

          // Skip empty or invalid IPFS IDs
          if (!ipfsCid || ipfsCid === "0x" || ipfsCid === "") {
            continue;
          }

          console.log(`\n${i + 1}. Action Details:`);

          // Display both hex and base58 formats
          if (ipfsCid.startsWith("0x")) {
            console.log(`   IPFS ID (hex)   : ${ipfsCid}`);
            console.log(`   IPFS ID (base58): ${hexToBase58(ipfsCid)}`);
          } else {
            const hexId = base58ToHex(ipfsCid);
            console.log(`   IPFS ID (hex)   : ${hexId}`);
            console.log(`   IPFS ID (base58): ${ipfsCid}`);
          }

          // Add metadata from available tools if found
          const toolMetadata = toolsByIpfsId[ipfsCid];
          if (toolMetadata) {
            console.log(`   Tool Name       : ${toolMetadata.name}`);
            console.log(
              `   Description     : ${ethers.utils.toUtf8String(descriptions[i] || "0x")}`
            );
            console.log(`   Package         : ${toolMetadata.package}`);
          }

          const policyBytes = policies[i];
          if (policyBytes && policyBytes !== "0x") {
            console.log("   Policy          :");

            // If we have a known tool with a policy decoder, use it
            if (toolMetadata?.decodePolicyFn) {
              try {
                const decodedPolicy = toolMetadata.decodePolicyFn(policyBytes);

                // Handle Uniswap-style policy (maxAmount and allowedTokens)
                if (
                  "maxAmount" in decodedPolicy &&
                  "allowedTokens" in decodedPolicy
                ) {
                  console.log(
                    `     Max Amount    : ${ethers.utils.formatEther(decodedPolicy.maxAmount)} ETH`
                  );
                  console.log("     Allowed Tokens:");
                  decodedPolicy.allowedTokens.forEach(
                    (token: string, index: number) => {
                      console.log(`       ${index + 1}. ${token}`);
                    }
                  );
                } else {
                  // For other policy types, display all properties
                  Object.entries(decodedPolicy).forEach(([key, value]) => {
                    console.log(`     ${key}: ${value}`);
                  });
                }
              } catch (error) {
                console.log(
                  `     Error decoding policy: ${(error as Error).message}`
                );
                displayRawPolicyBytes(policyBytes);
              }
            } else {
              // No known decoder, display raw bytes
              displayRawPolicyBytes(policyBytes);
            }
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

function displayRawPolicyBytes(policyBytes: string) {
  try {
    const rawBytes = Array.from(ethers.utils.arrayify(policyBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    console.log(`     Raw Policy Bytes: 0x${rawBytes}`);
  } catch {
    console.log(`     Raw Policy Bytes: ${policyBytes}`);
  }
  console.log(
    "     (Unable to decode policy - may be using a different format)"
  );
}
