# sLixTOOLS - Web Application Documentation

## Overview

sLixTOOLS is a modern web application providing free online tools for file conversion and manipulation. The application is built using React with TypeScript and leverages Vite as the build system. All tools operate fully client-side, ensuring user privacy by processing files directly in the browser without server uploads.

## Tech Stack

- **Frontend Framework**: React 18+ with TypeScript
- **Build System**: Vite
- **Styling**: Tailwind CSS
- **Router**: React Router v6
- **UI Components**: Custom components + ShadCN UI
- **Animation Libraries**: 
  - Framer Motion for page and component animations
  - Lenis for smooth scrolling
- **Data Fetching**: React Query
- **Notifications**: Sonner for toast notifications
- **File Processing**: 
  - pdfjs-dist for PDF processing
  - jspdf for PDF generation
  - jszip for archive handling

## Architecture

The application follows a modern React component architecture:

- **App.tsx**: Main application component with routing setup
- **Pages/**: Directory containing page components
  - **Home.tsx**: Landing page with hero section, feature highlights, and tools list
  - **Tools.tsx**: Page displaying all available tools in a grid layout
  - **tools/**: Individual tool components (VideoToGif.tsx, PdfToImage.tsx, etc.)
- **Components/**: Reusable UI components
  - **AnimatedElement**: Wrapper for animated components using Framer Motion
  - **ParticleBackground**: Animated background particles effect
  - **SmoothScroll**: Wrapper using Lenis for smooth scrolling
  - **UI/**: UI component library (buttons, cards, etc.)

## Available Tools

### Fully Implemented Tools
1. **Video to GIF**
   - Convert MP4, WebM, AVI, MPEG, MKV, FLV, OGG, MOV, M4V, WMV, ASF, 3GP and other video files to animated GIFs
   - Control frame rate, quality, and duration

2. **GIF Compressor**
   - Reduce GIF file size while maintaining acceptable quality
   - Control compression settings and output size

3. **PDF to Image**
   - Convert PDF pages to individual JPG or PNG images
   - Control resolution and output format

4. **Image to PDF**
   - Convert multiple images to a single PDF document
   - Set page size and orientation

5. **Image Compressor**
   - Reduce image file size with minimal quality loss
   - Support for various image formats

6. **Image Resizer**
   - Resize images to specific dimensions
   - Maintain aspect ratio option

### Coming Soon Tools
1. **Image Converter**
   - Convert between image formats (PNG, JPG, WebP, etc.)

2. **Video Converter**
   - Convert between video formats

## Key Features

### User Interface
- Modern, responsive design using Tailwind CSS
- Elegant animations and transitions using Framer Motion
- Smooth scrolling with Lenis
- Animated particle background
- Dancing Funky Kong GIF positioned in the bottom left corner
- Consistent tool card design across the application

### User Experience
- Client-side processing for privacy and speed
- Drag and drop file upload functionality
- Real-time preview of conversions where applicable
- Detailed error handling and feedback
- Responsive design for mobile and desktop use

### Performance Optimizations
- Dynamic import of heavy libraries (pdfjs-dist, jspdf) to reduce initial load time
- Optimized canvas rendering for image manipulation
- Progressive loading of UI components
- Lazy loading of tools and routes

## Recent Updates and Fixes

1. **Home Page Redesign**
   - Replaced corrupted Index.tsx with new Home.tsx component
   - Added ParticleBackground for visual appeal
   - Added dancing Funky Kong GIF in bottom left corner
   - Tools displayed in list format matching the Tools page style

2. **PDF Tool Fixes**
   - Fixed blank white screen issue in PDF to JPG and JPG to PDF converter tools
   - Ensured proper dynamic imports of heavy libraries
   - Validated file processing logic and error handling

3. **Navigation Improvements**
   - Re-enabled smooth scrolling via SmoothScroll wrapper component
   - Updated routing to use the new Home component
   - Enhanced navigation between tools

## Deployment Information

The application is configured to run as a static site and can be deployed to any static hosting service. Development server runs on port 3001 by default.

### Development Commands
- `npm run dev`: Start development server
- `npm run build`: Build production-ready assets
- `npm run preview`: Preview production build locally

## Privacy and Security

- All file processing happens locally in the user's browser
- No files are uploaded to external servers
- No user data is collected or stored
- No API keys required for base functionality

## Browser Compatibility

The application is compatible with modern browsers:
- Chrome/Edge (latest versions)
- Firefox (latest versions)
- Safari (latest versions)

## Known Issues

1. The URL for the Funky Kong GIF (`https://i.ibb.co/MkhkkNG6/funkykong.gif`) may have a typo and should be verified.
2. PWA support was attempted but temporarily removed due to configuration issues.

## Future Enhancements

1. Complete implementation of "coming soon" tools
2. Add unit and integration tests for conversion logic
3. Restore PWA support when configuration issues are resolved
4. Add more tools based on user feedback
5. Implement file format detection and automatic tool suggestion

---

*Documentation last updated: June 26, 2025*
