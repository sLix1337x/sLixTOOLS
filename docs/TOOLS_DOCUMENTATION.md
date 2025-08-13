# Tools Documentation

This document details the tool functionality in sLixTOOLS, focusing on the currently implemented tools and how they work.

## Video to GIF Converter

The primary tool currently implemented in sLixTOOLS.

### Implementation Details

- **Files**: 
  - `src/pages/tools/VideoToGif.tsx` - Main tool page
  - `src/components/FileUpload.tsx` - File upload component
  - `src/components/VideoPreview.tsx` - Video preview component
  - `src/components/ConversionOptions.tsx` - Settings for GIF conversion
  - `src/components/GifPreview.tsx` - Output GIF preview component

### Key Features

1. **File Upload**:
   - Supports drag and drop
   - File type validation for video formats
   - Maximum file size restriction

2. **Video Preview**:
   - Controls for playing, pausing, and seeking
   - Visual feedback of selected portion for conversion

3. **Conversion Options**:
   - Quality settings (high, medium, low)
   - Size adjustments (width/height)
   - Frame rate controls
   - Start/end time selection

4. **GIF Preview**:
   - Real-time preview of generated GIF
   - Download option
   - File information display (size, dimensions)

### Technical Implementation

The conversion process happens entirely client-side using browser APIs:
1. Video is loaded into a video element
2. Canvas is used to capture frames at specified intervals
3. Frames are combined into an animated GIF using the gifjs library
4. Resulting GIF is made available for download

## GIF Compressor

A tool for optimizing the file size of GIF images.

### Implementation Details

- **Files**:
  - `src/pages/tools/GIFCompressor.tsx` - Main tool page
  - Related components that handle file upload and preview

### Key Features

1. **Compression Options**:
   - Quality settings
   - Color reduction
   - Frame optimization
   - Dimension reduction

2. **Size Comparison**:
   - Before/after size visualization
   - Compression ratio display

### Technical Implementation

Compression is performed client-side:
1. GIF is deconstructed into frames
2. Optimization techniques are applied (color quantization, frame skipping)
3. Frames are recompiled into an optimized GIF

## Planned Tools

As outlined in `PLANNED_TOOLS.md`, many more tools are planned for future implementation:

- **OCR Converter**
- **Video Converter**
- **Audio Converter**
- **E-book Converter**
- **Image Converter**
- **Archive Converter**
- **Vector Converter**
- **Document Converter**
- **Video to MP3 Converter**
- **PDF Converter**
- **Image to PDF Converter**
- **Image to Word Converter**
- **Unit Converter**
- **Time Converter**

Each planned tool will follow a similar component structure with tool-specific functionality.

## Tool Development Guidelines

When implementing new tools, follow these patterns:

1. Create a new page in `src/pages/tools/`
2. Reuse existing components where possible (FileUpload, Preview)
3. Create tool-specific components for unique functionality
4. Follow the established UI pattern for consistency
5. Process files client-side for privacy and performance
6. Add appropriate error handling and validation
7. Include download options for processed files
