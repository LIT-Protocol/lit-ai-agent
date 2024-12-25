import {
  LitAgent,
  LitAgentError,
  LitAgentErrorType,
} from '@lit-protocol/full-self-signing';
import { ToolInfo } from '@lit-protocol/fss-tool-registry';
import { logger } from './utils/logger';
import { storage } from './utils/storage';
import {
  promptForOpenAIKey,
  promptForAuthPrivateKey,
  promptForToolPolicyRegistryConfig,
} from './prompts/config';
import { promptForUserIntent } from './prompts/intent';
import { promptForToolPermission } from './prompts/permissions';
import { collectMissingParams } from './prompts/parameters';
import { promptForToolPolicy } from './prompts/policy';
import inquirer from 'inquirer';

interface LitAgentErrorWithType extends Error {
  type: LitAgentErrorType;
  message: string;
  details?: {
    originalError?: Error;
  };
}

export class AgentCLI {
  private litAgent: LitAgent | null = null;

  async start() {
    await this.initializeLitAgent();
    await this.startInteractiveMode();
  }

  private async initializeLitAgent() {
    try {
      // Get configuration
      const authPrivateKey = await promptForAuthPrivateKey();
      const openAiKey = await promptForOpenAIKey();
      const toolPolicyRegistryConfig =
        await promptForToolPolicyRegistryConfig();

      // Initialize the agent
      this.litAgent = new LitAgent(
        authPrivateKey,
        openAiKey,
        undefined,
        toolPolicyRegistryConfig
          ? {
              rpcUrl: toolPolicyRegistryConfig.rpcUrl,
              contractAddress: toolPolicyRegistryConfig.contractAddress,
            }
          : undefined
      );

      await this.litAgent.init();
      logger.success('Successfully initialized Lit Agent');
    } catch (error) {
      if (error instanceof LitAgentError) {
        switch (error.type) {
          case LitAgentErrorType.INSUFFICIENT_BALANCE: {
            const authWallet = storage.getWallet();
            if (!authWallet) throw error;

            logger.error(
              'Your Auth Wallet does not have enough Lit test tokens to mint the Agent Wallet.'
            );
            logger.info(
              `Please send Lit test tokens to your Auth Wallet: ${authWallet.address} before continuing.`
            );
            logger.log(
              'You can get test tokens from the following faucet: https://chronicle-yellowstone-faucet.getlit.dev/'
            );
            process.exit(1);
            break;
          }
          case LitAgentErrorType.WALLET_CREATION_FAILED: {
            logger.error(`Failed to create agent wallet: ${error.message}`);
            process.exit(1);
            break;
          }
          default: {
            logger.error(`Failed to initialize Lit Agent: ${error.message}`);
            process.exit(1);
            break;
          }
        }
      }
      logger.error(
        `Unexpected error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      process.exit(1);
    }
  }

  private async startInteractiveMode() {
    if (!this.litAgent) {
      throw new Error('LitAgent not initialized');
    }

    while (true) {
      try {
        const userIntent = await promptForUserIntent();
        if (!userIntent) {
          break;
        }

        const result = await this.litAgent.analyzeUserIntentAndMatchAction(
          userIntent
        );

        if (!result.matchedTool) {
          logger.error(
            'No matching tool found. Please try rephrasing your request.'
          );
          continue;
        }

        logger.info('Executing tool...');
        const executionResult = await this.litAgent.executeTool(
          result.matchedTool.ipfsCid,
          result.params.foundParams,
          {
            permissionCallback: async (tool: ToolInfo) => {
              const shouldPermit = await promptForToolPermission(tool);
              if (!shouldPermit) {
                logger.info('Operation cancelled by user');
              }
              return shouldPermit;
            },
            parameterCallback: async (
              tool: ToolInfo,
              missingParams: string[]
            ) => {
              const allParams = await collectMissingParams(tool, {
                foundParams: result.params.foundParams,
                missingParams,
              });
              return allParams;
            },
            setNewToolPolicyCallback: async (
              tool: ToolInfo,
              currentPolicy: any
            ) => {
              const handlePolicySetup = async (
                tool: ToolInfo,
                currentPolicy: any | null
              ): Promise<{ usePolicy: boolean; policyValues?: any }> => {
                const { usePolicy, policyValues } = await promptForToolPolicy(
                  tool,
                  currentPolicy
                );
                if (!usePolicy) {
                  const { proceedWithoutPolicy } = await inquirer.prompt([
                    {
                      type: 'confirm',
                      name: 'proceedWithoutPolicy',
                      message:
                        'Would you like to proceed without a policy? This means there will be no restrictions on tool usage.',
                      default: false,
                    },
                  ]);
                  if (proceedWithoutPolicy) {
                    return { usePolicy: false };
                  }
                  // If they don't want to proceed without a policy, try again
                  return handlePolicySetup(tool, currentPolicy);
                }
                return { usePolicy: true, policyValues };
              };
              const result = await handlePolicySetup(tool, currentPolicy);
              if (result.usePolicy && result.policyValues) {
                logger.info('Registering policy on chain...');
              }
              return result;
            },
            onPolicyRegistered: (txHash: string) => {
              logger.success(
                `Policy successfully registered! Transaction hash: ${txHash}`
              );
            },
          }
        );

        if (!executionResult.success) {
          if (executionResult.reason) {
            logger.error(`Tool execution failed: ${executionResult.reason}`);
          }
          continue;
        }

        logger.success('Tool execution completed');
        logger.log(
          `Result: ${JSON.stringify(executionResult.result, null, 2)}`
        );
      } catch (error) {
        if (error instanceof LitAgentError) {
          const litError = error as LitAgentErrorWithType;
          switch (litError.type) {
            case LitAgentErrorType.TOOL_EXECUTION_FAILED:
              logger.error(`Tool execution failed: ${litError.message}`);
              break;
            case LitAgentErrorType.INVALID_PARAMETERS:
              logger.error(`Invalid parameters: ${litError.message}`);
              break;
            case LitAgentErrorType.TOOL_VALIDATION_FAILED:
              logger.error(`Policy validation failed: ${litError.message}`);
              break;
            case LitAgentErrorType.TOOL_POLICY_REGISTRATION_FAILED:
              logger.error(`Failed to set tool policy: ${litError.message}`);
              if (litError.details?.originalError instanceof Error) {
                logger.error(
                  `Reason: ${litError.details.originalError.message}`
                );
              }
              break;
            default:
              logger.error(`Operation failed: ${litError.message}`);
          }
        } else {
          logger.error(
            `Unexpected error: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        continue;
      }
    }
  }
}