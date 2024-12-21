import {
  describe,
  expect,
  it,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { LitClient } from '../index';
import { ethers } from 'ethers';
import {
  LIT_RPC,
  AUTH_METHOD_SCOPE,
  LIT_NETWORK,
} from '@lit-protocol/constants';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { getSessionSigs } from '../utils';
import { localStorage } from '../index';
import { SessionSigsMap, MintWithAuthResponse } from '@lit-protocol/types';
import { LitResourceAbilityRequest } from '@lit-protocol/auth-helpers';

interface PKP {
  tokenId: string;
  publicKey: string;
  ethAddress: string;
}

interface WalletInfo {
  pkp: PKP;
  tx: ethers.ContractTransaction;
  tokenId: string;
  res: MintWithAuthResponse<ethers.ContractReceipt>;
}

interface NodeSignature {
  sig: string;
  derivedVia: string;
  signedMessage: string;
  address: string;
  algo: string;
}

interface Capability {
  sig: string;
  derivedVia: string;
  signedMessage: string;
  address: string;
}

interface SignedMessageContent {
  capabilities: Capability[];
  sessionKey: string;
  resourceAbilityRequests: LitResourceAbilityRequest[];
  issuedAt: string;
  expiration: string;
}

describe('LitClient Integration Tests', () => {
  beforeAll(() => {
    // Clear all storage before any tests run
    if (existsSync('./lit-session-storage')) {
      rmSync('./lit-session-storage', { recursive: true, force: true });
    }
    mkdirSync('./lit-session-storage');
    // Initialize empty files
    writeFileSync('./lit-session-storage/pkp', '');
    writeFileSync('./lit-session-storage/capacityCreditId', '');
  });

  afterAll(() => {
    // Clean up after all tests
    if (existsSync('./lit-session-storage')) {
      rmSync('./lit-session-storage', { recursive: true, force: true });
    }
  });

  describe('DatilDev Network', () => {
    let litClient: LitClient;

    beforeAll(async () => {
      if (!process.env.LIT_AUTH_PRIVATE_KEY) {
        throw new Error(
          'LIT_AUTH_PRIVATE_KEY environment variable is required'
        );
      }

      litClient = await LitClient.create(process.env.LIT_AUTH_PRIVATE_KEY, {
        litNetwork: LIT_NETWORK.DatilDev,
      });

      await new Promise((resolve) => {
        const checkReady = () => {
          try {
            if (litClient.isReady()) resolve(true);
            else setTimeout(checkReady, 500);
          } catch (e) {
            console.log('error', e);
            setTimeout(checkReady, 500);
          }
        };
        checkReady();
      });
    }, 30000);

    afterAll(async () => {
      await litClient?.disconnect();
    });

    // All tests for DatilDev
    describe('Basic Operations', () => {
      it('should confirm client is ready', () => {
        const ready = litClient.isReady();
        expect(ready).toBe(true);
      });

      it('should execute JavaScript code', async () => {
        const result = await litClient.executeJs({
          code: `(async () => { Lit.Actions.setResponse({"response": "Hello from Lit Protocol!" }); })()`,
          jsParams: {},
        });
        expect(result).toHaveProperty('response');
        expect(result.response).toBe('Hello from Lit Protocol!');
      }, 10000);

      it('should execute JavaScript code from IPFS', async () => {
        // First create a wallet to get a public key
        const walletInfo = await litClient.createWallet();
        expect(walletInfo.pkp).toBeDefined();

        const result = await litClient.executeJs({
          ipfsId: 'QmQwNvbP9YAY4B4wYgFoD6cNnX3udNDBjWC7RqN48GdpmN',
          jsParams: {
            publicKey: walletInfo.pkp.publicKey,
          },
        });
        expect(result).toHaveProperty('response');
        expect(result.response).toBeDefined();
      }, 30000);
    });

    describe('Wallet Operations', () => {
      it('should create a wallet and sign a message', async () => {
        const walletInfo: WalletInfo = await litClient.createWallet();
        expect(walletInfo.pkp).toBeDefined();

        const messageToSign =
          '0x8111e78458fec7fb123fdfe3c559a1f7ae33bf21bf81d1bad589e9422c648cbd';
        const signResult = await litClient.sign({ toSign: messageToSign });
        expect(signResult.signature).toBeDefined();
      }, 30000);
    });

    describe('PKP Actions', () => {
      it('should add and verify a permitted action', async () => {
        const walletInfo: WalletInfo = await litClient.createWallet();
        const provider = new ethers.providers.JsonRpcProvider(
          LIT_RPC.CHRONICLE_YELLOWSTONE
        );
        await provider.waitForTransaction(walletInfo.tx.hash, 2);

        const ipfsId = 'QmTestHash123';
        const addResult = await litClient.addPermittedAction({
          ipfsId,
          scopes: [AUTH_METHOD_SCOPE.SignAnything],
        });
        await provider.waitForTransaction(addResult.transactionHash, 2);

        const isPermitted =
          await litClient.litContracts?.pkpPermissionsContractUtils.read.isPermittedAction(
            walletInfo.pkp.tokenId,
            ipfsId
          );
        expect(isPermitted).toBe(true);
      }, 60000);
    });

    describe('Capacity Credits', () => {
      beforeEach(() => {
        // Create directory if it doesn't exist
        if (!existsSync('./lit-session-storage')) {
          mkdirSync('./lit-session-storage');
        }
        // Clear all storage including lit-session-storage
        localStorage.clear();
        rmSync('./lit-session-storage', { recursive: true, force: true });
        mkdirSync('./lit-session-storage');
      });

      it('should not mint capacity credits on dev network', async () => {
        const walletInfo: WalletInfo = await litClient.createWallet();
        expect(walletInfo.pkp).toBeDefined();
        console.log('DatilDev Network:', litClient.getNetwork());
        const capacityCreditId = litClient.getCapacityCreditId();
        console.log('DatilDev Capacity Credit ID:', capacityCreditId);
        expect(litClient.getNetwork()).toBe(LIT_NETWORK.DatilDev);
        expect(capacityCreditId).toBeNull();
        expect(localStorage.getItem('capacityCreditId')).toBeNull();
      }, 30000);
    });
  });

  describe('DatilTest Network', () => {
    let litClient: LitClient;

    beforeAll(async () => {
      if (!process.env.LIT_AUTH_PRIVATE_KEY) {
        throw new Error(
          'LIT_AUTH_PRIVATE_KEY environment variable is required'
        );
      }

      litClient = await LitClient.create(process.env.LIT_AUTH_PRIVATE_KEY, {
        litNetwork: LIT_NETWORK.DatilTest,
      });

      await new Promise((resolve) => {
        const checkReady = () => {
          try {
            if (litClient.isReady()) resolve(true);
            else setTimeout(checkReady, 500);
          } catch (e) {
            console.log('error', e);
            setTimeout(checkReady, 500);
          }
        };
        checkReady();
      });
    }, 30000);

    afterAll(async () => {
      await litClient?.disconnect();
    });

    describe('Basic Operations', () => {
      it('should confirm client is ready', () => {
        const ready = litClient.isReady();
        expect(ready).toBe(true);
      });

      it('should execute JavaScript code', async () => {
        const result = await litClient.executeJs({
          code: `(async () => { Lit.Actions.setResponse({"response": "Hello from Lit Protocol!" }); })()`,
          jsParams: {},
        });
        expect(result).toHaveProperty('response');
        expect(result.response).toBe('Hello from Lit Protocol!');
      }, 10000);

      it('should execute JavaScript code from IPFS', async () => {
        // First create a wallet to get a public key
        const walletInfo = await litClient.createWallet();
        expect(walletInfo.pkp).toBeDefined();

        const result = await litClient.executeJs({
          ipfsId: 'QmQwNvbP9YAY4B4wYgFoD6cNnX3udNDBjWC7RqN48GdpmN',
          jsParams: {
            publicKey: walletInfo.pkp.publicKey,
          },
        });
        expect(result).toHaveProperty('response');
        expect(result.response).toBeDefined();
      }, 30000);
    });

    describe('Wallet Operations', () => {
      it('should create a wallet and sign a message', async () => {
        const walletInfo: WalletInfo = await litClient.createWallet();
        expect(walletInfo.pkp).toBeDefined();

        const messageToSign =
          '0x8111e78458fec7fb123fdfe3c559a1f7ae33bf21bf81d1bad589e9422c648cbd';
        const signResult = await litClient.sign({ toSign: messageToSign });
        expect(signResult.signature).toBeDefined();
      }, 30000);
    });

    describe('PKP Actions', () => {
      it('should add and verify a permitted action', async () => {
        const walletInfo: WalletInfo = await litClient.createWallet();
        const provider = new ethers.providers.JsonRpcProvider(
          LIT_RPC.CHRONICLE_YELLOWSTONE
        );
        await provider.waitForTransaction(walletInfo.tx.hash, 2);

        const ipfsId = 'QmTestHash123';
        const addResult = await litClient.addPermittedAction({
          ipfsId,
          scopes: [AUTH_METHOD_SCOPE.SignAnything],
        });
        await provider.waitForTransaction(addResult.transactionHash, 2);

        const isPermitted =
          await litClient.litContracts?.pkpPermissionsContractUtils.read.isPermittedAction(
            walletInfo.pkp.tokenId,
            ipfsId
          );
        expect(isPermitted).toBe(true);
      }, 60000);
    });

    describe('Capacity Credits', () => {
      beforeEach(() => {
        // Create directory if it doesn't exist
        if (!existsSync('./lit-session-storage')) {
          mkdirSync('./lit-session-storage');
        }
        // Clear all storage including lit-session-storage
        localStorage.clear();
        rmSync('./lit-session-storage', { recursive: true, force: true });
        mkdirSync('./lit-session-storage');
      });

      it('should mint and store capacity credits', async () => {
        await litClient.createWallet();
        const capacityCreditId = litClient.getCapacityCreditId();
        expect(capacityCreditId).toBeDefined();
        expect(typeof capacityCreditId).toBe('string');
        expect(localStorage.getItem('capacityCreditId')).toBe(capacityCreditId);
      }, 60000);

      it('should load capacity credit ID from storage on client creation', async () => {
        const mockId = '12345';
        localStorage.setItem('capacityCreditId', mockId);

        const newClient = await LitClient.create(
          process.env.LIT_AUTH_PRIVATE_KEY!,
          {
            litNetwork: LIT_NETWORK.DatilTest,
          }
        );

        expect(newClient.getCapacityCreditId()).toBe(mockId);
        await newClient.disconnect();
      }, 30000);

      it('should use capacity credits in session signatures', async () => {
        await litClient.createWallet();
        const capacityCreditId = litClient.getCapacityCreditId();
        console.log('DatilTest Network:', litClient.getNetwork());
        console.log('DatilTest Capacity Credit ID:', capacityCreditId);
        expect(litClient.getNetwork()).toBe(LIT_NETWORK.DatilTest);
        expect(capacityCreditId).toBeDefined();

        const sessionSigs: SessionSigsMap = await getSessionSigs(litClient);
        console.log(
          'DatilTest Session Sigs:',
          JSON.stringify(sessionSigs, null, 2)
        );
        expect(sessionSigs).toBeDefined();

        // Check for capacity delegation in the capabilities
        const anyNode = Object.values(sessionSigs)[0] as NodeSignature;
        expect(anyNode).toBeDefined();
        const parsedMessage = JSON.parse(
          anyNode.signedMessage
        ) as SignedMessageContent;
        const capabilities = parsedMessage.capabilities;
        expect(capabilities).toBeDefined();

        // Find the capacity delegation capability
        const capacityDelegation = capabilities.find((cap: Capability) =>
          cap.signedMessage.includes(
            `lit-ratelimitincrease://${capacityCreditId}`
          )
        );
        expect(capacityDelegation).toBeDefined();
        expect(capacityDelegation?.derivedVia).toBe('web3.eth.personal.sign');
      }, 60000);
    });
  });
});
