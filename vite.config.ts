import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Custom plugin to copy gif.js worker files
const copyGifWorkers = () => {
  return {
    name: 'copy-gif-workers',
    buildStart() {
      // Copy gif.js worker files to public directory
      const nodeModulesPath = resolve(__dirname, 'node_modules/gif.js/dist');
      const publicWorkersPath = resolve(__dirname, 'public/workers');
      
      if (!existsSync(publicWorkersPath)) {
        mkdirSync(publicWorkersPath, { recursive: true });
      }
      
      try {
        if (existsSync(join(nodeModulesPath, 'gif.worker.js'))) {
          copyFileSync(
            join(nodeModulesPath, 'gif.worker.js'),
            join(publicWorkersPath, 'gif.worker.local.js')
          );
        }
        if (existsSync(join(nodeModulesPath, 'gif.js'))) {
          copyFileSync(
            join(nodeModulesPath, 'gif.js'),
            join(publicWorkersPath, 'gif.local.js')
          );
        }
      } catch (error) {
        console.warn('Could not copy gif.js worker files:', error.message);
      }
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/sLixTOOLS/' : '/',
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true
    }),
    // Copy gif.js workers to avoid CDN dependencies
    copyGifWorkers(),
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
          // PDF libraries removed - tools now show "Coming Soon"
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
      // PDF libraries removed - tools converted to "Coming Soon"
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
