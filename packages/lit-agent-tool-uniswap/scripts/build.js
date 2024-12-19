import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Function to get the description from index.ts
async function getDescription() {
  const result = await esbuild.build({
    entryPoints: [join(rootDir, "src", "index.ts")],
    bundle: false,
    write: false,
    format: "esm",
    target: "esnext",
    platform: "neutral",
  });

  const code = result.outputFiles[0].text;
  const match = code.match(
    /const uniswapLitActionDescription\s*=\s*["']([^"']+)["']/
  );

  if (!match) {
    console.error("Code content:", code);
    throw new Error("Could not find description in index.ts");
  }

  return match[1];
}

// Function to generate the action string
async function generateActionString() {
  // Build the action file to get its contents
  const result = await esbuild.build({
    entryPoints: [join(rootDir, "src", "litAction.ts")],
    bundle: true, // Enable bundling to resolve imports
    write: false,
    format: "esm",
    target: "esnext",
    platform: "neutral",
    minify: false,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  const actionCode = result.outputFiles[0].text;

  // Extract everything between the var assignment and the export statement
  const startMatch = actionCode.indexOf("var litAction_default = ");
  const endMatch = actionCode.indexOf("export {");

  if (startMatch === -1 || endMatch === -1) {
    console.error("Compiled code:", actionCode);
    throw new Error("Could not find function boundaries in compiled code");
  }

  // Extract the function definition (excluding the variable assignment)
  const functionBody = actionCode
    .slice(startMatch + "var litAction_default = ".length, endMatch)
    .trim()
    .replace(/;$/, ""); // Remove trailing semicolon if present

  // Create self-executing function
  return `(${functionBody})();`;
}

// Function to get existing metadata
async function getExistingMetadata() {
  try {
    const content = await fs.readFile(
      join(rootDir, "dist", "ipfs.json"),
      "utf-8"
    );
    const metadata = JSON.parse(content);
    return metadata.uniswapLitAction || {};
  } catch (error) {
    return {};
  }
}

// Function to generate the index files
async function generateIndexFiles(ipfsMetadata = {}) {
  const [actionString, description, existingMetadata] = await Promise.all([
    generateActionString(),
    getDescription(),
    getExistingMetadata(),
  ]);

  // Use existing metadata if no new metadata is provided
  const metadata =
    Object.keys(ipfsMetadata).length > 0
      ? ipfsMetadata.uniswapLitAction
      : existingMetadata;

  // Create the JavaScript content
  const jsContent = `
export const uniswapLitActionDescription = ${JSON.stringify(description)};

export const uniswapLitAction = ${JSON.stringify(actionString)};

export const uniswapMetadata = {
  uniswapLitAction: {
    IpfsHash: ${JSON.stringify(metadata.IpfsHash || "")},
    PinSize: ${metadata.PinSize || 0},
    Timestamp: ${JSON.stringify(metadata.Timestamp || "")},
    isDuplicate: ${metadata.isDuplicate || false},
    Duration: ${metadata.Duration || 0}
  }
};

export * from "./policy";
`;

  // Create the TypeScript declaration content
  const dtsContent = `
export type UniswapMetadata = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate: boolean;
  Duration: number;
};

export type UniswapLitActionString = string;

export declare const uniswapLitActionDescription: string;
export declare const uniswapLitAction: UniswapLitActionString;
export declare const uniswapMetadata: {
  uniswapLitAction: UniswapMetadata;
};

export * from "./policy";
`;

  // Write the files
  await Promise.all([
    fs.writeFile(join(rootDir, "dist", "index.js"), jsContent),
    fs.writeFile(join(rootDir, "dist", "index.d.ts"), dtsContent),
    fs.writeFile(join(rootDir, "dist", "litAction.js"), actionString),
  ]);
}

// Main build function
async function build() {
  try {
    // Ensure dist directory exists
    await fs.mkdir(join(rootDir, "dist"), { recursive: true });

    // Generate index files and write action string
    await generateIndexFiles();

    console.log("Build completed successfully");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

export { generateIndexFiles };

// Only run build if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}
