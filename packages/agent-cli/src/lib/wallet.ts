import { inquirer } from './prompts/setup';
import { ethers } from 'ethers';
import { storage } from './utils/storage';
import { logger } from './utils/logger';

async function promptForPrivateKey(): Promise<string> {
  const { privateKey } = await inquirer.prompt<{ privateKey: string }>([
    {
      type: 'password',
      name: 'privateKey',
      message: 'Enter your private key (will be hidden):',
      validate: (input: string) => {
        try {
          if (!input.startsWith('0x')) {
            input = '0x' + input;
          }
          new ethers.Wallet(input);
          return true;
        } catch (e) {
          return 'Please enter a valid private key';
        }
      },
    },
  ]);
  return privateKey;
}

async function promptForWalletChoice(): Promise<'generate' | 'provide'> {
  const { choice } = await inquirer.prompt<{ choice: 'generate' | 'provide' }>([
    {
      type: 'list',
      name: 'choice',
      message: 'How would you like to proceed?',
      choices: [
        { name: 'Generate new wallet', value: 'generate' },
        { name: 'Provide existing private key', value: 'provide' },
      ],
    },
  ]);
  return choice;
}

export async function getAuthPrivateKey(): Promise<string> {
  const existingWallet = storage.getWallet();

  if (existingWallet) {
    logger.info(`Using existing wallet: ${existingWallet.address}`);
    return existingWallet.privateKey;
  }

  logger.log('\nWallet Initialization');
  logger.log('--------------------');
  logger.info(
    'You need a private key with Lit test tokens to mint the agent wallet.'
  );
  logger.log(
    'You can either generate a new wallet or provide an existing private key.'
  );

  const choice = await promptForWalletChoice();
  let privateKey: string;
  let address: string;

  if (choice === 'provide') {
    privateKey = await promptForPrivateKey();
    const wallet = new ethers.Wallet(privateKey);
    address = wallet.address;
  } else {
    const wallet = ethers.Wallet.createRandom();
    privateKey = wallet.privateKey;
    address = wallet.address;

    logger.success('New wallet generated!');
    logger.info(`Address: ${address}`);
    logger.warn(
      'IMPORTANT: Please save this private key somewhere safe. You will need it to get test tokens.'
    );
    logger.warn(
      'Please send Lit test tokens to this address before continuing.'
    );
    logger.log(
      'You can get test tokens from: https://chronicle-yellowstone-faucet.getlit.dev/'
    );

    const { ready } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ready',
        message:
          'Have you saved the private key and funded the wallet with test tokens?',
        default: false,
      },
    ]);

    if (!ready) {
      logger.error(
        'Please save the private key and fund the wallet before proceeding.'
      );
      process.exit(1);
    }
  }

  // Store the wallet information
  storage.setWallet({
    privateKey,
    address,
  });

  return privateKey;
}
