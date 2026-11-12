import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { target: 'es2022', cssCodeSplit: false, assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000, rollupOptions: { output: { inlineDynamicImports: true } } },
  worker: { format: 'iife' },
});
