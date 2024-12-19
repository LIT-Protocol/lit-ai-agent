// @ts-nocheck
import { bundleLitAction } from "./bundle.ts";
import { uploadToPinata } from "./uploadToPinata.ts";

async function updateIpfsMetadata(newMetadata: any) {
  try {
    let metadata = {};
    try {
      const content = await Deno.readTextFile("./dist/ipfs.json");
      metadata = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty object
    }

    metadata["uniswapLitAction"] = newMetadata;
    await Deno.writeTextFile(
      "./dist/ipfs.json",
      JSON.stringify(metadata, null, 2)
    );
  } catch (error) {
    console.error("Failed to update ipfs.json:", error);
  }
}

(async () => {
  const PINATA_JWT = Deno.env.get("PINATA_JWT");

  if (!PINATA_JWT) {
    console.error("Missing PINATA_JWT environment variable");
    Deno.exit(1);
  }

  try {
    const bundled = await bundleLitAction();
    const startTime = Date.now();
    const pinataResponse = await uploadToPinata(PINATA_JWT, bundled);
    const duration = (Date.now() - startTime) / 1000;

    // Create metadata
    const metadata = {
      IpfsHash: pinataResponse.IpfsHash,
      PinSize: pinataResponse.PinSize,
      Timestamp: new Date().toISOString(),
      isDuplicate: pinataResponse.isDuplicate || false,
      Duration: duration,
    };

    // Create dist directory if it doesn't exist
    try {
      await Deno.mkdir("dist", { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
    }

    // Save bundled code and update metadata
    await Deno.writeTextFile("./dist/lit-action.js", bundled);
    await updateIpfsMetadata(metadata);
  } catch (error) {
    console.error("Deployment failed:", error);
    Deno.exit(1);
  }
})();
