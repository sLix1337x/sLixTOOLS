import { FileVideo, FileImage, FileText, Music, Type, Code, Scissors } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ToolConfig {
  title: string;
  description: string;
  tooltip?: string;
  icon: LucideIcon;
  path?: string;
  category: 'video' | 'image' | 'document' | 'audio' | 'text' | 'other';
  featured?: boolean;
  comingSoon?: boolean;
}

/**
 * Centralized tools configuration
 * Single source of truth for all tool metadata
 */
export const TOOLS: ToolConfig[] = [
  // Featured/Available Tools
  {
    title: 'Video to GIF',
    description: 'Convert video files to animated GIF format',
    tooltip: 'Convert video files to animated GIF format with customizable quality and frame rate settings',
    icon: FileVideo,
    path: '/tools/video-to-gif',
    category: 'video',
    featured: true,
  },
  {
    title: 'GIF Compressor',
    description: 'Reduce GIF file size while maintaining quality',
    tooltip: 'Reduce GIF file size while maintaining visual quality using advanced compression algorithms',
    icon: Scissors,
    path: '/tools/gif-compressor',
    category: 'video',
    featured: true,
  },
  {
    title: 'Image Compressor',
    description: 'Compress images to reduce file size',
    tooltip: 'Compress images to reduce file size without significant quality loss for web optimization',
    icon: FileImage,
    path: '/tools/image-compressor',
    category: 'image',
    featured: true,
  },
  {
    title: 'Image Resizer',
    description: 'Resize images to specific dimensions',
    tooltip: 'Resize images to specific dimensions or scale them proportionally for different use cases',
    icon: FileImage,
    path: '/tools/image-resizer',
    category: 'image',
    featured: true,
  },
  {
    title: 'Image Converter',
    description: 'Convert images between different formats',
    tooltip: 'Convert images between different formats (JPG, PNG, WebP, SVG) with quality control',
    icon: FileImage,
    path: '/tools/image-converter',
    category: 'image',
    featured: true,
  },
  {
    title: 'Video Converter',
    description: 'Convert video files between various formats',
    tooltip: 'Convert video files between various formats (MP4, AVI, MOV, etc.) with quality options',
    icon: FileVideo,
    path: '/tools/video-converter',
    category: 'video',
    featured: true,
  },
  {
    title: 'Convert Case Tool',
    description: 'Transform text between different cases',
    tooltip: 'Transform text between different cases: uppercase, lowercase, title case, camelCase, and more',
    icon: Type,
    path: '/tools/convert-case',
    category: 'text',
    featured: true,
  },
  {
    title: 'XML Editor',
    description: 'Edit, format, and validate XML data',
    tooltip: 'Edit, format, validate, and share XML data with syntax highlighting and real-time validation',
    icon: Code,
    path: '/tools/xml-editor',
    category: 'document',
    featured: true,
  },
  {
    title: 'PDF Editor',
    description: 'Merge, split, and annotate PDFs',
    tooltip: 'Merge multiple PDFs, split by pages or ranges, and add text annotations entirely client-side',
    icon: FileText,
    path: '/tools/pdf-editor',
    category: 'document',
    featured: true,
  },

  // Coming Soon Tools
  {
    title: 'PDF Compressor',
    description: 'Reduce PDF file size',
    tooltip: 'Reduce PDF file size while preserving document quality and readability',
    icon: FileText,
    category: 'document',
    comingSoon: true,
  },
  {
    title: 'Audio Converter',
    description: 'Convert audio files between formats',
    tooltip: 'Convert audio files between different formats (MP3, WAV, FLAC, AAC) with quality options',
    icon: Music,
    category: 'audio',
    comingSoon: true,
  },
];

// Pre-computed cached results (computed once at module load)
const AVAILABLE_TOOLS = TOOLS.filter(tool => !tool.comingSoon);
const COMING_SOON_TOOLS = TOOLS.filter(tool => tool.comingSoon);
const FEATURED_TOOLS = TOOLS.filter(tool => tool.featured && !tool.comingSoon);

/** Get tools that are available (not coming soon) */
export const getAvailableTools = (): ToolConfig[] => AVAILABLE_TOOLS;

/** Get tools marked as coming soon */
export const getComingSoonTools = (): ToolConfig[] => COMING_SOON_TOOLS;

/** Get featured tools for home page */
export const getFeaturedTools = (): ToolConfig[] => FEATURED_TOOLS;

/** Get tools by category */
export const getToolsByCategory = (category: ToolConfig['category']): ToolConfig[] =>
  TOOLS.filter(tool => tool.category === category);

/** Get a specific tool by path */
export const getToolByPath = (path: string): ToolConfig | undefined =>
  TOOLS.find(tool => tool.path === path);
