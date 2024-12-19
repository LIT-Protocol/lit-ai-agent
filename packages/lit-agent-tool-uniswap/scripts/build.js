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

// Function to generate the index files
async function generateIndexFiles(ipfsMetadata = {}) {
  const [actionString, description] = await Promise.all([
    generateActionString(),
    getDescription(),
  ]);

  const indexContent = `
export const uniswapLitActionDescription = ${JSON.stringify(description)};
export const uniswapLitAction = ${JSON.stringify(actionString)};
export const uniswapMetadata = ${JSON.stringify(ipfsMetadata)};
`;

  await fs.writeFile(join(rootDir, "dist", "index.js"), indexContent);
  await fs.writeFile(
    join(rootDir, "dist", "index.d.ts"),
    `
export declare const uniswapLitActionDescription: string;
export declare const uniswapLitAction: string;
export declare const uniswapMetadata: {
  uniswapLitAction: {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
    isDuplicate: boolean;
    Duration: number;
  };
};
`
  );

  // Write the action string to a separate file for IPFS upload
  await fs.writeFile(join(rootDir, "dist", "lit-action.js"), actionString);
}

// Main build function
async function build() {
  try {
    // Ensure dist directory exists
    await fs.mkdir(join(rootDir, "dist"), { recursive: true });

    // Read the IPFS metadata if it exists
    let ipfsMetadata = {};
    try {
      const content = await fs.readFile(
        join(rootDir, "dist", "ipfs.json"),
        "utf-8"
      );
      ipfsMetadata = JSON.parse(content);
    } catch (error) {
      console.warn(
        "Warning: ipfs.json not found or invalid, using empty metadata"
      );
    }

    // Generate index files and write action string
    await generateIndexFiles(ipfsMetadata);

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
