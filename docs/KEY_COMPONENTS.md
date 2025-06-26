# Key Components

This document details the important custom components in the sLixTOOLS application. These components provide core functionality and should be preserved during code cleanup.

## Animation Components

### AnimatedElement

Located at: `src/components/AnimatedElement.tsx`

A reusable animation wrapper component built with Framer Motion that provides various animation types:
- `fadeIn`: Simple opacity transition
- `slideUp`: Combines opacity with vertical movement
- `slideIn`: Combines opacity with horizontal movement
- `scale`: Scaling animation with opacity
- `bounce`: Spring-based bouncy animation

Usage:
```tsx
<AnimatedElement type="fadeIn" delay={0.2} className="my-class">
  <p>Content to animate</p>
</AnimatedElement>
```

### SmoothScroll

Located at: `src/components/SmoothScroll.tsx`

Wrapper component that implements smooth scrolling using the Lenis library. Wraps the entire application to provide a consistent smooth scrolling experience.

Usage:
```tsx
<SmoothScroll>
  <App />
</SmoothScroll>
```

## 3D Graphics

### ThreeDScene

Located at: `src/components/ThreeDScene.tsx`

A component that renders a 3D scene using Three.js (via React Three Fiber). Currently implements an animated 3D cube with customizable properties.

Usage:
```tsx
<ThreeDScene />
```

## Core UI Components

### FileUpload

Located at: `src/components/FileUpload.tsx`

Handles file uploads with drag-and-drop support and validation. Used primarily in the GIF conversion tool.

### VideoPreview

Located at: `src/components/VideoPreview.tsx`

Provides video playback with controls for the uploaded videos before conversion.

### GifPreview

Located at: `src/components/GifPreview.tsx`

Displays the converted GIF with options to download and adjust settings.

### ConversionOptions

Located at: `src/components/ConversionOptions.tsx`

Provides user interface for adjusting GIF conversion settings like quality, size, and frame rate.

### MainNav

Located at: `src/components/MainNav.tsx`

The main navigation component with dropdown menus for all tools and links.

### ParticleBackground

Located at: `src/components/ParticleBackground.tsx`

Creates an animated particle effect background used on some pages for visual interest.

## Special Design Elements

### Dancing GIF

A special animated GIF positioned in the left bottom corner of the sLixTOOLS section with the following properties:
- Size: max-w-[180px] md:max-w-[240px]
- Position: -left-[116px] -bottom-[90px]

This is a key visual element of the site and should be preserved during refactoring.
