const esbuild = require('esbuild');

// Common build options
const buildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  platform: 'node',
  mainFields: ['main', 'module'],
  target: ['es2020'],
};

// Build CJS version
esbuild
  .build({
    ...buildOptions,
    outfile: 'dist/index.js',
    format: 'cjs',
  })
  .catch(() => process.exit(1));

// Build ESM version
esbuild
  .build({
    ...buildOptions,
    outfile: 'dist/index.esm.js',
    format: 'esm',
  })
  .catch(() => process.exit(1));

// Generate type definitions
const { execSync } = require('child_process');
execSync('tsc --emitDeclarationOnly --declaration --outDir dist', {
  stdio: 'inherit',
});
