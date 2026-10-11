import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { copyWorkers } from './scripts/viteWorkerCopyPlugin';

export default defineConfig({
  base: '/sLixTOOLS/',
  plugins: [
    react(),
    copyWorkers(),
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
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/'))
            return 'react-vendor';
          if (id.includes('/react-router')) return 'router';
          if (id.includes('/framer-motion/') || id.includes('/lucide-react/')) return 'ui-libs';
          if (id.includes('/gif.js/')) return 'gif-libs';
          if (id.includes('/lenis/')) return 'animation';
          if (
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/') ||
            id.includes('/class-variance-authority/')
          )
            return 'utils';
          return undefined;
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
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    port: 3000,
    host: true,
    open: true,
    fs: {
      // Allow serving files from node_modules for PDF.js worker
      allow: ['..'],
    },
  },
  // Ensure .mjs files in public are served as static assets, not processed as modules
  publicDir: 'public',
});
