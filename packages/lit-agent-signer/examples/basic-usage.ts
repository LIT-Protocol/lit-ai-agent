import { LitClient } from '../dist/index';
import * as dotenv from 'dotenv';
import { LIT_NETWORK } from '@lit-protocol/constants';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Initialize the client with your private key
    const authKey = process.env.LIT_AUTH_PRIVATE_KEY;
    if (!authKey) {
      throw new Error('LIT_AUTH_PRIVATE_KEY environment variable is required');
    }

    console.log('🚀 Initializing Lit client...');
    const client = await LitClient.create(authKey, {
      litNetwork: LIT_NETWORK.DatilTest,
    });

    // Check if client is ready
    console.log('✓ Client initialized, checking if ready...');
    console.log('Client ready:', client.isReady());

    // Create a new wallet if one doesn't exist
    let pkp = client.getPkp();
    if (!pkp) {
      console.log('Creating new wallet...');
      const mintInfo = await client.createWallet();
      console.log('✓ Wallet created:', mintInfo);
      pkp = client.getPkp();
    } else {
      console.log('✓ Using existing wallet');
    }

    // Sign a message.  This must be 32 bytes hex, like an eth txn for example
    console.log('Signing message...');
    const messageToSign =
      '0x8111e78458fec7fb123fdfe3c559a1f7ae33bf21bf81d1bad589e9422c648cbd';
    const signedMessage = await client.sign({
      toSign: messageToSign,
    });
    console.log('✓ Message signed:', signedMessage);

    // Execute some JS code
    console.log('Executing JS code...');
    const result = await client.executeJs({
      code: `
          Lit.Actions.setResponse({ response: message + " - processed by Lit Protocol" });
      `,
      jsParams: {
        message: 'Hello',
      },
    });
    console.log('✓ JS execution result:', result);

    // Cleanup
    await client.disconnect();
    console.log('✓ Client disconnected');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
