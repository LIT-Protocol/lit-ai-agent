import { Command } from "commander";
import { ethers } from "ethers";

export function registerDevCommands(program: Command): void {
  const devCommand = program
    .command("dev")
    .description("Development utilities for Lit Agent");

  devCommand
    .command("fundLitWallet")
    .description("Fund the Lit wallet from Anvil dev wallet")
    .option("-a, --amount <amount>", "Amount of ETH to send", "1")
    .action(async (options) => {
      try {
        const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY;
        if (!ETHEREUM_PRIVATE_KEY) {
          throw new Error(
            "ETHEREUM_PRIVATE_KEY environment variable is required"
          );
        }

        // Connect to local Anvil node
        const provider = new ethers.providers.JsonRpcProvider(
          "http://localhost:8545"
        );

        // Get the first Anvil account (which has test ETH)
        const anvilWallet = new ethers.Wallet(
          // This is the private key of the first Anvil test account
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
          provider
        );

        // Get the Lit wallet address from the private key
        const litWallet = new ethers.Wallet(ETHEREUM_PRIVATE_KEY);
        const litWalletAddress = litWallet.address;

        console.log(
          `Funding Lit wallet (${litWalletAddress}) from Anvil wallet (${anvilWallet.address})...`
        );

        // Convert amount from ETH to wei
        const amountInWei = ethers.utils.parseEther(options.amount);

        // Send the transaction
        const tx = await anvilWallet.sendTransaction({
          to: litWalletAddress,
          value: amountInWei,
          gasLimit: 21000, // Standard gas limit for ETH transfers
        });

        console.log(`Transaction sent: ${tx.hash}`);

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log(`\nTransaction confirmed!`);
        console.log(`Transaction hash: ${receipt.transactionHash}`);
        console.log(`Amount sent: ${options.amount} ETH`);

        // Get new balance
        const newBalance = await provider.getBalance(litWalletAddress);
        console.log(
          `New wallet balance: ${ethers.utils.formatEther(newBalance)} ETH`
        );
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error funding wallet: ${error.message}`);
          process.exit(1);
        } else {
          console.error("An unknown error occurred");
          process.exit(1);
        }
      }
    });
}
