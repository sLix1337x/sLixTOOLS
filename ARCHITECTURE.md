# sLixTOOLS Project Architecture

This document outlines the architectural structure of the sLixTOOLS application, providing an overview of how the different components work together.

## Project Overview

sLixTOOLS is a React application built with Vite, TypeScript, and Tailwind CSS. It offers various file conversion and transformation tools with a focus on GIF creation and manipulation. The application features modern UI elements, animations, and 3D graphics.

## Directory Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/           # Basic UI components (shadcn/ui)
│   └── ...           # Custom components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and libraries
├── pages/            # Page components and routes
│   ├── tools/        # Tool-specific pages
│   └── ...           # Other pages
├── styles/           # CSS styles and themes
└── utils/            # Helper functions and utilities
```

## Key Technologies

- **React 18**: Core UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Three.js (R3F)**: 3D graphics rendering
- **Lenis**: Smooth scrolling implementation
- **shadcn/ui**: UI component library

## Application Flow

1. The application entry point is `main.tsx`, which renders the `App` component
2. `App.tsx` sets up routing and global state
3. The router directs users to different pages based on the URL
4. Tool pages (like the GIF converter) handle file uploads and transformations
5. Components handle specific functionalities (file upload, preview, conversion)

## State Management

The application uses React's built-in state management (useState, useContext) for most state handling. Some components use custom hooks for specialized state management.

## Styling Approach

The project uses Tailwind CSS for styling with some custom CSS in specific components. The design follows a consistent theme with modern UI elements, subtle animations, and responsive layouts.

## Performance Considerations

- Client-side processing for file conversions
- Optimized asset loading
- Responsive design for various devices
- Animation performance optimization with Framer Motion

## Browser Compatibility

The application is designed to work on modern browsers with good support for the latest web standards.
