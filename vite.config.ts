import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';

// Helper function to copy worker files
const copyWorkerFiles = () => {
  const publicDir = resolve(__dirname, 'public');
  const workerDir = resolve(publicDir, 'workers');

  if (!existsSync(workerDir)) {
    mkdirSync(workerDir, { recursive: true });
  }

  // Copy gif.js worker
  const gifJsPath = resolve(__dirname, 'node_modules/gif.js/dist');
  if (existsSync(resolve(gifJsPath, 'gif.worker.js'))) {
    copyFileSync(
      resolve(gifJsPath, 'gif.worker.js'),
      resolve(workerDir, 'gif.worker.js')
    );
  }

  // Copy pdfjs-dist worker (ensure it's available)
  const pdfjsPath = resolve(__dirname, 'node_modules/pdfjs-dist/build');
  const pdfjsWorkerSource = resolve(pdfjsPath, 'pdf.worker.min.mjs');
  const pdfjsWorkerDest = resolve(workerDir, 'pdf.worker.min.mjs');
  
  if (existsSync(pdfjsWorkerSource)) {
    copyFileSync(pdfjsWorkerSource, pdfjsWorkerDest);
    console.log('PDF.js worker copied to public directory');
  } else {
    console.warn('PDF.js worker source not found at:', pdfjsWorkerSource);
  }

  // Copy FFmpeg core files from ESM build (better compatibility with COEP)
  // The UMD build has internal dynamic imports that fail with COEP
  const ffmpegCorePath = resolve(__dirname, 'node_modules/@ffmpeg/core/dist/esm');
  const ffmpegCoreJsSource = resolve(ffmpegCorePath, 'ffmpeg-core.js');
  const ffmpegCoreWasmSource = resolve(ffmpegCorePath, 'ffmpeg-core.wasm');
  const ffmpegCoreJsDest = resolve(workerDir, 'ffmpeg-core.js');
  const ffmpegCoreWasmDest = resolve(workerDir, 'ffmpeg-core.wasm');
  
  if (existsSync(ffmpegCoreJsSource)) {
    copyFileSync(ffmpegCoreJsSource, ffmpegCoreJsDest);
    console.log('FFmpeg core.js copied to public directory');
  } else {
    console.warn('FFmpeg core.js source not found at:', ffmpegCoreJsSource);
  }
  
  if (existsSync(ffmpegCoreWasmSource)) {
    copyFileSync(ffmpegCoreWasmSource, ffmpegCoreWasmDest);
    console.log('FFmpeg core.wasm copied to public directory');
  } else {
    console.warn('FFmpeg core.wasm source not found at:', ffmpegCoreWasmSource);
  }
  
  // Check for worker file (some FFmpeg versions need this)
  const ffmpegCoreWorkerSource = resolve(ffmpegCorePath, 'ffmpeg-core.worker.js');
  const ffmpegCoreWorkerDest = resolve(workerDir, 'ffmpeg-core.worker.js');
  if (existsSync(ffmpegCoreWorkerSource)) {
    copyFileSync(ffmpegCoreWorkerSource, ffmpegCoreWorkerDest);
    console.log('FFmpeg core.worker.js copied to public directory');
  }
};

// Custom plugin to copy worker files (gif.js, pdfjs-dist, and ffmpeg)
const copyWorkers = () => ({
  name: 'copy-workers',
  buildStart() {
    copyWorkerFiles();
  },
  configureServer(server: any) {
    // Copy files when dev server starts
    copyWorkerFiles();
    
    // Middleware to handle requests
    server.middlewares.use((req: any, res: any, next: any) => {
      // Set cross-origin isolation headers for ALL responses (required for SharedArrayBuffer/FFmpeg WASM)
      // These must be set on the main document and all subresources
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      
      // Set CORS headers for worker files and FFmpeg core files to support COEP
      if (req.url && req.url.includes('/workers/')) {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        // Ensure proper content types for FFmpeg files
        if (req.url.includes('ffmpeg-core.js')) {
          res.setHeader('Content-Type', 'text/javascript');
          // Also set CORP header for COEP compatibility
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        } else if (req.url.includes('ffmpeg-core.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
      }
      
      // Handle PDF.js worker requests - strip ?import query
      if (req.url && req.url.includes('/workers/pdf.worker.min.mjs')) {
        // Remove ?import query parameter that PDF.js adds
        const cleanUrl = req.url.split('?')[0];
        req.url = cleanUrl;
        // Ensure correct content type
        res.setHeader('Content-Type', 'application/javascript');
      }
      
      // Handle FFmpeg core.js requests - ensure it's served correctly for ES module imports
      if (req.url && req.url.includes('/workers/ffmpeg-core.js')) {
        // Remove any query parameters that might interfere with module imports
        const cleanUrl = req.url.split('?')[0];
        req.url = cleanUrl;
        // Ensure correct content type for ES module (must be text/javascript, not application/javascript)
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        // Ensure CORS headers for COEP compatibility
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        // Allow the file to be imported as an ES module
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      // Handle FFmpeg core.wasm requests
      if (req.url && req.url.includes('/workers/ffmpeg-core.wasm')) {
        // Remove any query parameters
        const cleanUrl = req.url.split('?')[0];
        req.url = cleanUrl;
        // Ensure correct content type for WASM
        res.setHeader('Content-Type', 'application/wasm');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      }
      
      next();
    });
  }
});

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
