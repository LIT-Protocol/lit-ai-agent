import inquirer from 'inquirer';
import type { ToolInfo } from '@lit-protocol/fss-tool-registry';
import { logger } from '../utils/logger';
import { ethers } from 'ethers';
import { promptForChainConfig } from './chain-config';

interface ToolParameters {
  foundParams: Record<string, string>;
  missingParams: string[];
}

export async function collectMissingParams(
  tool: ToolInfo,
  params: ToolParameters
): Promise<Record<string, any>> {
  while (true) {
    const allParams = { ...params.foundParams };
    let chainConfig = null;

    if (params.missingParams.length > 0) {
      logger.warn('Some parameters are missing. Please provide them:');

      for (const paramName of params.missingParams) {
        // Check if the parameter is chain related
        if (paramName === 'rpcUrl' || paramName === 'chainId') {
          if (!chainConfig) {
            chainConfig = await promptForChainConfig();
            // Add chain config parameters to allParams
            allParams['rpcUrl'] = chainConfig.rpcUrl;
            allParams['chainId'] = chainConfig.chainId.toString();
          }
          continue;
        }

        const paramInfo = tool.parameters.find((p) => p.name === paramName);
        if (!paramInfo) {
          throw new Error(`Unknown parameter: ${paramName}`);
        }

        const { value } = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: `Enter ${paramName} (${paramInfo.description}):`,
            validate: (input: string) => {
              if (!input.trim()) {
                return `${paramName} is required`;
              }

              // Tool-specific parameter validation
              switch (tool.name) {
                case 'ERC20Send':
                  if (paramName.toLowerCase().includes('amount')) {
                    try {
                      ethers.utils.parseEther(input);
                      return true;
                    } catch {
                      return 'Invalid amount. Please enter a valid number.';
                    }
                  }
                  if (paramName.toLowerCase().includes('address')) {
                    if (!ethers.utils.isAddress(input)) {
                      return 'Invalid Ethereum address';
                    }
                  }
                  break;

                case 'SwapUniswap':
                  if (paramName === 'amountIn') {
                    try {
                      ethers.utils.parseEther(input);
                      return true;
                    } catch {
                      return 'Invalid input amount. Please enter a valid number.';
                    }
                  }
                  if (paramName === 'tokenIn' || paramName === 'tokenOut') {
                    if (!ethers.utils.isAddress(input)) {
                      return 'Invalid token address';
                    }
                  }
                  break;

                default:
                  // Generic validation for unknown tools
                  if (paramName.toLowerCase().includes('amount')) {
                    try {
                      ethers.utils.parseEther(input);
                      return true;
                    } catch {
                      return 'Invalid amount. Please enter a valid number.';
                    }
                  }
                  if (paramName.toLowerCase().includes('address') || paramName.toLowerCase().includes('token')) {
                    if (!ethers.utils.isAddress(input)) {
                      return 'Invalid Ethereum address';
                    }
                  }
              }

              return true;
            },
          },
        ]);

        allParams[paramName] = value.trim();
      }
    }

    // Show all parameters for confirmation
    logger.info('Parameters to be used:');
    Object.entries(allParams).forEach(([key, value]) => {
      logger.log(`  ${key}: ${value}`);
    });

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Would you like to proceed with these parameters?',
        default: true,
      },
    ]);

    if (confirmed) {
      // If chainConfig was collected, include it in the special chainInfo field
      if (chainConfig) {
        return {
          ...allParams,
          chainInfo: chainConfig,
        };
      }
      return allParams;
    }

    logger.info('Restarting parameter collection...');
    // Reset found parameters for missing ones to collect them again
    params.missingParams = [
      ...params.missingParams,
      ...Object.keys(allParams).filter((key) => !params.foundParams[key]),
    ];
  }
}
