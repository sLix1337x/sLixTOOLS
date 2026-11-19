import {
  FileVideo, FileImage, FileText, Type, Code, Scissors, LayoutGrid, Braces, Palette, Clapperboard, AudioWaveform,
  Video, Music, FolderOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getLocalAssetPath } from '@/config/externalUrls';

export interface ToolConfig {
  title: string;
  description: string;
  tooltip?: string;
  icon: LucideIcon;
  /** Path to a custom icon image in public/images (overrides Lucide icon in UI) */
  iconImage?: string;
  path?: string;
  category: 'video' | 'image' | 'document' | 'audio' | 'text' | 'design' | 'other';
  featured?: boolean;
  comingSoon?: boolean;
  /** Edge-to-edge page: the site header gives way to the slim ToolBar */
  fullWidth?: boolean;
}

/**
 * Centralized tools configuration
 * Single source of truth for all tool metadata
 */
export const CATEGORY_ORDER: ToolConfig['category'][] = ['video', 'audio', 'image', 'document', 'text', 'design'];

export const CATEGORY_LABELS: Record<ToolConfig['category'], string> = {
  video: 'Video & GIF',
  image: 'Image',
  document: 'Documents',
  text: 'Text',
  design: 'Design',
  audio: 'Audio',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<ToolConfig['category'], LucideIcon> = {
  video: Video,
  image: FileImage,
  document: FileText,
  text: Type,
  design: Palette,
  audio: Music,
  other: FolderOpen,
};

export const TOOLS: ToolConfig[] = [
  // Featured/Available Tools
  {
    title: 'Video to GIF',
    iconImage: getLocalAssetPath('images/Video-To-Gif-Tool.svg'),
    description: 'Convert video files to animated GIF format',
    tooltip: 'Convert video files to animated GIF format with customizable quality and frame rate settings',
    icon: FileVideo,
    path: '/tools/video-to-gif',
    fullWidth: true,
    category: 'video',
    featured: true,
  },
  {
    title: 'GIF Compressor',
    iconImage: getLocalAssetPath('images/Gif-Compressor-Tool.svg'),
    description: 'Reduce GIF file size while maintaining quality',
    tooltip: 'Reduce GIF file size while maintaining visual quality using advanced compression algorithms',
    icon: Scissors,
    path: '/tools/gif-compressor',
    fullWidth: true,
    category: 'video',
    featured: true,
  },
  {
    title: 'Image Compressor',
    iconImage: getLocalAssetPath('images/Image-Compressor-Tool.svg'),
    description: 'Compress images to reduce file size',
    tooltip: 'Compress images to reduce file size without significant quality loss for web optimization',
    icon: FileImage,
    path: '/tools/image-compressor',
    fullWidth: true,
    category: 'image',
    featured: true,
  },
  {
    title: 'Image Resizer',
    iconImage: getLocalAssetPath('images/Image-Resizer-Tool.svg'),
    description: 'Resize images to specific dimensions',
    tooltip: 'Resize images to specific dimensions or scale them proportionally for different use cases',
    icon: FileImage,
    path: '/tools/image-resizer',
    fullWidth: true,
    category: 'image',
    featured: true,
  },
  {
    title: 'Image Converter',
    iconImage: getLocalAssetPath('images/Image-Converter-Tool.svg'),
    description: 'Convert images between different formats',
    tooltip: 'Convert images between different formats (JPG, PNG, WebP, SVG) with quality control',
    icon: FileImage,
    path: '/tools/image-converter',
    fullWidth: true,
    category: 'image',
    featured: true,
  },
  {
    title: 'Image Splitter',
    iconImage: getLocalAssetPath('images/Image-Splitter-Tool.svg'),
    description: 'Split images into grids or custom tiles',
    tooltip: 'Split any image into a grid of lossless PNG tiles with presets, draggable cut lines, custom filenames, and ZIP export — entirely in your browser',
    icon: LayoutGrid,
    path: '/tools/image-splitter',
    category: 'image',
    featured: true,
    fullWidth: true,
  },
  {
    title: 'Video Converter',
    iconImage: getLocalAssetPath('images/Video-Converter-Tool.svg'),
    description: 'Convert video files between various formats',
    tooltip: 'Convert video files between various formats (MP4, AVI, MOV, etc.) with quality options',
    icon: FileVideo,
    path: '/tools/video-converter',
    fullWidth: true,
    category: 'video',
    featured: true,
  },
  {
    title: 'Video Editor',
    description: 'Trim, split and combine videos',
    tooltip: 'Trim, split and combine videos, change speed, rotate, fade and export to MP4 or WebM',
    icon: Clapperboard,
    path: '/tools/video-editor',
    fullWidth: true,
    category: 'video',
    featured: true,
  },
  {
    title: 'Audio Editor',
    description: 'Cut, merge and convert audio files',
    tooltip: 'Cut, trim, merge, fade and normalize audio, then export as MP3, WAV, OGG, FLAC or M4A',
    icon: AudioWaveform,
    path: '/tools/audio-editor',
    fullWidth: true,
    category: 'audio',
    featured: true,
  },
  {
    title: 'Convert Case Tool',
    iconImage: getLocalAssetPath('images/Convert-Case-Tool.svg'),
    description: 'Transform text between different cases',
    tooltip: 'Transform text between different cases: uppercase, lowercase, title case, camelCase, and more',
    icon: Type,
    path: '/tools/convert-case',
    category: 'text',
    featured: true,
    fullWidth: true,
  },
  {
    title: 'XML Editor',
    iconImage: getLocalAssetPath('images/XML-Editor-Tool.svg'),
    description: 'Edit, format, and validate XML data',
    tooltip: 'Edit, format, minify and validate XML with real-time error detection',
    icon: Code,
    path: '/tools/xml-editor',
    category: 'document',
    featured: true,
    fullWidth: true,
  },
  {
    title: 'JSON Validator',
    description: 'Validate, format, and minify JSON',
    tooltip: 'Validate JSON with line and column error locations, pretty-print, minify, sort keys, and inspect stats',
    icon: Braces,
    path: '/tools/json-validator',
    category: 'document',
    featured: true,
    fullWidth: true,
  },
  {
    title: 'PDF Editor',
    iconImage: getLocalAssetPath('images/PDF-Editor-Tool.svg'),
    description: 'Merge, split, and annotate PDFs',
    tooltip: 'Merge multiple PDFs, split by pages or ranges, and add text annotations entirely client-side',
    icon: FileText,
    path: '/tools/pdf-editor',
    category: 'document',
    featured: true,
  },
  {
    title: 'Color Scheme Designer',
    description: 'Generate harmonious color palettes',
    tooltip: 'Build palettes from color harmonies, check WCAG contrast and color blindness, and export CSS, Tailwind or SCSS',
    icon: Palette,
    path: '/tools/color-scheme-designer',
    category: 'design',
    featured: true,
    fullWidth: true,
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

/** Get a specific tool by path */
export const getToolByPath = (path: string): ToolConfig | undefined =>
  TOOLS.find(tool => tool.path === path);
