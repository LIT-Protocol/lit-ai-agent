export enum LitAgentErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  WALLET_CREATION_FAILED = 'WALLET_CREATION_FAILED',
  TOOL_PERMISSION_FAILED = 'TOOL_PERMISSION_FAILED',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  TOOL_VALIDATION_FAILED = 'TOOL_VALIDATION_FAILED',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_POLICY_REGISTRATION_FAILED = 'TOOL_POLICY_REGISTRATION_FAILED',
}

export type ErrorDetails = {
  name?: string;
  message?: string;
  stack?: string;
  type?: LitAgentErrorType;
  details?: unknown;
  [key: string]: unknown;
};

export class LitAgentError extends Error {
  public readonly serializedDetails: string;

  constructor(
    public readonly type: LitAgentErrorType,
    message: string,
    public readonly details?: Record<string, ErrorDetails | unknown>
  ) {
    super(message);
    this.name = 'LitAgentError';

    // Store a serialized version of details for better error logging
    this.serializedDetails = details
      ? JSON.stringify(
          details,
          (key, value) => {
            if (value instanceof Error) {
              // Handle nested errors
              return {
                name: value.name,
                message: value.message,
                stack: value.stack,
                ...(value instanceof LitAgentError
                  ? {
                      type: value.type,
                      details: value.serializedDetails
                        ? JSON.parse(value.serializedDetails)
                        : undefined,
                    }
                  : {}),
              };
            }
            return value;
          },
          2
        )
      : '';
  }

  // Override toJSON to provide better serialization
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      details: this.serializedDetails
        ? JSON.parse(this.serializedDetails)
        : undefined,
      stack: this.stack,
    };
  }
}
