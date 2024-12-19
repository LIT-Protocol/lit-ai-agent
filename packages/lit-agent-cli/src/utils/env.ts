import { Command } from "commander";

/**
 * Validates that an environment variable exists and is not empty
 * @param envName The name of the environment variable to check
 * @param command The Commander command instance for error handling
 * @returns The environment variable value if valid
 */
export function validateEnvVar(envName: string, command: Command): string {
  const value = process.env[envName];
  if (value === "" || value === undefined) {
    command.error(
      `Missing ${envName} environment variable. Please set it in your .env file.`
    );
  }
  return value as string;
}
