# sLixTOOLS Documentation Index

This document serves as a central reference to all documentation files for the sLixTOOLS project. Use this index to quickly locate information about different aspects of the project.

## Core Documentation

1. **[Project Architecture](./PROJECT_ARCHITECTURE.md)**
   - Overview of the project structure
   - Directory organization
   - Tech stack and application flow

2. **[Key Components](./KEY_COMPONENTS.md)**
   - Detailed information about critical custom components
   - Usage examples and implementation notes
   - Component dependencies

3. **[Styling Guide](./STYLING_GUIDE.md)**
   - Color schemes and typography
   - UI element styling patterns
   - Animation and transition systems
   - Responsive design approach

4. **[Tools Documentation](./TOOLS_DOCUMENTATION.md)**
   - Current and planned tool implementations
   - Tool-specific components and features
   - Development guidelines for new tools

5. **[Special Features](./SPECIAL_FEATURES.md)**
   - Unique UI elements that should be preserved
   - Special animations and effects
   - Custom configurations

## Project Files

- **[README.md](../README.md)** - General project overview and setup instructions
- **[PLANNED_TOOLS.md](../PLANNED_TOOLS.md)** - Roadmap of future tool implementations

## Important Directories

- `src/components/` - Custom UI components
- `src/pages/` - Page components including tool implementations
- `src/styles/` - CSS and styling files
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and libraries

## Critical Files to Preserve

When cleaning up the project, be careful not to remove these important files:

1. `src/components/AnimatedElement.tsx` - Core animation component
2. `src/components/SmoothScroll.tsx` - Smooth scrolling implementation
3. `src/components/ThreeDScene.tsx` - 3D graphics component
4. `src/components/MainNav.tsx` - Main navigation
5. `src/styles/indie-theme.css` - Custom theme styling
6. `src/pages/tools/MP4ToGIF.tsx` - Main tool implementation
7. Any files related to the dancing GIF element in the corner

## Cleanup Recommendations

When cleaning up the project:

1. Keep all files documented in these guides
2. Preserve the current folder structure
3. Maintain all implemented tools and their components
4. Keep the styling approach consistent
5. Preserve special UI elements like the dancing GIF and 3D components

This documentation set should provide a comprehensive overview of all important aspects of the sLixTOOLS project to prevent accidental removal of critical components during cleanup.
