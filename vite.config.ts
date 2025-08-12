import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/sLixTOOLS/' : '/',
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true
    }),
    // Bundle analyzer - generates stats.html
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  publicDir: 'public',
  css: {
    devSourcemap: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      }
    },
    cssCodeSplit: true,
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      // Remove external marking to allow proper chunking
      // external: [],
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // Router and query
          'router': ['react-router-dom', '@tanstack/react-query'],
          
          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-progress',
            'lucide-react'
          ],
          
          // Heavy processing libraries (split by feature)
          'pdf-libs': ['jspdf'],
          'pdf-viewer': ['pdfjs-dist'],
          'gif-libs': ['gif.js'],
          'file-libs': ['jszip'],
          'ffmpeg-libs': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          
          // Animation and 3D
          'animation': ['framer-motion', 'lenis'],
          
          // Utilities
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority']
        },
        entryFileNames: 'assets/js/[name].[hash].js',
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) {
            return 'assets/css/[name].[hash].[ext]';
          }
          if (name.match(/\.(png|jpe?g|svg|gif|webp|ico)$/)) {
            return 'assets/images/[name].[hash].[ext]';
          }
          if (name.match(/\.(woff2?|eot|ttf|otf)$/)) {
            return 'assets/fonts/[name].[hash].[ext]';
          }
          return 'assets/[name].[hash].[ext]';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'clsx',
      'tailwind-merge'
    ],
    exclude: [
      'gif.js',
      'jspdf',
      'pdfjs-dist',
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util'
    ]
  },
  server: {
    port: 3000,
    strictPort: false,
    open: true,
    hmr: {
      overlay: false
    },
  },
  define: {
    'import.meta.env.BASE_URL': JSON.stringify(process.env.NODE_ENV === 'production' ? '/sLixTOOLS/' : '/'),
  },
});
