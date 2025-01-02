# FSS Tool Boilerplate

This package serves as a template for creating new FSS (Full Self Signing) tools. You can either:
1. Copy this boilerplate package and rename it
2. Generate a new package using:
```bash
npx nx g @nx/js:lib packages/fss-tool-TOOL-NAME --publishable --importPath=@lit-protocol/fss-tool-TOOL-NAME
```
3. Choose `tsc`, `eslint`, `jest` for the build system.

## Initial Setup

After generating the package:

1. Delete the generated files:
   ```
   rm src/lib/fss-tool-boilerplate.ts
   rm src/lib/fss-tool-boilerplate.spec.ts
   ```

2. Update `src/index.ts` to export the FSS tool files:
   ```typescript
   export * from './lib/agent-tool';
   export * from './lib/lit-action';
   export * from './lib/policy';
   export * from './lib/ipfs';
   ```

3. Update `tsconfig.lib.json` with the correct configuration:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "baseUrl": ".",
       "rootDir": "src",
       "outDir": "dist",
       "tsBuildInfoFile": "dist/tsconfig.lib.tsbuildinfo",
       "emitDeclarationOnly": false,
       "composite": true,
       "declaration": true,
       "declarationMap": true,
       "types": ["node"],
       "moduleResolution": "node",
       "module": "commonjs",
       "paths": {
         "@lit-protocol/fss-tool-policy-base": ["../fss-tool-policy-base/src"]
       }
     },
     "include": ["src/**/*.ts"],
     "references": [
       {
         "path": "../fss-tool-policy-base/tsconfig.lib.json"
       }
     ],
     "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
   }
   ```

4. Create the required FSS tool files (detailed below in the File Structure section)

## Integration Steps

After creating your tool, you'll need to integrate it with the FSS ecosystem:

### 1. FSS Tool Registry Integration
In `packages/fss-tool-registry/`:

a. Add your tool to `package.json` dependencies:
```json
{
  "dependencies": {
    "@lit-protocol/fss-tool-your-tool": "workspace:*"
  }
}
```

b. Add your tool to `tsconfig.json` references:
```json
{
  "references": [
    {
      "path": "../fss-tool-your-tool"
    }
  ]
}
```

c. Add your tool to `tsconfig.lib.json` references:
```json
{
  "references": [
    {
      "path": "../fss-tool-your-tool/tsconfig.lib.json"
    }
  ]
}
```

d. Import and register your tool in `src/lib/agent-tool-registry.ts`:
```typescript
import {
  YourToolLitActionParameters,
  YourToolLitActionSchema,
  YourToolLitActionMetadata,
  YourToolLitActionParameterDescriptions,
  isValidYourToolParameters,
  yourToolLitActionDescription,
  YourToolPolicy,
  YourToolPolicySchema,
  encodeYourToolPolicy,
  decodeYourToolPolicy,
  IPFS_CID as YourToolIpfsCid,
} from '@lit-protocol/fss-tool-your-tool';

// Add to SUPPORTED_TOOLS
export const SUPPORTED_TOOLS = [
  // ... existing tools ...
  'YourTool',
] as const;

// Add your tool's exports
export const YourTool = {
  parameters: YourToolLitActionParameters,
  schema: YourToolLitActionSchema,
  metadata: YourToolLitActionMetadata,
  descriptions: YourToolLitActionParameterDescriptions,
  isValidParameters: isValidYourToolParameters,
  description: yourToolLitActionDescription,
  policy: YourToolPolicy,
  policySchema: YourToolPolicySchema,
  encodePolicy: encodeYourToolPolicy,
  decodePolicy: decodeYourToolPolicy,
  ipfsCid: YourToolIpfsCid,
} as const;
```

### 2. FSS Signer Integration
In `packages/fss-signer/`:

a. Add your tool's policy data to `src/lib/types.ts`:
```typescript
export interface ToolPolicyData {
  // ... existing fields ...
  yourToolSpecificField?: string | string[];
}
```

b. Add your tool's policy case to `src/lib/utils/tool-policies.ts`:
```typescript
switch(policy.type) {
  // ... existing cases ...
  case 'YourTool':
    encodedPolicy = ethers.utils.defaultAbiCoder.encode(
      ['tuple(YOUR_POLICY_STRUCTURE)'],
      [{
        // Your policy encoding logic
      }]
    );
    break;
}
```

### 3. Root Configuration
In the root directory:

a. Add your tool to root `tsconfig.json`:
```json
{
  "references": [
    {
      "path": "packages/fss-tool-your-tool/tsconfig.lib.json"
    }
  ]
}
```

## Your Tool Package Structure

All files in `packages/fss-tool-TOOL-NAME/`:
```
├── package.json           # Dependencies and build targets
├── tsconfig.json         # TypeScript config with policy-base reference
├── tsconfig.lib.json     # Library-specific TypeScript config
├── src/
│   ├── lib/
│   │   ├── agent-tool.ts       # Tool parameters and validation
│   │   ├── agent-tool.spec.ts  # Tests for agent-tool
│   │   ├── policy.ts           # Policy interface and encoding
│   │   ├── policy.spec.ts      # Tests for policy
│   │   ├── lit-action.ts       # Lit Action implementation
│   │   └── ipfs.ts            # IPFS CID management
│   └── index.ts               # Public API exports
└── tools/
    └── scripts/
        ├── build-lit-action.js  # Build script
        └── deploy-lit-action.js # Deploy script
