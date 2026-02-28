import { build } from 'esbuild';

// Build 1: Local dev / Bun entry (ESM)
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  external: ['@libsql/client'],
  sourcemap: true,
  minify: true,
  logLevel: 'info',
});

// Build 2: Vercel serverless entry (CommonJS — avoids ESM/type:module issues)
await build({
  entryPoints: ['api/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',           // <-- CJS avoids "type":"module" conflicts on Vercel
  outfile: 'dist/api.js',
  external: ['@libsql/client'],
  sourcemap: false,
  minify: true,
  logLevel: 'info',
});

console.log('Build complete!');
