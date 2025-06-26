# Special Features & UI Elements

This document highlights unique UI elements and special features that should be preserved during code cleanup or refactoring.

## Dancing GIF Element

### Description
A key visual element that appears in the left bottom corner of the sLixTOOLS section.

### Implementation Details
- **Position**: `-left-[116px] -bottom-[90px]`
- **Size**: `max-w-[180px] md:max-w-[240px]`
- **Location**: Used in hero sections and main landing page

### Importance
This element is a signature part of the site's branding and should be preserved across any refactoring.

## 3D Elements

### ThreeDScene Component
A 3D cube animation created with Three.js (via React Three Fiber) that adds depth and modern feel to the interface.

### Implementation Details
- **File**: `src/components/ThreeDScene.tsx`
- **Usage**: Home page and specific tool pages
- **Dependencies**: `@react-three/fiber`, `@react-three/drei`

## Animation System

### Description
The application uses a comprehensive animation system powered by Framer Motion for smooth transitions and visual effects.

### Key Components
- `AnimatedElement.tsx`: Reusable animation wrapper (fadeIn, slideUp, slideIn, scale, bounce)
- `SmoothScroll.tsx`: Lenis-powered smooth scrolling implementation

### Implementation Notes
Animations are designed to be performance-optimized and work across devices. The animation timing and easing functions are carefully tuned.

## Responsive Design Elements

### Key Breakpoints
- Mobile: Up to 640px
- Tablet: 641px to 1024px
- Desktop: 1025px and above

### Special Considerations
- Custom element sizing and positioning for mobile views
- Different navigation behavior on smaller screens
- Specialized layout for tool interfaces on touch devices

## PWA Support

### Status
PWA support was partially implemented but temporarily removed due to configuration issues.

### Files to Preserve
Any service worker configurations and PWA manifest files should be preserved for future implementation.

## Particle Background

### Description
An ambient animated background with floating particles that adds depth to the UI.

### Implementation Details
- **File**: `src/components/ParticleBackground.tsx`
- **Usage**: Home page and specific sections
- **Performance**: Optimized for different devices

## Tailwind Custom Configurations

### Description
Custom Tailwind configurations that enable the unique visual style of the application.

### File
`tailwind.config.ts`

### Important Customizations
- Custom color scheme
- Extended animation classes
- Special sizing and positioning utilities
- Custom plugins
