import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';

// Custom plugin to copy gif.js worker files
const copyGifWorkers = () => ({
  name: 'copy-gif-workers',
  buildStart() {
    const publicDir = resolve(__dirname, 'public');
    const workerDir = resolve(publicDir, 'workers');
    
    if (!existsSync(workerDir)) {
      mkdirSync(workerDir, { recursive: true });
    }
    
    const gifJsPath = resolve(__dirname, 'node_modules/gif.js/dist');
    
    if (existsSync(resolve(gifJsPath, 'gif.worker.js'))) {
      copyFileSync(
        resolve(gifJsPath, 'gif.worker.js'),
        resolve(workerDir, 'gif.worker.js')
      );
    }
  }
});

export default defineConfig({
  base: '/sLixTOOLS/',
  plugins: [
    react(),
    copyGifWorkers(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  css: {
    devSourcemap: true,
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    cssCodeSplit: true,
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: ['@ffmpeg/ffmpeg'],
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'ui-libs': ['framer-motion', 'lucide-react'],
          'gif-libs': ['gif.js'],
          'animation': ['lenis'],
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(extType || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
  },
  server: {
    port: 3000,
    host: true,
    open: true,
  },
  define: {
    'import.meta.env.BASE_URL': JSON.stringify('/'),
  },
});
