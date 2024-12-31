import { AgentSigner } from '@lit-protocol/fss-signer';
import type { ToolInfo } from '@lit-protocol/fss-tool-registry';
import {
  getToolFromRegistry,
  validateParamsAgainstPolicy,
} from '@lit-protocol/fss-tool-registry';
import { OpenAI } from 'openai';
import { ethers } from 'ethers';

import { LitAgentError, LitAgentErrorType } from './errors';
import {
  findTool,
  executeAction,
  analyzeUserIntent,
  parseToolParameters,
} from './utils/tool';
import { handleToolPermission, checkToolPermission } from './utils/permission';
import { initializeSigner } from './utils/wallet';
import { validateAndCollectParameters } from './utils/parameters';

export { LitAgentError, LitAgentErrorType } from './errors';

export class LitAgent {
  private signer!: AgentSigner;
  private openai: OpenAI;
  private openAiModel: string;

  constructor(
    private readonly litAuthPrivateKey: string,
    openAiApiKey: string,
    openAiModel = 'gpt-4o-mini',
    private readonly toolPolicyRegistryConfig?: {
      rpcUrl?: string;
      contractAddress: string;
    }
  ) {
    this.openai = new OpenAI({ apiKey: openAiApiKey });
    this.openAiModel = openAiModel;
  }

  /**
   * Get the auth private key used to initialize this agent
   */
  public getAuthPrivateKey(): string {
    return this.litAuthPrivateKey;
  }

  /**
   * Get the Lit token balance of the PKP wallet
   */
  public async getLitTokenBalance(): Promise<ethers.BigNumber> {
    return await this.signer.getLitTokenBalance();
  }

  public async init(): Promise<void> {
    this.signer = await initializeSigner(this.litAuthPrivateKey, {
      rpcUrl:
        this.toolPolicyRegistryConfig?.rpcUrl ??
        'https://yellowstone-rpc.litprotocol.com/',
      contractAddress:
        this.toolPolicyRegistryConfig?.contractAddress ??
        '0xD78e1C1183A29794A092dDA7dB526A91FdE36020',
    });
  }

