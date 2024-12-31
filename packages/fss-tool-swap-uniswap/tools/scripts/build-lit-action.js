const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Ensure dist directory exists
    const distDir = path.join(__dirname, '../../dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Build the action file
    const result = await esbuild.build({
      entryPoints: [path.join(__dirname, '../../src/lib/lit-action.ts')],
      bundle: true,
      write: false,
      format: 'esm',
      target: 'esnext',
      platform: 'neutral',
      minify: false,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const actionCode = result.outputFiles[0].text;

    // Extract the function body
    const startMatch = actionCode.indexOf('var lit_action_default = ');
    const endMatch = actionCode.indexOf('export {');

    if (startMatch === -1 || endMatch === -1) {
      console.error('Compiled code:', actionCode);
      throw new Error('Could not find function boundaries in compiled code');
    }

    // Extract the function definition (excluding the variable assignment)
    const functionBody = actionCode
      .slice(startMatch + 'var lit_action_default = '.length, endMatch)
      .trim()
      .replace(/;$/, ''); // Remove trailing semicolon if present

    // Create self-executing function
    const finalCode = `(${functionBody})();`;

    // Write to output file
    fs.writeFileSync(
      path.join(distDir, 'deployed-lit-action.js'),
      finalCode,
      'utf8'
    );

    console.log('Successfully built deployed-lit-action.js');
  } catch (error) {
    console.error('Error building lit-action:', error);
    process.exit(1);
  }
}

main();
