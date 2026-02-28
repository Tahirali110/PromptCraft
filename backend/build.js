import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  external: ['@libsql/client', '@google/genai'],
  sourcemap: true,
  minify: true,
  logLevel: 'info',
});

console.log('Build complete!');
