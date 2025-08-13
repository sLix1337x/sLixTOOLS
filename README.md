# sLixTOOLS - Free Online File Conversion Tools

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://slix1337x.github.io/sLixTOOLS/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-646cff)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive collection of free, privacy-focused online tools for file conversion and manipulation. Built with modern web technologies for optimal performance and user experience.

## 📋 Table of Contents

- [Features](#-features)
- [Recent Updates](#-recent-updates)
- [Live Tools](#-live-tools)
- [Technology Stack](#️-technology-stack)
- [Project Architecture](#-project-architecture)
- [Installation & Setup](#-installation--setup)
- [Development Guidelines](#-development-guidelines)
- [Component Documentation](#-component-documentation)
- [API Reference](#-api-reference)
- [Performance Optimization](#-performance-optimization)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## 🌟 Features

### Core Features
- **🎬 Video to GIF Converter** - Convert MP4, WebM, AVI, MPEG, MKV, FLV, OGG, MOV, M4V, WMV, ASF, 3GP and other video files to high-quality GIFs
- **🗜️ GIF Compressor** - Optimize GIF file sizes while maintaining visual quality
- **🖼️ Image Compressor** - Reduce image file sizes with adjustable quality settings
- **📏 Image Resizer** - Resize images with aspect ratio preservation

- **📄 Image to PDF** - Convert multiple images to PDF documents (Coming Soon)
- **🖼️ PDF to Image** - Extract images from PDF files (Coming Soon)

### Technical Features
- **🔒 Privacy First** - All processing happens client-side in your browser
- **⚡ High Performance** - Web Workers for non-blocking file processing
- **📱 Fully Responsive** - Optimized for desktop, tablet, and mobile devices
- **🎨 Modern UI/UX** - Clean design with smooth animations and 3D elements
- **♿ Accessibility** - WCAG compliant with keyboard navigation support
- **🚀 PWA Ready** - Progressive Web App capabilities for offline usage
- **🎭 Advanced Animations** - Framer Motion powered smooth transitions with optimized floating elements
- **🌈 Theme System** - Consistent design system with custom color schemes
- **✨ Floating UI Elements** - Subtle animated icons with controlled movement boundaries
- **🎯 Optimized Layout** - Improved spacing and section organization for better UX

## 🆕 Recent Updates

### Latest Improvements (December 2024)

#### 🐛 Critical Bug Fixes
- **React Router Warnings**: Fixed future flag warnings by adding `v7_startTransition` and `v7_relativeSplatPath` flags
- **GIF Conversion Errors**: Resolved "Already Running" errors by implementing proper `isRendering` flag in gif converter
- **Memory Cache Issues**: Fixed `this.memoryCache.keys is not a function` error by adding proper methods to MemoryAwareCache class
- **404 Route Errors**: Eliminated 404 errors by marking PDF Compressor as "Coming Soon" instead of linking to non-existent route
- **Debug Panel Removal**: Completely removed debug test tool and all related features for cleaner codebase

#### ✨ User Experience Enhancements
- **Video to GIF Default Settings**: End time now defaults to 5 seconds (or video duration if shorter) for better user experience
- **Navigation Improvements**: "Get Started Now" button now properly links to tools page instead of specific tool
- **Error Handling**: Enhanced error logging and user feedback throughout the application
- **Performance Optimization**: Improved memory management and cleanup processes

#### 🎯 Layout & Design Improvements
- **Floating Animation Optimization**: Reduced floating animation from `-10px` to `-3px` for subtle, controlled motion
- **Improved positioning**: Adjusted floating elements from `-4` to `-2` margin classes to prevent overflow
- **Enhanced boundaries**: Floating icons (scissors, sparkles) now stay within container bounds
- **Better performance**: Optimized animation timing and reduced visual distraction
- **Section independence**: Moved "All Tools" section out of main container for better layout control
- **Typography enhancement**: Increased heading font sizes (`text-4xl md:text-5xl lg:text-6xl`)
- **Cleaner design**: Removed unnecessary backgrounds and improved visual hierarchy

#### 🔧 Technical Enhancements
- **Advanced Caching System**: Implemented sophisticated memory-aware caching with automatic cleanup
- **Error Logging**: Comprehensive error tracking and categorization system
- **Memory Management**: Enhanced memory cleanup and garbage collection
- **Code Organization**: Improved component structure and maintainability
- **CSS optimization**: Streamlined floating keyframe animations
- **Responsive improvements**: Better mobile and tablet layout handling

### Animation System Updates
- **Floating elements**: Scissors and sparkles icons with controlled 3px vertical movement
- **Timing optimization**: Staggered animation delays (1s offset) for visual interest
- **Boundary respect**: Elements positioned to stay within visual containers
- **Smooth transitions**: Enhanced Framer Motion integration for seamless user experience

## 🛠️ Live Tools

### Currently Available
1. **[Video to GIF Converter](https://slix1337x.github.io/sLixTOOLS/#/tools/video-to-gif)**
   - Supports MP4, WebM, AVI, MPEG, MKV, FLV, OGG, MOV, M4V, WMV, ASF, 3GP and other video formats
   - Customizable FPS (1-30)
   - Quality settings (1-100)
   - Trim functionality with start/end time selection (defaults to 5 seconds)
   - Real-time preview with metadata extraction
   - Advanced error handling and validation
   - Maximum file size: 500MB

2. **[GIF Compressor](https://slix1337x.github.io/sLixTOOLS/#/tools/gif-compressor)**
   - Lossless and lossy compression options
   - Quality adjustment slider
   - Before/after comparison
   - Batch processing support

3. **[Image Compressor](https://slix1337x.github.io/sLixTOOLS/#/tools/image-compressor)**
   - Supports JPEG, PNG, WebP, GIF formats
   - Quality control (1-100)
   - Real-time size comparison
   - Maintains EXIF data option

4. **[Image Resizer](https://slix1337x.github.io/sLixTOOLS/#/tools/image-resizer)**
   - Supports all major image formats
   - Aspect ratio preservation
   - Custom width/height input
   - Percentage-based scaling
   - Maximum file size: 200MB

### Coming Soon
- **PDF Compressor** - Optimize PDF file sizes
- **Image to PDF Converter** - Convert multiple images to PDF documents
- **PDF to Image Extractor** - Extract images from PDF files
- **Video Compressor** - Reduce video file sizes
- **Batch File Processor** - Process multiple files simultaneously
- **Audio Converter** - Convert between audio formats

## 🏗️ Technology Stack

### Frontend Framework
- **⚛️ React 18.3.1** - Component-based UI library with concurrent features
- **🟦 TypeScript 5.5.3** - Type-safe JavaScript with advanced type checking
- **⚡ Vite 5.4.1** - Next-generation frontend build tool

### UI & Styling
- **🎨 Tailwind CSS 3.4.11** - Utility-first CSS framework
- **🎭 Framer Motion 12.18.1** - Production-ready motion library
- **🎨 shadcn/ui** - Beautifully designed component library
- **🎨 Radix UI** - Low-level UI primitives for accessibility

### 3D Graphics & Animation
- **🌐 Three.js (React Three Fiber)** - 3D graphics rendering
- **🔄 Lenis 1.3.4** - Smooth scroll implementation
- **✨ Custom Particle System** - Interactive background animations

### File Processing
- **🎬 gif.js 0.2.0** - Client-side GIF creation and manipulation
- **📁 file-saver 2.0.5** - File download functionality
- **🗜️ JSZip 3.10.1** - ZIP file creation and extraction
- **📄 jsPDF 2.5.1** - PDF generation
- **📄 PDF.js 3.4.120** - PDF parsing and rendering

### State Management & Routing
- **🔄 TanStack Query 5.56.2** - Server state management
- **🛣️ React Router DOM 6.26.2** - Client-side routing
- **🌐 React Helmet Async 2.0.5** - Document head management

### Development Tools
- **📏 ESLint 9.9.0** - Code linting and formatting
- **🎯 TypeScript ESLint 8.0.1** - TypeScript-specific linting rules
- **🎨 Prettier** - Code formatting
- **🚀 GitHub Actions** - CI/CD pipeline

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (or **yarn** 1.22.0+)
- Modern web browser with ES2020+ support

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/slix1337x/sLixTOOLS.git
   cd sLixTOOLS
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run type-check   # Run TypeScript type checking

# Deployment
npm run deploy       # Deploy to GitHub Pages
```

## 🏗️ Project Architecture

### Directory Structure

```
sLixTOOLS/
├── public/                     # Static assets
│   ├── icons/                  # App icons and favicons
│   ├── gif.worker.js          # GIF processing web worker
│   └── manifest.json          # PWA manifest
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # shadcn/ui components
│   │   │   ├── button.tsx    # Button component with variants
│   │   │   ├── card.tsx      # Card layout component
│   │   │   ├── input.tsx     # Form input component
│   │   │   └── ...           # Other UI primitives
│   │   ├── AnimatedElement.tsx    # Framer Motion wrapper
│   │   ├── FileUpload.tsx         # Drag & drop file upload
│   │   ├── MainNav.tsx            # Navigation component
│   │   ├── ParticleBackground.tsx # Animated background
│   │   ├── SmoothScroll.tsx       # Lenis scroll wrapper
│   │   └── ThreeDScene.tsx        # Three.js 3D elements
│   ├── pages/                 # Page components
│   │   ├── tools/            # Tool-specific pages
│   │   │   ├── VideoToGif.tsx     # Video to GIF converter
│   │   │   ├── GifCompressor.tsx  # GIF compression tool
│   │   │   ├── ImageCompressor.tsx # Image compression
│   │   │   └── ImageResizer.tsx   # Image resizing tool
│   │   ├── About.tsx         # About page
│   │   ├── Contact.tsx       # Contact information
│   │   ├── Home.tsx          # Landing page
│   │   ├── NotFound.tsx      # 404 error page
│   │   └── PrivacyPolicy.tsx # Privacy policy
│   ├── lib/                  # Core utilities and configurations
│   │   ├── gifConverter.ts   # GIF conversion logic
│   │   ├── performance.ts    # Performance monitoring
│   │   ├── utils.ts          # General utilities
│   │   └── validation.ts     # File validation
│   ├── hooks/                # Custom React hooks
│   │   └── useLocalStorage.ts # Local storage hook
│   ├── styles/               # Styling and themes
│   │   ├── globals.css       # Global CSS variables
│   │   ├── indie-theme.css   # Custom theme styles
│   │   └── index.css         # Tailwind imports
│   ├── types/                # TypeScript definitions
│   │   └── index.ts          # Global type definitions
│   ├── config/               # Application configuration
│   │   └── index.ts          # Environment variables
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── vite-env.d.ts        # Vite type definitions
├── docs/                    # Project documentation
│   ├── PROJECT_ARCHITECTURE.md
│   ├── TOOLS_DOCUMENTATION.md
│   ├── KEY_COMPONENTS.md
│   └── SPECIAL_FEATURES.md
├── .github/                 # GitHub configuration
│   └── workflows/           # CI/CD workflows
├── dist/                    # Production build output
├── node_modules/            # Dependencies
├── .gitignore              # Git ignore rules
├── eslint.config.js        # ESLint configuration
├── index.html              # HTML template
├── package.json            # Project dependencies
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── README.md               # This file
```

### Application Flow

1. **Entry Point** (`main.tsx`)
   - Initializes React application
   - Sets up providers and global configurations
   - Renders root App component

2. **App Component** (`App.tsx`)
   - Configures routing with React Router
   - Wraps application in providers:
     - `QueryClientProvider` (TanStack Query)
     - `HelmetProvider` (SEO management)
     - `TooltipProvider` (UI tooltips)
     - `LanguageProvider` (i18n)
   - Implements `HashRouter` for GitHub Pages compatibility

3. **Page Routing**
   - `/` - Home page with tool overview
   - `/tools/*` - Individual tool pages
   - `/about` - About page
   - `/contact` - Contact information
   - `/privacy-policy` - Privacy policy
   - `*` - 404 Not Found page

4. **Component Hierarchy**
   ```
   App
   ├── SmoothScroll (Lenis wrapper)
   ├── ParticleBackground (Animated background)
   ├── MainNav (Navigation)
   ├── Routes (Page content)
   └── Footer (Site footer)
   ```

## 🛠️ Development Guidelines

### Code Style & Standards

#### TypeScript Guidelines
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Avoid `any` type - use proper typing
- Use generic types for reusable components
- Export types from `src/types/index.ts`

```typescript
// ✅ Good
interface ConversionOptions {
  fps: number;
  quality: number;
  width?: number;
  height?: number;
  startTime?: number;
  endTime?: number;
}

// ❌ Avoid
const options: any = { fps: 30, quality: 80 };
```

#### React Component Guidelines
- Use functional components with hooks
- Implement proper prop typing
- Use `React.memo()` for performance optimization
- Follow naming conventions: PascalCase for components

```typescript
// ✅ Component structure
interface ComponentProps {
  title: string;
  onAction: (data: string) => void;
  isLoading?: boolean;
}

const Component = React.memo<ComponentProps>(({ title, onAction, isLoading = false }) => {
  // Component logic
  return (
    <div className="component-wrapper">
      {/* JSX content */}
    </div>
  );
});

Component.displayName = 'Component';
export default Component;
```

#### Styling Guidelines
- Use Tailwind CSS utility classes
- Create custom CSS only when necessary
- Follow mobile-first responsive design
- Use CSS variables for theme consistency

```typescript
// ✅ Tailwind classes
<div className="flex items-center justify-between p-4 bg-card rounded-lg border">
  <h2 className="text-lg font-semibold text-foreground">Title</h2>
  <Button variant="outline" size="sm">Action</Button>
</div>
```

### File Organization

#### Component Files
- One component per file
- Co-locate related components in subdirectories
- Use index files for clean imports

#### Utility Functions
- Group related utilities in single files
- Export individual functions, not default exports
- Add JSDoc comments for complex functions

```typescript
/**
 * Converts video file to GIF with specified options
 * @param videoFile - Input video file
 * @param options - Conversion parameters
 * @returns Promise resolving to GIF blob
 */
export const convertVideoToGif = async (
  videoFile: File,
  options: ConversionOptions
): Promise<Blob> => {
  // Implementation
};
```

### Performance Best Practices

#### Code Splitting
- Use React.lazy() for route-based splitting
- Implement Suspense boundaries
- Lazy load heavy dependencies

```typescript
// Route-based code splitting
const VideoToGif = React.lazy(() => import('./pages/tools/VideoToGif'));
const GifCompressor = React.lazy(() => import('./pages/tools/GifCompressor'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/tools/video-to-gif" element={<VideoToGif />} />
    <Route path="/tools/gif-compressor" element={<GifCompressor />} />
  </Routes>
</Suspense>
```

#### Memory Management
- Clean up event listeners in useEffect
- Revoke object URLs after use
- Use AbortController for cancellable requests

```typescript
useEffect(() => {
  const controller = new AbortController();
  
  const handleResize = () => {
    // Handle resize
  };
  
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
    controller.abort();
  };
}, []);
```

#### Web Workers
- Use Web Workers for CPU-intensive tasks
- Implement proper error handling
- Clean up worker instances

```typescript
// Web Worker usage
const worker = new Worker('/gif.worker.js');

worker.postMessage({ type: 'CONVERT', data: videoData });

worker.onmessage = (event) => {
  const { type, data } = event.data;
  if (type === 'PROGRESS') {
    setProgress(data.progress);
  } else if (type === 'COMPLETE') {
    setResult(data.gif);
    worker.terminate();
  }
};

worker.onerror = (error) => {
  console.error('Worker error:', error);
  worker.terminate();
};
```

## 📚 Component Documentation

### Core Components

#### FileUpload Component
**Location:** `src/components/FileUpload.tsx`

**Purpose:** Handles file selection with drag-and-drop functionality

**Props:**
```typescript
interface FileUploadProps {
  accept: string;                    // File types to accept
  maxSize: number;                   // Maximum file size in bytes
  onFileSelect: (file: File) => void; // Callback when file is selected
  multiple?: boolean;                // Allow multiple files
  disabled?: boolean;                // Disable upload
  className?: string;                // Additional CSS classes
}
```

**Features:**
- Drag and drop file selection
- File type validation
- File size validation
- Visual feedback for drag states
- Error handling and user feedback

**Usage:**
```typescript
<FileUpload
  accept="video/*"
  maxSize={MAX_FILE_SIZE}
  onFileSelect={handleFileSelect}
  disabled={isProcessing}
/>
```

#### AnimatedElement Component
**Location:** `src/components/AnimatedElement.tsx`

**Purpose:** Wrapper for Framer Motion animations

**Props:**
```typescript
interface AnimatedElementProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn';
  delay?: number;
  duration?: number;
  className?: string;
}
```

**Animations:**
- `fadeIn` - Opacity transition
- `slideUp` - Slide from bottom
- `slideDown` - Slide from top
- `scaleIn` - Scale from 0 to 1

**Usage:**
```typescript
<AnimatedElement animation="fadeIn" delay={0.2}>
  <Card>Content</Card>
</AnimatedElement>
```

#### MainNav Component
**Location:** `src/components/MainNav.tsx`

**Purpose:** Main navigation with responsive design

**Features:**
- Responsive hamburger menu
- Tools dropdown with categories
- Rainbow hover effects
- Smooth transitions

**State Management:**
```typescript
const [isToolsOpen, setIsToolsOpen] = useState(false);
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
```

#### ParticleBackground Component
**Location:** `src/components/ParticleBackground.tsx`

**Purpose:** Animated particle background

**Features:**
- CSS-based particle animation
- Responsive particle count
- Performance optimized
- Customizable colors and sizes

**CSS Classes:**
- `.particle` - Individual particle styling
- `.particle-float` - Animation keyframes
- `.rainbow-hover` - Color transition effects

### Tool Components

#### VideoToGif Component
**Location:** `src/pages/tools/VideoToGif.tsx`

**Purpose:** Convert video files to GIF format

**State Management:**
```typescript
const [videoFile, setVideoFile] = useState<File | null>(null);
const [gifResult, setGifResult] = useState<Blob | null>(null);
const [isConverting, setIsConverting] = useState(false);
const [progress, setProgress] = useState(0);
const [options, setOptions] = useState<ConversionOptions>({
  fps: 15,
  quality: 80,
  width: undefined,
  height: undefined,
  startTime: 0,
  endTime: undefined
});
```

**Key Features:**
- Video file validation
- Real-time preview
- Conversion options panel
- Progress tracking
- Result download

**Sub-components:**
- `VideoPreview` - Video playback and trimming
- `ConversionOptions` - Settings panel
- `GifPreview` - Result display and download

#### GifCompressor Component
**Location:** `src/pages/tools/GifCompressor.tsx`

**Purpose:** Compress GIF files to reduce size

**Features:**
- GIF file validation
- Quality adjustment
- Before/after comparison
- Compression statistics
- Batch processing support

**Compression Algorithm:**
```typescript
const compressGif = async (file: File, quality: number): Promise<Blob> => {
  // Load GIF frames
  const frames = await extractFrames(file);
  
  // Apply compression
  const compressedFrames = frames.map(frame => 
    compressFrame(frame, quality)
  );
  
  // Rebuild GIF
  return createGif(compressedFrames);
};
```

### Utility Functions

#### gifConverter.ts
**Location:** `src/lib/gifConverter.ts`

**Main Function:** `convertVideoToGif`

```typescript
export const convertVideoToGif = async (
  videoFile: File,
  options: ConversionOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const {
    fps = 15,
    quality = 80,
    width,
    height,
    startTime = 0,
    endTime
  } = options;

  // Create video element
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Load video
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = reject;
    video.src = URL.createObjectURL(videoFile);
  });

  // Set canvas dimensions
  const videoWidth = width || video.videoWidth;
  const videoHeight = height || video.videoHeight;
  canvas.width = videoWidth;
  canvas.height = videoHeight;

  // Initialize GIF encoder
  const gif = new GIF({
    workers: 2,
    quality: Math.round((100 - quality) / 10),
    width: videoWidth,
    height: videoHeight,
    workerScript: '/gif.worker.js'
  });

  // Calculate frame timing
  const duration = (endTime || video.duration) - startTime;
  const frameCount = Math.floor(duration * fps);
  const frameInterval = 1 / fps;

  // Extract frames
  for (let i = 0; i < frameCount; i++) {
    const time = startTime + (i * frameInterval);
    video.currentTime = time;
    
    await new Promise(resolve => {
      video.onseeked = resolve;
    });

    // Draw frame to canvas
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    
    // Add frame to GIF
    gif.addFrame(canvas, {
      delay: Math.round(1000 / fps),
      copy: true
    });

    // Report progress
    if (onProgress) {
      onProgress((i + 1) / frameCount * 100);
    }
  }

  // Render GIF
  return new Promise((resolve, reject) => {
    gif.on('finished', resolve);
    gif.on('error', reject);
    gif.render();
  });
};
```

**Key Features:**
- Video metadata extraction
- Frame-by-frame processing
- Canvas-based rendering
- Progress tracking
- Memory management

#### validation.ts
**Location:** `src/lib/validation.ts`

**Functions:**

```typescript
// Video file validation
export const validateVideoFile = (file: File): ValidationResult => {
  const errors: string[] = [];
  
  // Check file type
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    errors.push(`Unsupported file type: ${file.type}`);
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large: ${formatFileSize(file.size)} > ${formatFileSize(MAX_FILE_SIZE)}`);
  }
  
  // Check filename
  if (hasInvalidCharacters(file.name)) {
    errors.push('Filename contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Image file validation
export const validateImageFile = (file: File): ValidationResult => {
  const errors: string[] = [];
  
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errors.push(`Unsupported image type: ${file.type}`);
  }
  
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large: ${formatFileSize(file.size)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper functions
const hasInvalidCharacters = (filename: string): boolean => {
  const invalidChars = /[<>:"/\\|?*]/;
  return invalidChars.test(filename);
};

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};
```

#### performance.ts
**Location:** `src/lib/performance.ts`

**PerformanceMonitor Class:**

```typescript
export class PerformanceMonitor {
  private startTimes: Map<string, number> = new Map();
  private metrics: Map<string, number[]> = new Map();

  start(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  end(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(operation);

    // Store metric
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`${operation}: ${duration.toFixed(2)}ms`);
    }

    // Send to analytics (placeholder)
    this.sendToAnalytics(operation, duration);

    return duration;
  }

  getMetrics(operation: string): PerformanceMetrics {
    const durations = this.metrics.get(operation) || [];
    
    if (durations.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0 };
    }

    const sum = durations.reduce((a, b) => a + b, 0);
    const average = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return { count: durations.length, average, min, max };
  }

  private sendToAnalytics(operation: string, duration: number): void {
    // Placeholder for analytics integration
    // Could send to Google Analytics, Mixpanel, etc.
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();
```

**Usage:**
```typescript
// Start timing
performanceMonitor.start('gif-conversion');

// Perform operation
const result = await convertVideoToGif(file, options);

// End timing
performanceMonitor.end('gif-conversion');

// Get metrics
const metrics = performanceMonitor.getMetrics('gif-conversion');
console.log(`Average conversion time: ${metrics.average.toFixed(2)}ms`);
```



## 🎯 API Reference

### Configuration (src/config/index.ts)

```typescript
// Application settings
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'sLixTOOLS';
export const APP_DESCRIPTION = import.meta.env.VITE_APP_DESCRIPTION || 'Free Online File Conversion Tools';

// File upload limits
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// GIF conversion settings
export const DEFAULT_GIF_FPS = 15;
export const DEFAULT_GIF_QUALITY = 80;
export const MAX_GIF_DURATION = 30; // seconds
export const GIF_WORKER_PATH = '/gif.worker.js';

// Feature flags
export const ENABLE_3D_SCENE = import.meta.env.VITE_ENABLE_3D_SCENE === 'true';
export const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
export const DEBUG_MODE = import.meta.env.DEV;
```

### Type Definitions (src/types/index.ts)

```typescript
// File conversion options
export interface ConversionOptions {
  fps: number;
  quality: number;
  width?: number;
  height?: number;
  startTime?: number;
  endTime?: number;
}

// Video file information
export interface VideoFile {
  file: File;
  duration: number;
  width: number;
  height: number;
  url: string;
}

// GIF conversion result
export interface GifResult {
  blob: Blob;
  size: number;
  url: string;
  duration: number;
}

// Tool item for navigation
export interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType;
  path: string;
  comingSoon?: boolean;
  category: 'video' | 'image' | 'audio' | 'document';
}

// Component props
export interface VideoPreviewProps {
  file: File;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (duration: number) => void;
}

export interface GifPreviewProps {
  blob: Blob;
  originalSize: number;
  onDownload?: () => void;
}

export interface ConversionOptionsProps {
  options: ConversionOptions;
  onChange: (options: ConversionOptions) => void;
  videoDuration?: number;
  disabled?: boolean;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Performance metrics
export interface PerformanceMetrics {
  count: number;
  average: number;
  min: number;
  max: number;
}
```

### Custom Hooks

#### useLocalStorage
**Location:** `src/hooks/useLocalStorage.ts`

```typescript
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] => {
  // Get initial value from localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when state changes
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};
```

**Usage:**
```typescript
const [settings, setSettings] = useLocalStorage('conversion-settings', {
  fps: 15,
  quality: 80
});
```

## ⚡ Performance Optimization

### Bundle Optimization

#### Code Splitting Strategy
1. **Route-based splitting** - Each tool page is lazy-loaded
2. **Component-based splitting** - Heavy components are dynamically imported
3. **Library splitting** - Large dependencies are separated into chunks

#### Vite Configuration
**Location:** `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['framer-motion', '@radix-ui/react-tooltip'],
          gif: ['gif.js'],
          utils: ['file-saver', 'jszip']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['gif.js', 'file-saver']
  }
});
```

### Runtime Performance

#### Memory Management
- **Object URL cleanup** - Revoke URLs after use
- **Canvas cleanup** - Clear canvas contexts
- **Worker termination** - Terminate workers after completion

```typescript
// Proper cleanup example
const processFile = async (file: File) => {
  const url = URL.createObjectURL(file);
  
  try {
    // Process file
    const result = await convertFile(url);
    return result;
  } finally {
    // Always cleanup
    URL.revokeObjectURL(url);
  }
};
```

#### Web Worker Usage
- **GIF processing** - Offloaded to dedicated worker
- **Image processing** - Canvas operations in worker
- **File parsing** - Large file operations in worker

### Caching Strategy

#### Browser Caching
- **Static assets** - Long-term caching with versioning
- **API responses** - TanStack Query with stale-while-revalidate
- **User preferences** - localStorage persistence

#### Service Worker
- **Offline support** - Cache critical resources
- **Background sync** - Queue operations when offline
- **Update notifications** - Prompt for app updates

## 🚀 Deployment

### GitHub Pages Deployment

#### Automatic Deployment
**Location:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

#### Manual Deployment
```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

### Environment Variables

#### Development (.env.local)
```env
VITE_APP_NAME=sLixTOOLS
VITE_APP_DESCRIPTION=Free Online File Conversion Tools
VITE_ENABLE_3D_SCENE=true
VITE_ENABLE_ANALYTICS=false
```

#### Production (.env.production)
```env
VITE_APP_NAME=sLixTOOLS
VITE_APP_DESCRIPTION=Free Online File Conversion Tools
VITE_ENABLE_3D_SCENE=true
VITE_ENABLE_ANALYTICS=true
```

### Build Optimization

#### Production Build
```bash
# Clean build
rm -rf dist
npm run build

# Analyze bundle
npx vite-bundle-analyzer dist

# Test production build locally
npm run preview
```

#### Performance Monitoring
```bash
# Lighthouse CI
npx lighthouse-ci autorun

# Bundle analyzer
npx webpack-bundle-analyzer dist

# Performance budget
npm run build -- --analyze
```

## 🧪 Testing Guidelines

### Testing Strategy

#### Unit Tests
- **Utility functions** - Test all edge cases
- **Custom hooks** - Test state changes and side effects
- **Components** - Test rendering and user interactions

#### Integration Tests
- **File processing** - Test complete conversion workflows
- **User flows** - Test multi-step processes
- **Error handling** - Test error states and recovery

#### E2E Tests
- **Critical paths** - Test main user journeys
- **Cross-browser** - Test on different browsers
- **Performance** - Test loading times and responsiveness

### Test Setup (Future Implementation)

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true
  }
});

// Example test
import { render, screen } from '@testing-library/react';
import { VideoToGif } from '../pages/tools/VideoToGif';

describe('VideoToGif', () => {
  it('renders upload area', () => {
    render(<VideoToGif />);
    expect(screen.getByText('Upload Video')).toBeInTheDocument();
  });
  
  it('validates file type', async () => {
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    // Test file validation
  });
});
```

## 🔧 Troubleshooting

### Common Issues

#### Build Issues

**Problem:** `Module not found` errors
```bash
# Solution: Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem:** TypeScript compilation errors
```bash
# Solution: Check TypeScript configuration
npx tsc --noEmit
```

#### Runtime Issues

**Problem:** GIF conversion fails
- Check file size limits
- Verify video format support
- Check browser compatibility

**Problem:** Memory issues with large files
- Implement file size validation
- Use streaming for large files
- Add progress indicators

#### Performance Issues

**Problem:** Slow initial load
- Implement code splitting
- Optimize bundle size
- Use lazy loading

**Problem:** UI freezing during conversion
- Move processing to Web Workers
- Add progress feedback
- Implement cancellation

### Debug Mode

```typescript
// Enable debug logging
if (import.meta.env.DEV) {
  console.log('Debug mode enabled');
  window.DEBUG = true;
}

// Performance monitoring
if (window.DEBUG) {
  performanceMonitor.start('operation');
  // ... operation
  performanceMonitor.end('operation');
}
```

## 🎨 Styling & Theme Configuration

### Critical Styling Files

**⚠️ IMPORTANT: The following styling configuration is essential for the proper functioning of text effects. Do NOT modify without understanding the implications.**

#### indie-theme.css Import

**Location:** `src/App.tsx` (Line 44)
```typescript
// Styles
import "./styles/indie-theme.css"; // ⚠️ CRITICAL: Do NOT comment out or remove
import "./App.css";
```

**Purpose:** This import enables the glitch text effect for all headings (h1-h6) throughout the application.

#### Glitch Effect Configuration

**File:** `src/styles/indie-theme.css`

```css
/* Glitch Animation - Applied to all headings */
@keyframes glitch {
  0%, 100% {
    text-shadow: 
      2px 2px 0 #00ffff,
      -2px -2px 0 #ff00ff;
  }
  25% {
    text-shadow: 
      -2px 2px 0 #00ffff,
      2px -2px 0 #ff00ff;
  }
  50% {
    text-shadow: 
      2px -2px 0 #00ffff,
      -2px 2px 0 #ff00ff;
  }
  75% {
    text-shadow: 
      -2px -2px 0 #00ffff,
      2px 2px 0 #ff00ff;
  }
}

/* Applied to all heading elements */
h1, h2, h3, h4, h5, h6 {
  animation: glitch 2s infinite;
}
```

**Colors Used:**
- `#00ffff` (Cyan) - Primary glitch shadow
- `#ff00ff` (Magenta) - Secondary glitch shadow

### Troubleshooting Common Issues

#### "Yellow Text Effect" Problem

**Symptom:** Text appears to have a yellow-like overlay or shadow effect.

**Root Cause:** When the cyan (`#00ffff`) and magenta (`#ff00ff`) text shadows overlap or render incorrectly, they can create a yellow-like appearance.

**Solution:** Ensure `indie-theme.css` is properly imported in `App.tsx`:

```typescript
// ✅ CORRECT - Keep this import active
import "./styles/indie-theme.css";

// ❌ WRONG - Never comment out or remove
// import "./styles/indie-theme.css";
```

#### Prevention Guidelines

1. **Never remove or comment out** the `indie-theme.css` import in `App.tsx`
2. **Do not modify** the glitch animation colors without testing thoroughly
3. **Test on multiple browsers** when making any changes to text effects
4. **Document any changes** to styling files in this README section

### Funky Kong Image Configuration

**Location:** `src/pages/Home.tsx`

```jsx
<img
  src="/assets/funky-kong.png"
  alt="Funky Kong"
  className="absolute -top-8 -right-4 w-28 h-28 z-10"
/>
```

**Current Settings:**
- **Position:** `absolute -top-8 -right-4` (32px up, 16px right from container edge)
- **Size:** `w-28 h-28` (112px × 112px)
- **Z-index:** `z-10` (appears above other elements)
- **Container:** Positioned relative to the "Privacy First" feature card

**Modification Guidelines:**
- Use Tailwind CSS classes for consistency
- Test positioning on different screen sizes
- Maintain z-index hierarchy

### Animation System

**Framework:** Framer Motion
**Key Components:**
- `AnimatedElement.tsx` - Wrapper for scroll-triggered animations
- Stagger animations for tool grids
- Smooth page transitions

### Color Scheme

**Primary Colors:**
- Background: Dark theme with gradients
- Accent: Cyan (`#00ffff`) and Magenta (`#ff00ff`)
- Text: White with glitch effects on headings

**Consistency Rules:**
- Use CSS custom properties for theme colors
- Maintain contrast ratios for accessibility
- Test color combinations across different devices

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/new-tool
   ```
3. **Make changes following guidelines**
4. **Test thoroughly**
5. **Submit pull request**

### Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] Components are properly typed
- [ ] Performance considerations addressed
- [ ] Accessibility guidelines followed
- [ ] Mobile responsiveness tested
- [ ] Error handling implemented
- [ ] Documentation updated

### Adding New Tools

1. **Create tool page** in `src/pages/tools/`
2. **Add route** in `App.tsx`
3. **Update navigation** in `MainNav.tsx`
4. **Update documentation**

### Release Process

1. **Update version** in `package.json`
2. **Update CHANGELOG.md**
3. **Create release tag**
4. **Deploy to production**
5. **Monitor for issues**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary

- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ❌ Liability
- ❌ Warranty

## 🙏 Acknowledgments

- **React Team** - For the amazing React framework
- **Vite Team** - For the lightning-fast build tool
- **shadcn** - For the beautiful UI components
- **Tailwind CSS** - For the utility-first CSS framework
- **gif.js** - For client-side GIF creation
- **Framer Motion** - For smooth animations
- **Three.js** - For 3D graphics capabilities

## 📞 Support

- **GitHub Issues** - [Report bugs or request features](https://github.com/slix1337x/sLixTOOLS/issues)
- **Discussions** - [Community discussions](https://github.com/slix1337x/sLixTOOLS/discussions)
- **Email** - [Contact the maintainer](mailto:support@slixtools.com)

---

**Built with ❤️ by the sLixTOOLS team**

*Last updated: December 2024*
