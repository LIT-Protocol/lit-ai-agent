import {
  SendERC20LitActionSchema,
  SendERC20LitActionParameters,
  SendERC20LitActionMetadata,
  isValidSendERC20Parameters,
} from './agent-tool';

describe('SendERC20LitAction', () => {
  const validParams: SendERC20LitActionParameters = {
    tokenIn: '0x1234567890123456789012345678901234567890',
    recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    amountIn: '1.5',
    chainId: '1',
    rpcUrl: 'https://eth-mainnet.example.com',
  };

  describe('SendERC20LitActionSchema', () => {
    it('should validate correct parameters', () => {
      const result = SendERC20LitActionSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    describe('tokenIn validation', () => {
      it('should reject invalid Ethereum addresses', () => {
        const invalidTokens = [
          '0x123', // too short
          '0xGGGG567890123456789012345678901234567890', // invalid hex
          '1234567890123456789012345678901234567890', // missing 0x prefix
          '0x12345678901234567890123456789012345678901', // too long
        ];

        invalidTokens.forEach((tokenIn) => {
          const result = SendERC20LitActionSchema.safeParse({
            ...validParams,
            tokenIn,
          });
          expect(result.success).toBe(false);
        });
      });
    });

    describe('recipientAddress validation', () => {
      it('should reject invalid Ethereum addresses', () => {
        const invalidAddresses = [
          '0x123', // too short
          '0xGGGGdefabcdefabcdefabcdefabcdefabcdefabcd', // invalid hex
          'abcdefabcdefabcdefabcdefabcdefabcdefabcd', // missing 0x prefix
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcde', // too long
        ];

        invalidAddresses.forEach((recipientAddress) => {
          const result = SendERC20LitActionSchema.safeParse({
            ...validParams,
            recipientAddress,
          });
          expect(result.success).toBe(false);
        });
      });
    });

    describe('amountIn validation', () => {
      it('should accept valid decimal numbers as strings', () => {
        const validAmounts = ['1.5', '100', '0.01', '1000.55555'];

        validAmounts.forEach((amountIn) => {
          const result = SendERC20LitActionSchema.safeParse({
            ...validParams,
            amountIn,
          });
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid amounts', () => {
        const invalidAmounts = [
          'abc', // not a number
          '1.2.3', // multiple decimals
          '-1.5', // negative numbers
          '1,5', // wrong decimal separator
          '', // empty string
        ];

        invalidAmounts.forEach((amountIn) => {
          const result = SendERC20LitActionSchema.safeParse({
            ...validParams,
            amountIn,
          });
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe('isValidSendERC20Parameters', () => {
    it('should return true for valid parameters', () => {
      expect(isValidSendERC20Parameters(validParams)).toBe(true);
    });

    it('should return false for invalid parameters', () => {
      const invalidParams = [
        {
          ...validParams,
          tokenIn: '0x123', // invalid address
        },
        {
          ...validParams,
          amountIn: 'abc', // invalid amount
        },
        {
          tokenIn: validParams.tokenIn,
          // missing parameters
        },
        null,
        undefined,
        'not an object',
        [],
      ];

      invalidParams.forEach((params) => {
        expect(isValidSendERC20Parameters(params)).toBe(false);
      });
    });
  });

  describe('SendERC20LitActionMetadata', () => {
    it('should have the correct structure', () => {
      expect(SendERC20LitActionMetadata).toMatchObject({
        name: expect.any(String),
        description: expect.any(String),
        parameters: expect.any(Object),
        required: expect.any(Array),
        validation: expect.any(Object),
      });
    });

    it('should list all required parameters', () => {
      const requiredParams = [
        'tokenIn',
        'recipientAddress',
        'amountIn',
        'chainId',
        'rpcUrl',
      ];
      expect(SendERC20LitActionMetadata.required).toEqual(requiredParams);
    });

    it('should have descriptions for all parameters', () => {
      const params = Object.keys(SendERC20LitActionMetadata.parameters);
      const required = [...SendERC20LitActionMetadata.required];
      expect(params.sort()).toEqual(required.sort());
    });

    it('should have validation rules for all parameters', () => {
      const validationRules = Object.keys(
        SendERC20LitActionMetadata.validation
      );
      const required = [...SendERC20LitActionMetadata.required];
      expect(validationRules.sort()).toEqual(required.sort());
    });
  });
});
