const { join } = require('path');
const fs = require('fs/promises');
const fetch = require('node-fetch');
const dotenvx = require('@dotenvx/dotenvx');

// Load environment variables
dotenvx.config();

const rootDir = join(__dirname, '../..');

async function uploadToPinata(pinataJwt, data) {
  // Create boundary for multipart form data
  const boundary =
    '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  // Create form data manually
  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="litAction.js"',
    'Content-Type: text/plain',
    '',
    data,
    `--${boundary}`,
    'Content-Disposition: form-data; name="pinataMetadata"',
    '',
    JSON.stringify({ name: 'Swap Uniswap Lit Action' }),
    `--${boundary}`,
    'Content-Disposition: form-data; name="pinataOptions"',
    '',
    JSON.stringify({ cidVersion: 0 }),
    `--${boundary}--`,
  ].join('\r\n');

  const response = await fetch(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} - ${text}`);
  }

  return response.json();
}

async function updateIpfsMetadata(newMetadata) {
  try {
    // Ensure dist directory exists
    await fs.mkdir(join(rootDir, 'dist'), { recursive: true });

    let metadata = {};
    const ipfsPath = join(rootDir, 'dist', 'ipfs.json');

    try {
      const content = await fs.readFile(ipfsPath, 'utf-8');
      metadata = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty object
    }

    metadata['swapUniswapLitAction'] = newMetadata;
    await fs.writeFile(ipfsPath, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Failed to update ipfs.json:', error);
    throw error;
  }
}

async function main() {
  const PINATA_JWT = process.env.PINATA_JWT;

  if (!PINATA_JWT) {
    console.error('Missing PINATA_JWT environment variable');
    process.exit(1);
  }

  try {
    // Read the action string
    const litActionPath = join(rootDir, 'dist', 'deployed-lit-action.js');
    console.log('Reading from:', litActionPath);
    const actionString = await fs.readFile(litActionPath, 'utf-8');

    // Verify the content looks correct
    if (!actionString.startsWith('(async () =>')) {
      console.error(
        'Generated code appears malformed:',
        actionString.substring(0, 100)
      );
      throw new Error('Generated code is not in the expected format');
    }

    const startTime = Date.now();
    const pinataResponse = await uploadToPinata(PINATA_JWT, actionString);
    const duration = (Date.now() - startTime) / 1000;

    // Create metadata
    const metadata = {
      IpfsHash: pinataResponse.IpfsHash,
      PinSize: pinataResponse.PinSize,
      Timestamp: new Date().toISOString(),
      isDuplicate: pinataResponse.isDuplicate || false,
      Duration: duration,
    };

    await updateIpfsMetadata(metadata);
    console.log('Deployment successful:', metadata);
    process.exit(0);
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

main();
