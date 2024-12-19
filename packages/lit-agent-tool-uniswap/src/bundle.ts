// @ts-nocheck

import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.10.3";

export async function bundleLitAction(): Promise<string> {
  try {
    const result = await esbuild.build({
      plugins: [...denoPlugins()],
      entryPoints: ["src/litAction.ts"],
      bundle: true,
      platform: "node",
      format: "esm",
      target: "esnext",
      minify: false,
      inject: ["src/esbuild-shims.js"],
      write: false,
    });

    if (!result.outputFiles?.[0]) {
      throw new Error("No output generated");
    }

    return result.outputFiles[0].text;
  } finally {
    esbuild.stop();
  }
}

if (import.meta.main) {
  (async () => {
    try {
      const bundled = await bundleLitAction();

      // Create dist directory if it doesn't exist
      try {
        await Deno.mkdir("dist", { recursive: true });
      } catch (error) {
        if (!(error instanceof Deno.errors.AlreadyExists)) {
          throw error;
        }
      }

      await Deno.writeTextFile("dist/lit-action.js", bundled);
    } catch (error) {
      console.error("Bundling failed:", error);
      Deno.exit(1);
    }
  })();
}
