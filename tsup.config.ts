import { defineConfig } from 'tsup';

export default defineConfig({
    treeshake: true,
    bundle: true,
    clean: true,
    outDir: 'dist',
    format: ['cjs', 'esm'],
    dts: true,
    minify: true,
    platform: 'neutral',
    target: 'es2018'
});
