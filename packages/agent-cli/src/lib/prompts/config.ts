import inquirer from 'inquirer';
import { createPromptModule } from 'inquirer';
import { storage, ChainConfig } from '../utils/storage.js';

// Create a new prompt module with registered prompts
const prompt = createPromptModule();

const OPENAI_KEY_STORAGE_KEY = 'openai_api_key';

export async function promptForOpenAIKey(): Promise<string> {
  // Check if key exists in storage
  const existingKey = storage.getItem(OPENAI_KEY_STORAGE_KEY);
  if (existingKey) {
    return existingKey;
  }

  // Prompt user for key
  const { apiKey } = await prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Please enter your OpenAI API key:',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'API key is required';
        }
        if (!input.startsWith('sk-')) {
          return 'Invalid API key format. Should start with "sk-"';
        }
        return true;
      },
    },
  ]);

  // Store the key
  storage.setItem(OPENAI_KEY_STORAGE_KEY, apiKey);
  return apiKey;
}

export async function promptForChainConfig(): Promise<ChainConfig> {
  const chains = storage.getStoredChains();
  const lastUsedChain = storage.getLastUsedChain();

  const { chainChoice } = await prompt([
    {
      type: 'list',
      name: 'chainChoice',
      message: 'Select the chain to use:',
      choices: [
        ...(lastUsedChain ? [`Last Used (${lastUsedChain})`] : []),
        ...Object.keys(chains),
        new inquirer.Separator(),
        'Add New Chain',
      ],
      default: lastUsedChain ? `Last Used (${lastUsedChain})` : undefined,
    },
  ]);

  if (chainChoice === 'Add New Chain') {
    const nameResponse = await prompt<{ name: string }>([
      {
        type: 'input',
        name: 'name',
        message: 'Enter a name for this chain:',
        validate: (input: string) =>
          input.length > 0 || 'Chain name is required',
      },
    ]);

    const rpcResponse = await prompt<{ rpcUrl: string }>([
      {
        type: 'input',
        name: 'rpcUrl',
        message: 'Enter the RPC URL:',
        validate: (input: string) => input.length > 0 || 'RPC URL is required',
      },
    ]);

    const chainIdResponse = await prompt<{ chainId: string }>([
      {
        type: 'input',
        name: 'chainId',
        message: 'Enter the chain ID:',
        validate: (input: string) => {
          const num = Number(input);
          return !isNaN(num) || 'Chain ID must be a number';
        },
      },
    ]);

    const config: ChainConfig = {
      rpcUrl: rpcResponse.rpcUrl,
      chainId: Number(chainIdResponse.chainId),
    };
    storage.saveChainConfig(nameResponse.name, config);
    storage.saveLastUsedChain(nameResponse.name);
    return config;
  }

  const chainName = chainChoice.startsWith('Last Used (')
    ? chainChoice.slice(11, -1)
    : chainChoice;

  storage.saveLastUsedChain(chainName);
  return chains[chainName];
}
