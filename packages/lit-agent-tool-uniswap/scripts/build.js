import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Function to bundle the lit action
async function bundleLitAction() {
  const litActionResult = await esbuild.build({
    entryPoints: [join(rootDir, "src", "litAction.ts")],
    bundle: true,
    platform: "neutral",
    format: "esm",
    target: "esnext",
    minify: false,
    inject: [join(rootDir, "src", "esbuild-shims.js")],
    write: false,
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NODE_DEBUG": "false",
    },
  });

  return litActionResult.outputFiles[0].text;
}

// Function to generate the index files
async function generateIndexFiles(litActionCode, ipfsMetadata = {}) {
  const indexContent = `
export const uniswapLitActionDescription = "Swap tokens using Uniswap V3";
export const uniswapLitAction = ${JSON.stringify(litActionCode)};
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
}

// Main build function
async function build() {
  try {
    // Ensure dist directory exists
    await fs.mkdir(join(rootDir, "dist"), { recursive: true });

    // Bundle the lit action
    const litActionCode = await bundleLitAction();
    await fs.writeFile(join(rootDir, "dist", "lit-action.js"), litActionCode);

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

    // Generate index files
    await generateIndexFiles(litActionCode, ipfsMetadata);

    console.log("Build completed successfully");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

export { bundleLitAction, generateIndexFiles };

// Only run build if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}
