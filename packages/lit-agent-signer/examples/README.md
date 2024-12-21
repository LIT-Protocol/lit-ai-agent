# Lit Protocol SDK Examples

This directory contains examples demonstrating how to use the Lit Protocol SDK.

## Available Examples

### 1. Basic Usage Example (`basic-usage.ts`)

The `basic-usage.ts` file demonstrates the core functionality of the SDK:

- Initializing the client
- Creating a wallet (PKP)
- Signing messages
- Executing JavaScript code
- Proper cleanup

### 2. Minimal Signing Example (`minimal-signing.ts`)

The `minimal-signing.ts` file shows a streamlined example focused on:

- Quick client initialization
- Wallet creation
- Transaction signing

## Prerequisites

1. Create a `.env` file in the root directory with your authentication key:

```env
LIT_AUTH_PRIVATE_KEY=your_auth_key_here
```

2. Install dependencies:

```bash
npm install
# or
yarn
```

## Running the Examples

To run the basic usage example:

```bash
npm run example
# or
yarn example
```

To run the minimal signing example:

```bash
npm run minimalSigningExample
# or
yarn minimalSigningExample
```

## Example Output

When running the basic usage example, you should see output similar to:

```
🚀 Initializing Lit client...
✓ Client initialized, checking if ready...
Client ready: true
Creating new wallet...
✓ Wallet created: { ... }
✓ Message signed: { ... }
✓ JS execution result: { ... }
✓ Client disconnected
```

When running the minimal signing example, you should see:

```
✓ Wallet created: { ... }
✓ Transaction signed: { ... }
```

## Troubleshooting

If you encounter any issues:

1. Make sure your `.env` file is properly configured
2. Verify that you have installed all dependencies
3. Ensure you're using a compatible Node.js version
4. Check that your authentication key is valid

For more detailed information, refer to the main [README.md](../README.md) in the root directory.
