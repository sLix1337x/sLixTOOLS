/**
 * Shared style constants to maintain consistency and eliminate duplication
 * across components using common UI patterns.
 */

// Button style variants
export const buttonStyles = {
  primary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-6 py-3 rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400",
  danger: "bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl",
  success: "bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl",
  outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-medium px-6 py-3 rounded-lg transition-all duration-200",
  ghost: "text-gray-600 hover:text-gray-800 hover:bg-gray-100 font-medium px-4 py-2 rounded-lg transition-all duration-200"
} as const;

// Card style variants
export const cardStyles = {
  default: "bg-white rounded-xl shadow-lg border border-gray-200 p-6",
  elevated: "bg-white rounded-xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-shadow duration-300",
  glass: "bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6",
  dark: "bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 text-white",
  gradient: "bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-6"
} as const;

// Input and form styles
export const inputStyles = {
  default: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200",
  error: "w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 bg-red-50",
  success: "w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-green-50"
} as const;

// File upload area styles
export const uploadAreaStyles = {
  default: "border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors duration-200 bg-gray-50/50",
  active: "border-2 border-dashed border-blue-500 rounded-xl p-8 text-center bg-blue-50 transition-colors duration-200",
  error: "border-2 border-dashed border-red-300 rounded-xl p-8 text-center bg-red-50 transition-colors duration-200"
} as const;

// Progress bar styles
export const progressStyles = {
  default: "w-full bg-gray-200 rounded-full h-2 overflow-hidden",
  thick: "w-full bg-gray-200 rounded-full h-4 overflow-hidden",
  thin: "w-full bg-gray-200 rounded-full h-1 overflow-hidden"
} as const;

// Text styles
export const textStyles = {
  heading: "text-3xl font-bold text-gray-900 mb-4",
  subheading: "text-xl font-semibold text-gray-800 mb-3",
  body: "text-gray-600 leading-relaxed",
  caption: "text-sm text-gray-500",
  error: "text-red-600 text-sm font-medium",
  success: "text-green-600 text-sm font-medium",
  muted: "text-gray-400 text-sm"
} as const;

// Layout styles
export const layoutStyles = {
  container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  section: "py-12 lg:py-16",
  grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  flexCenter: "flex items-center justify-center",
  flexBetween: "flex items-center justify-between"
} as const;

// Animation styles
export const animationStyles = {
  fadeIn: "animate-in fade-in duration-500",
  slideUp: "animate-in slide-in-from-bottom-4 duration-500",
  slideDown: "animate-in slide-in-from-top-4 duration-500",
  scaleIn: "animate-in zoom-in-95 duration-300",
  scaleIn: "animate-in zoom-in-95 duration-300",
  bounce: "animate-bounce"
} as const;

// Home Page Animation Constants
export const homeAnimations = {
  SCROLL_TRANSITION_DURATION: '1.5s',
  SCROLL_TRANSITION_EASING: 'cubic-bezier(0.65, 0, 0.35, 1)',
  SCROLL_TIMEOUT_MS: 1600,
  SEPARATOR_DELAY_START: '0.4s',
  COPYRIGHT_DELAY_START: '0.7s',
} as const;

// Responsive breakpoint utilities
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
} as const;

// Common spacing values
export const spacing = {
  xs: "0.5rem",
  sm: "1rem",
  md: "1.5rem",
  lg: "2rem",
  xl: "3rem",
  "2xl": "4rem"
} as const;

// Color palette (for programmatic use)
export const colors = {
  primary: {
    50: "#eff6ff",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8"
  },
  secondary: {
    50: "#f8fafc",
    500: "#64748b",
    600: "#475569",
    700: "#334155"
  },
  success: {
    50: "#f0fdf4",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d"
  },
  error: {
    50: "#fef2f2",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c"
  }
} as const;