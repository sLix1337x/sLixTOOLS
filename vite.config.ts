import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
const isProduction = process.env.NODE_ENV === 'production';
const base = isProduction ? '/sLixTOOLS/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][ext]',
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true,
  },
  define: {
    'import.meta.env.BASE_URL': JSON.stringify(base),
  },
});
