import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Function to generate the index files
async function generateIndexFiles(ipfsMetadata = {}) {
  // Import the action string directly from the compiled source
  const { uniswapLitAction, uniswapLitActionDescription } = await import(
    "../dist/litAction.js"
  );

  const indexContent = `
export const uniswapLitActionDescription = ${JSON.stringify(uniswapLitActionDescription)};
export const uniswapLitAction = ${JSON.stringify(uniswapLitAction)};
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
  await fs.writeFile(
    join(rootDir, "dist", "lit-action-string.js"),
    uniswapLitAction
  );
}

// Main build function
async function build() {
  try {
    // Ensure dist directory exists
    await fs.mkdir(join(rootDir, "dist"), { recursive: true });

    // First build the litAction.ts file
    await esbuild.build({
      entryPoints: [join(rootDir, "src", "litAction.ts")],
      bundle: true,
      platform: "node",
      format: "esm",
      target: "esnext",
      outfile: join(rootDir, "dist", "litAction.js"),
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    });

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
