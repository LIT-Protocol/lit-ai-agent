# Lit Serverside Signer SDK

A lightweight SDK for signing transactions and messages with Lit Protocol. This SDK simplifies the process of creating wallets and signing transactions using Lit's Programmable Key Pairs (PKPs).

This SDK is a wrapper around our [full-featured SDK](https://github.com/lit-protocol/js-sdk) which also supports client-side functionality, decryption, and more.
functionality, decryption, and more.

## Features

- 🔑 Easy wallet creation and management
- ✍️ Transaction and message signing
- 🔒 Secure key management via [Lit Protocol](https://litprotocol.com)
- 🚀 Simple, serverside-focused API
- ⚡ Lightweight and efficient

## Installation

```bash
npm install @lit-protocol/lit-agent-signer
# or
yarn add @lit-protocol/lit-agent-signer
```

## Quick Start

```typescript
import { LitClient } from '@lit-protocol/lit-agent-signer';

// Initialize the client with your Lit auth key
const client = await LitClient.create(process.env.LIT_AUTH_PRIVATE_KEY);

// Create a new wallet
const { pkp } = await client.createWallet();
console.log('Wallet created:', pkp);

// Sign a transaction or message
const signedMessage = await client.sign({
  toSign: '0x8111e78458fec7fb123fdfe3c559a1f7ae33bf21bf81d1bad589e9422c648cbd',
});
console.log('Message signed:', signedMessage);
```

## Usage Guide

### Initialization

First, initialize the client with your Lit authentication key:

```typescript
const client = await LitClient.create(authKey);
```

### Wallet Management

Create a new wallet:

```typescript
const { pkp } = await client.createWallet();
```

Get existing wallet:

```typescript
const pkp = client.getPkp();
```

### Signing

Sign a message or transaction:

```typescript
const signedMessage = await client.sign({
  toSign: '0x8111e78458fec7fb123fdfe3c559a1f7ae33bf21bf81d1bad589e9422c648cbd',
});
```

### Execute JavaScript Code

You can also execute JavaScript code using Lit Protocol:

```typescript
const result = await client.executeJs({
  code: `
    Lit.Actions.setResponse({ response: message + " - processed by Lit Protocol" });
  `,
  jsParams: {
    message: 'Hello',
  },
});
```

### Cleanup

When you're done, disconnect the client:

```typescript
await client.disconnect();
```

## Environment Variables

Make sure to set up the following environment variable:

- `LIT_AUTH_PRIVATE_KEY`: Your Lit Protocol authentication key

## Examples

Check out the `examples` directory for more detailed examples:

- `basic-usage.ts`: Complete example showing all main features
- `minimal-signing.ts`: Minimal example focused on transaction signing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