  public async executeTool(
    ipfsCid: string,
    initialParams: Record<string, string>,
    options: {
      permissionCallback?: (tool: ToolInfo) => Promise<boolean>;
      parameterCallback?: (
        tool: ToolInfo,
        missingParams: string[]
      ) => Promise<Record<string, string>>;
      setNewToolPolicyCallback?: (
        tool: ToolInfo,
        currentPolicy: any | null
      ) => Promise<{ usePolicy: boolean; policyValues?: any }>;
      failedPolicyCallback?: (
        tool: ToolInfo,
        params: Record<string, string>,
        policy: any,
        error: Error
      ) => Promise<Record<string, string> | null>;
      onPolicyRegistered?: (txHash: string) => void;
    } = {}
  ): Promise<{
    success: boolean;
    result?: any;
    reason?: string;
    policyRegistration?: { success: boolean; txHash: string };
  }> {
    try {
      // Find and validate tool
      const tool = await findTool(ipfsCid);

      // Handle permissions
      let policyRegistration;
      try {
        const { success, txHash } = await handleToolPermission(
          this.signer,
          tool,
          options.permissionCallback,
          options.setNewToolPolicyCallback
        );
        if (success && txHash) {
          policyRegistration = { success: true, txHash };
          if (options.onPolicyRegistered) {
            options.onPolicyRegistered(txHash);
          }
        }
      } catch (error) {
        if (
          error instanceof LitAgentError &&
          error.type === LitAgentErrorType.TOOL_PERMISSION_FAILED &&
          error.message === 'Permission denied by user'
        ) {
          return {
            success: false,
            reason: error.message,
          };
        }
        // For policy registration errors, log and continue
        if (
          error instanceof LitAgentError &&
          error.type === LitAgentErrorType.TOOL_POLICY_REGISTRATION_FAILED
        ) {
          console.error('Failed to register policy:', error);
          // Continue without policy
        } else {
          throw error;
        }
      }

      // Validate and collect parameters
      const finalParams = await validateAndCollectParameters(
        tool,
        initialParams,
        options.parameterCallback
      );

      // Get current policy from registry
      let decodedPolicy = null;
      try {
        const currentPolicy = await this.signer.getToolPolicy(ipfsCid);
        if (currentPolicy.policy !== '0x' && currentPolicy.version !== '') {
          const registryTool = getToolFromRegistry(tool.name);
          decodedPolicy = registryTool.Policy.decode(
            currentPolicy.policy,
            currentPolicy.version
          );
        }
      } catch (error) {
        // If policy registry is not initialized or there's no policy, continue without it
        if (
          !(
            error instanceof Error &&
            error.message === 'Tool policy manager not initialized'
          )
        ) {
          throw error;
        }
      }

      // If we have a policy, validate parameters against it
      let validatedParams = finalParams;
      if (decodedPolicy) {
        try {
          await validateParamsAgainstPolicy(
            tool,
            validatedParams,
            decodedPolicy,
            this.signer.provider
          );
        } catch (error) {
          // If we have a failedPolicyCallback, try to get new parameters
          if (options.failedPolicyCallback && error instanceof Error) {
            const newParams = await options.failedPolicyCallback(
              tool,
              validatedParams,
              decodedPolicy,
              error
            );

            // If new parameters provided, validate them again
            if (newParams) {
              validatedParams = newParams;
              await validateParamsAgainstPolicy(
                tool,
                validatedParams,
                decodedPolicy,
                this.signer.provider
              );
            } else {
              // If no new parameters provided, throw the original error
              throw new LitAgentError(
                LitAgentErrorType.TOOL_VALIDATION_FAILED,
                error.message,
                { tool, policy: decodedPolicy, originalError: error }
              );
            }
          } else {
            throw new LitAgentError(
              LitAgentErrorType.TOOL_VALIDATION_FAILED,
              error instanceof Error
                ? error.message
                : 'Parameters do not meet policy requirements',
              { tool, policy: decodedPolicy, originalError: error }
            );
          }
        }
      }

      // Execute the tool with validated parameters
      const result = await executeAction(this.signer, ipfsCid, validatedParams);

      // Check for Lit Action errors in the response
      if (result.response) {
        try {
          const response = JSON.parse(result.response);
          if (response.status === 'error') {
            // Format error message with details if available
            let errorMessage = response.error;
            if (response.details) {
              // Add relevant details to the error message
              if (response.details.reason) {
                errorMessage += `\nReason: ${response.details.reason}`;
              }
              if (response.details.code) {
                errorMessage += `\nCode: ${response.details.code}`;
              }
              if (response.details.error?.message) {
                errorMessage += `\nDetails: ${response.details.error.message}`;
              }
            }

            return {
              success: false,
              reason: errorMessage,
              result,
            };
          }
        } catch {
          // If response is not JSON, continue with original result
        }
      }

      // Check for errors in logs
      if (result.logs && result.logs.includes('Error:')) {
        const errorMatch = result.logs.match(/Error:([^\n]+)/);
        if (errorMatch) {
          return {
            success: false,
            reason: `Lit Action error: ${errorMatch[1].trim()}`,
            result,
          };
        }
      }

      return {
        success: true,
        result,
        policyRegistration,
      };
    } catch (error) {
      if (error instanceof LitAgentError) {
        return {
          success: false,
          reason: error.message,
        };
      }
      if (error instanceof Error) {
        const litError = error as Error & { type?: string; details?: unknown };
        return {
          success: false,
          reason: `Failed to execute tool: ${litError.message}${
            litError.type ? ` (${litError.type})` : ''
          }`,
        };
      }
      return {
        success: false,
        reason: 'Failed to execute tool: Unknown error',
      };
    }
  }

  public async analyzeUserIntentAndMatchAction(userIntent: string) {
    const { analysis, matchedTool } = await analyzeUserIntent(
      this.openai,
      this.openAiModel,
      userIntent
    );

    const isPermitted = matchedTool
      ? await checkToolPermission(this.signer, matchedTool)
      : false;

    const params = matchedTool
      ? await parseToolParameters(
          this.openai,
          this.openAiModel,
          userIntent,
          matchedTool
        )
      : { foundParams: {}, missingParams: [] };

    return { analysis, matchedTool, isPermitted, params };
  }
}
