import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { join } from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    port: 5888,
    strictPort: false
  },
  resolve: {
    alias: {
      '@': join(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
