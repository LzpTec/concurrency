import { defineConfig } from 'tsup';

export default defineConfig({
    treeshake: "smallest",
    splitting: true,
    bundle: true,
    clean: true,
    outDir: 'dist',
    format: ['cjs', 'esm'],
    entry: ['src/index.ts', 'src/batch.ts', 'src/concurrency.ts', 'src/throttle.ts'],
    dts: true,
    minify: true,
    sourcemap: true,
    platform: 'neutral',
    target: 'es2017'
});
