# Styling Guide

This document details the styling approach and UI themes used in the sLixTOOLS application. These styling patterns are critical to maintain visual consistency throughout the application.

## Core Styling Technologies

- **Tailwind CSS**: Primary styling framework providing utility classes
- **Custom CSS**: Additional styling in specific files like `indie-theme.css` and `App.css`
- **shadcn/ui**: Component library providing consistent UI elements
- **Framer Motion**: Used for animations and transitions

## Color Scheme

The application uses a retro-computing inspired theme with these key colors:

```css
:root {
  --bg-color: #000000;          /* Primary background */
  --text-color: #39ff14;        /* Bright green text */
  --border-color: #39ff14;      /* Border color */
  --accent-color: #ff00ff;      /* Magenta accent */
  --hover-color: #00ffff;       /* Cyan hover effect */
}
```

## Typography

The application primarily uses a monospace font for that retro terminal look:
- `--font-mono: 'Courier New', Courier, monospace;`
- Headings use text-transform: uppercase and letter-spacing for emphasis
- Special glitch effect applied to headings via CSS animation

## UI Elements

### Buttons

Buttons have a consistent style throughout the application:
- Transparent backgrounds
- Dashed borders (`--border-style: 2px dashed var(--border-color);`)
- Uppercase text with letter spacing
- Hover effects that change background and text color

### Cards

Cards are used to group related content:
- Semi-transparent black backgrounds (`rgba(0, 0, 0, 0.7)`)
- Dashed borders matching the theme
- Hover effects with box-shadow
- Consistent padding (1.5rem)

### Form Elements

Form inputs maintain the theme consistency:
- Semi-transparent backgrounds
- Dashed borders
- Text color matching the theme
- Consistent padding and margins

## Animations

### Scroll Animations

Elements fade in and slide up as they enter the viewport:
```css
.scroll-section {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.scroll-section.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Glitch Effect

Headings have a unique glitch effect for visual interest:
```css
@keyframes glitch {
  0% { text-shadow: 0.05em 0 0 #ff00ff, -0.05em -0.025em 0 #00ffff; }
  /* ... more keyframes ... */
  100% { text-shadow: -0.025em 0 0 #ff00ff, -0.025em 0 0 #00ffff; }
}

h1, h2, h3, h4, h5, h6 {
  animation: glitch 3s infinite;
}
```

### Particle Background

A particle animation in the background adds depth:
```css
.bg-particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
}
```

## Responsive Design

The application is fully responsive with specific adjustments for different screen sizes:
- Container padding reduces on smaller screens (`padding: 10px;` vs `padding: 20px;`)
- Card padding adjusts for mobile (`padding: 1rem;` vs `padding: 1.5rem;`)
- Text sizes and spacing adapt to screen width
- Special media queries handle navigation on small screens

## Custom Scrollbar

The application includes a custom scrollbar to match the theme:
- Thin width (10px)
- Border and colors matching the application theme
- Hover effects consistent with other UI elements

## Important Style Files

- `src/styles/indie-theme.css`: Contains the retro-computing theme styles
- `src/index.css`: Contains Tailwind directives and global styles
- `src/App.css`: Contains application-specific styles
- `src/debug.css`: Contains styling used for debugging
