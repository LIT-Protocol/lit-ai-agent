import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

interface IpfsArtifact {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate: boolean;
  Duration: number;
}

interface IpfsArtifacts {
  swapUniswapLitAction: IpfsArtifact;
}

// Default development CID - this will be used if ipfs.json doesn't exist
const DEV_IPFS_CID = 'QmQwNvbP9YAY4B4wYgFoD6cNnX3udNDBjWC7RqN48GdpmN';

// Try to read the artifacts from the build output
let IPFS_CID = DEV_IPFS_CID;
try {
  const artifactsPath = join(__dirname, '../../../dist/ipfs.json');
  if (existsSync(artifactsPath)) {
    const artifacts: IpfsArtifacts = JSON.parse(
      readFileSync(artifactsPath, 'utf-8')
    );
    IPFS_CID = artifacts.swapUniswapLitAction.IpfsHash;
  } else {
    console.warn(
      'ipfs.json not found. Using development CID. Please run deploy script to update.'
    );
  }
} catch (error) {
  console.warn(
    'Failed to read ipfs.json. Using development CID:',
    error instanceof Error ? error.message : String(error)
  );
}

export { IPFS_CID };