```

## Getting Started

### 1. Dependencies
Add the following to your `package.json`:
```json
{
  "dependencies": {
    "@lit-protocol/fss-tool-policy-base": "workspace:*",
    "ethers": "^5.7.2",
    "zod": "^3.24.1",
    "tslib": "^2.3.0"
  },
  "devDependencies": {
    "@dotenvx/dotenvx": "^1.31.3",
    "esbuild": "^0.19.11",
    "node-fetch": "^2.7.0"
  }
}
```

### 2. Required Files Structure
Create the following files:

```
src/
├── lib/
│   ├── agent-tool.ts       # Tool parameters, metadata, and validation
│   ├── agent-tool.spec.ts  # Tests for agent-tool
│   ├── policy.ts          # Policy interface and encoding/decoding
│   ├── policy.spec.ts     # Tests for policy
│   ├── lit-action.ts      # Lit Action implementation
│   └── ipfs.ts           # IPFS CID management
├── index.ts              # Export all public APIs
└── types.ts             # Type definitions (if needed)

tools/
└── scripts/
    ├── build-lit-action.js  # Build script for Lit Action
    └── deploy-lit-action.js # Deploy script for IPFS
```

### 3. Configuration Updates

#### a. Update package.json
Add build targets to the `nx` section:
```json
{
  "nx": {
    "targets": {
      "build:action": {
        "executor": "nx:run-commands",
        "dependsOn": ["build"],
        "options": {
          "commands": ["node tools/scripts/build-lit-action.js"],
          "cwd": "packages/fss-tool-your-tool",
          "parallel": false
        },
        "outputs": [
          "{workspaceRoot}/packages/fss-tool-your-tool/dist/deployed-lit-action.js"
        ]
      },
      "deploy": {
        "executor": "nx:run-commands",
        "dependsOn": ["build:action"],
        "options": {
          "commands": ["node tools/scripts/deploy-lit-action.js"],
          "cwd": "packages/fss-tool-your-tool"
        }
      },
      "publish": {
        "executor": "@nx/js:npm-publish",
        "dependsOn": ["deploy"],
        "options": {
          "packageRoot": "dist"
        }
      }
    }
  }
}
```

#### b. Update tsconfig.json
Add policy-base reference:
```json
{
  "references": [
    {
      "path": "../fss-tool-policy-base"
    }
  ]
}
```

#### c. Update tsconfig.lib.json
Add paths configuration:
```json
{
  "paths": {
    "@lit-protocol/fss-tool-policy-base": ["../fss-tool-policy-base/src"]
  }
}
```

### 4. Implementation Guide

#### a. agent-tool.ts
Define your tool's parameters, metadata, and validation:
```typescript
import { z } from 'zod';

export interface YourToolParameters {
  // Define your tool's parameters
}

export const YourToolSchema = z.object({
  // Define validation schema
});

export const YourToolMetadata = {
  name: 'YourTool',
  version: '1.0.0',
  description: 'Description of your tool',
  parameters: {
    // Parameter descriptions
  },
  required: ['param1', 'param2'],
};
```

#### b. policy.ts
Implement policy management:
```typescript
import { BaseAgentToolPolicy } from '@lit-protocol/fss-tool-policy-base';

export interface YourToolPolicy extends BaseAgentToolPolicy {
  type: 'YourTool';
  // Additional policy fields
}

export function encodeYourToolPolicy(policy: YourToolPolicy): string {
  // Implement policy encoding
}

export function decodeYourToolPolicy(
  encodedPolicy: string,
  version: string
): YourToolPolicy {
  // Implement policy decoding
}
```

#### c. lit-action.ts
Implement the Lit Action:
```typescript
export default async () => {
  try {
    // Implement your Lit Action logic
  } catch (err) {
    // Error handling
  }
};
```

### 5. Testing
Add comprehensive tests for all components:
```typescript
describe('YourTool', () => {
  describe('parameters validation', () => {
    // Test parameter validation
  });

  describe('policy encoding/decoding', () => {
    // Test policy functions
  });

  // Additional test suites
});
```

## Building

Run `nx build fss-tool-your-tool` to build the library.

## Testing

Run `nx test fss-tool-your-tool` to execute the unit tests.

## Deployment

1. Build the Lit Action: `nx build:action fss-tool-your-tool`
2. Deploy to IPFS: `nx deploy fss-tool-your-tool`
3. Publish package: `nx publish fss-tool-your-tool`

## Integration

After creating your tool:

1. Add it to the FSS Tool Registry
2. Update the necessary configuration files
3. Add any required policy types to the FSS Signer

See the existing tools (e.g., `fss-tool-signing-simple`) for reference implementations.