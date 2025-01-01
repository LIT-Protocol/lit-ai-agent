import {
  SigningSimpleLitActionSchema,
  SigningSimpleLitActionParameters,
  SigningSimpleLitActionMetadata,
  isValidSigningSimpleParameters,
} from './agent-tool';

describe('SigningSimpleLitAction', () => {
  const validParams: SigningSimpleLitActionParameters = {
    message: 'Hello, World!',
    chainId: '84532',
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
  };

  describe('SigningSimpleLitActionSchema', () => {
    it('should validate correct parameters', () => {
      const result = SigningSimpleLitActionSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    describe('message validation', () => {
      it('should reject empty messages', () => {
        const invalidMessages = [
          '', // empty string
          '   ', // only whitespace
        ];

        invalidMessages.forEach((message) => {
          const result = SigningSimpleLitActionSchema.safeParse({
            ...validParams,
            message,
          });
          expect(result.success).toBe(false);
        });
      });

      it('should accept valid messages', () => {
        const validMessages = [
          'Hello',
          'Message with spaces',
          '123',
          'Special chars: !@#$%',
        ];

        validMessages.forEach((message) => {
          const result = SigningSimpleLitActionSchema.safeParse({
            ...validParams,
            message,
          });
          expect(result.success).toBe(true);
        });
      });
    });

    describe('chainId validation', () => {
      it('should reject invalid chain IDs', () => {
        const invalidChainIds = [
          '', // empty string
          '   ', // only whitespace
        ];

        invalidChainIds.forEach((chainId) => {
          const result = SigningSimpleLitActionSchema.safeParse({
            ...validParams,
            chainId,
          });
          expect(result.success).toBe(false);
        });
      });

      it('should accept valid chain IDs', () => {
        const validChainIds = [
          '1', // Ethereum mainnet
          '84532', // Base Sepolia
          '8453', // Base mainnet
        ];

        validChainIds.forEach((chainId) => {
          const result = SigningSimpleLitActionSchema.safeParse({
            ...validParams,
            chainId,
          });
          expect(result.success).toBe(true);
        });
      });
    });

    describe('rpcUrl validation', () => {
      it('should reject invalid URLs', () => {
        const invalidUrls = [
          '', // empty string
          'not-a-url',
          'ftp://invalid-protocol.com',
          'http:/missing-slash.com',
        ];

        invalidUrls.forEach((rpcUrl) => {
          const result = SigningSimpleLitActionSchema.safeParse({
            ...validParams,
            rpcUrl,
          });
          expect(result.success).toBe(false);
        });
      });

      it('should accept valid URLs', () => {
        const validUrls = [
          'https://base-sepolia-rpc.publicnode.com',
          'https://mainnet.base.org',
          'http://localhost:8545',
        ];

        validUrls.forEach((rpcUrl) => {
          const result = SigningSimpleLitActionSchema.safeParse({
            ...validParams,
            rpcUrl,
          });
          expect(result.success).toBe(true);
        });
      });
    });
  });

  describe('isValidSigningSimpleParameters', () => {
    it('should return true for valid parameters', () => {
      expect(isValidSigningSimpleParameters(validParams)).toBe(true);
    });

    it('should return false for invalid parameters', () => {
      const invalidParams = [
        {
          ...validParams,
          message: '', // empty message
        },
        {
          ...validParams,
          rpcUrl: 'not-a-url', // invalid URL
        },
        {
          message: validParams.message,
          // missing parameters
        },
        null,
        undefined,
        'not an object',
        [],
      ];

      invalidParams.forEach((params) => {
        expect(isValidSigningSimpleParameters(params)).toBe(false);
      });
    });
  });

  describe('SigningSimpleLitActionMetadata', () => {
    it('should have the correct structure', () => {
      expect(SigningSimpleLitActionMetadata).toMatchObject({
        name: expect.any(String),
        version: expect.any(String),
        description: expect.any(String),
        parameters: expect.any(Object),
        required: expect.any(Array),
      });
    });

    it('should list all required parameters', () => {
      const requiredParams = ['message', 'chainId', 'rpcUrl'];
      expect(SigningSimpleLitActionMetadata.required).toEqual(requiredParams);
    });

    it('should have descriptions for all parameters', () => {
      const params = Object.keys(SigningSimpleLitActionMetadata.parameters);
      const required = [...SigningSimpleLitActionMetadata.required];
      expect(params.sort()).toEqual(required.sort());
    });
  });
}); 