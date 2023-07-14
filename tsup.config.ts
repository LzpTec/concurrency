import { defineConfig } from 'tsup';

export default defineConfig({
    treeshake: "smallest",
    splitting: true,
    bundle: true,
    clean: true,
    outDir: 'dist',
    format: ['cjs', 'esm'],
    entry: ['src/index.ts', 'src/batch.ts', 'src/concurrency.ts'],
    dts: true,
    minify: true,
    platform: 'neutral',
    target: 'es2017'
});
