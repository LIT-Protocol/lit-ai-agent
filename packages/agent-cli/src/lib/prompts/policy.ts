import inquirer from 'inquirer';
import type { ToolInfo } from '@lit-protocol/agent-tool-registry';
import {
  getToolFromRegistry,
  isToolSupported,
} from '@lit-protocol/agent-tool-registry';
import { logger } from '../utils/logger.js';
import { z } from 'zod';
import { ethers } from 'ethers';

export async function promptForToolPolicy(
  tool: ToolInfo,
  currentPolicy: any | null
): Promise<{ usePolicy: boolean; policyValues?: any }> {
  logger.warn('Tool Policy Configuration');
  logger.log(`Tool: ${tool.name}`);

  if (!isToolSupported(tool.name)) {
    return { usePolicy: false };
  }

  const registryTool = getToolFromRegistry(tool.name);

  const response = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'usePolicy',
      message: 'Would you like to configure a policy for this tool?',
      default: false,
    },
  ]);

  if (!response.usePolicy) {
    return { usePolicy: false };
  }

  try {
    // Get the policy schema from the registry tool
    const policySchema = registryTool.Policy.schema;

    // Create policy values object with default type and version
    const policyValues: Record<string, any> = {
      type: tool.name,
      version: '1.0.0',
    };

    // Get the shape of the schema to determine what fields to prompt for
    const shape = policySchema.shape as Record<string, z.ZodTypeAny>;
    for (const [key, zodField] of Object.entries(shape)) {
      // Skip type and version as they're handled above
      if (key === 'type' || key === 'version') continue;

      // Check if the field is an array
      const isArray = zodField instanceof z.ZodArray;

      if (isArray) {
        // Handle array fields (like allowedTokens, allowedRecipients)
        const arrayResponse = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'useArray',
            message: `Would you like to configure ${key}?`,
            default: false,
          },
        ]);

        const values: string[] = [];
        if (arrayResponse.useArray) {
          while (true) {
            const valueResponse = await inquirer.prompt([
              {
                type: 'input',
                name: 'value',
                message: `Enter a value for ${key} (or leave empty to finish):`,
                validate: (input: string) => {
                  if (!input) return true;
                  try {
                    // For array fields, validate against the array element type
                    (zodField as z.ZodArray<any>).element.parse(input);
                    return true;
                  } catch (err) {
                    const error = err as z.ZodError;
                    return `Invalid value: ${
                      error.errors[0]?.message || 'Unknown error'
                    }`;
                  }
                },
              },
            ]);

            if (!valueResponse.value) break;
            values.push(valueResponse.value);
          }
        }
        policyValues[key] = values;
      } else {
        // Handle scalar fields (like maxAmount)
        const valueResponse = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: key.toLowerCase().startsWith('max')
              ? `Enter ${key} (in ETH):`
              : `Enter ${key}:`,
            validate: (input: string) => {
              try {
                if (key.toLowerCase().startsWith('max')) {
                  // Convert ETH to wei for validation
                  const weiValue = ethers.utils.parseEther(input).toString();
                  zodField.parse(weiValue);
                } else {
                  zodField.parse(input);
                }
                return true;
              } catch (err) {
                const error = err as z.ZodError;
                return `Invalid value: ${
                  error.errors[0]?.message || 'Unknown error'
                }`;
              }
            },
          },
        ]);

        // Convert ETH to wei for maxAmount fields
        if (key.toLowerCase().startsWith('max')) {
          policyValues[key] = ethers.utils
            .parseEther(valueResponse.value)
            .toString();
        } else {
          policyValues[key] = valueResponse.value;
        }
      }
    }

    // Show policy summary
    logger.info('Policy Summary:');
    Object.entries(policyValues).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        logger.log(`${key}: ${value.length ? value.join(', ') : 'Any'}`);
      } else if (key.toLowerCase().startsWith('max')) {
        // Show amounts in ETH
        logger.log(`${key}: ${ethers.utils.formatEther(value)} ETH`);
      } else {
        logger.log(`${key}: ${value}`);
      }
    });

    const confirmResponse = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Would you like to proceed with this policy?',
        default: true,
      },
    ]);

    if (!confirmResponse.confirmed) {
      return { usePolicy: false };
    }

    return { usePolicy: true, policyValues };
  } catch (err) {
    const error = err as Error;
    logger.error(`Failed to configure policy: ${error.message}`);
    return { usePolicy: false };
  }
}
