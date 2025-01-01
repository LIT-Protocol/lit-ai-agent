import {
  SigningSimplePolicy,
  SigningSimplePolicySchema,
  encodeSigningSimplePolicy,
  decodeSigningSimplePolicy,
} from './policy';

describe('SigningSimplePolicy', () => {
  const validPolicy: SigningSimplePolicy = {
    type: 'SigningSimple',
    version: '1.0.0',
    allowedMessagePrefixes: ['Hello', 'Test'],
    maxGasLimit: '1000000',
  };

  describe('SigningSimplePolicySchema', () => {
    it('should validate correct policy', () => {
      const result = SigningSimplePolicySchema.safeParse(validPolicy);
      expect(result.success).toBe(true);
    });

    it('should reject invalid policy type', () => {
      const invalidPolicy = {
        ...validPolicy,
        type: 'InvalidType',
      };
      const result = SigningSimplePolicySchema.safeParse(invalidPolicy);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidPolicies = [
        {
          ...validPolicy,
          type: undefined,
        },
        {
          ...validPolicy,
          version: undefined,
        },
        {
          ...validPolicy,
          maxGasLimit: undefined,
        },
      ];

      invalidPolicies.forEach((policy) => {
        const result = SigningSimplePolicySchema.safeParse(policy);
        expect(result.success).toBe(false);
      });
    });

    it('should validate allowedMessagePrefixes array', () => {
      const invalidPolicies = [
        {
          ...validPolicy,
          allowedMessagePrefixes: 'not-an-array',
        },
        {
          ...validPolicy,
          allowedMessagePrefixes: [123, 456], // not strings
        },
      ];

      invalidPolicies.forEach((policy) => {
        const result = SigningSimplePolicySchema.safeParse(policy);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('encodeSigningSimplePolicy', () => {
    it('should encode valid policy', () => {
      const encoded = encodeSigningSimplePolicy(validPolicy);
      expect(typeof encoded).toBe('string');
      expect(() => JSON.parse(encoded)).not.toThrow();
    });

    it('should throw error for invalid policy', () => {
      const invalidPolicy = {
        ...validPolicy,
        type: 'InvalidType',
      };
      expect(() => encodeSigningSimplePolicy(invalidPolicy as SigningSimplePolicy)).toThrow();
    });
  });

  describe('decodeSigningSimplePolicy', () => {
    it('should decode valid encoded policy', () => {
      const encoded = encodeSigningSimplePolicy(validPolicy);
      const decoded = decodeSigningSimplePolicy(encoded, validPolicy.version);
      expect(decoded).toEqual(validPolicy);
    });

    it('should throw error for invalid encoded policy', () => {
      expect(() => decodeSigningSimplePolicy('invalid-json', validPolicy.version)).toThrow();
    });

    it('should throw error for version mismatch', () => {
      const encoded = encodeSigningSimplePolicy(validPolicy);
      expect(() => decodeSigningSimplePolicy(encoded, '2.0.0')).toThrow();
    });
  });
}); 