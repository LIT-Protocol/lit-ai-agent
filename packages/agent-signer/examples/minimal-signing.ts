import { LitClient } from '../dist/index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const client = await LitClient.create(process.env.LIT_AUTH_KEY!);

  const { pkp } = await client.createWallet();
  console.log('✓ Wallet created:', pkp);

  const signedTxn = await client.sign({
    toSign:
      '0x8111e78458fec7fb123fdfe3c559a1f7ae33bf21bf81d1bad589e9422c648cbd',
  });
  console.log('✓ Transaction signed:', signedTxn);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
