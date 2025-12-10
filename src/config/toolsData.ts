import { FileVideo, FileImage, FileText, Music, Type, Code, Scissors } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Extended ToolItem type with icon as component reference
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
 * Single source of truth for all tool metadata across the application
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
        comingSoon: false,
    },
    {
        title: 'GIF Compressor',
        description: 'Reduce GIF file size while maintaining quality',
        tooltip: 'Reduce GIF file size while maintaining visual quality using advanced compression algorithms',
        icon: Scissors,
        path: '/tools/gif-compressor',
        category: 'video',
        featured: true,
        comingSoon: false,
    },
    {
        title: 'Image Compressor',
        description: 'Compress images to reduce file size',
        tooltip: 'Compress images to reduce file size without significant quality loss for web optimization',
        icon: FileImage,
        path: '/tools/image-compressor',
        category: 'image',
        featured: true,
        comingSoon: false,
    },
    {
        title: 'Image Resizer',
        description: 'Resize images to specific dimensions',
        tooltip: 'Resize images to specific dimensions or scale them proportionally for different use cases',
        icon: FileImage,
        path: '/tools/image-resizer',
        category: 'image',
        featured: true,
        comingSoon: false,
    },
    {
        title: 'Image Converter',
        description: 'Convert images between different formats',
        tooltip: 'Convert images between different formats (JPG, PNG, WebP, SVG) with quality control',
        icon: FileImage,
        path: '/tools/image-converter',
        category: 'image',
        featured: true,
        comingSoon: false,
    },
    {
        title: 'Video Converter',
        description: 'Convert video files between various formats',
        tooltip: 'Convert video files between various formats (MP4, AVI, MOV, etc.) with quality options',
        icon: FileVideo,
        path: '/tools/video-converter',
        category: 'video',
        featured: true,
        comingSoon: false,
    },
    {
        title: 'Convert Case Tool',
        description: 'Transform text between different cases',
        tooltip: 'Transform text between different cases: uppercase, lowercase, title case, camelCase, and more',
        icon: Type,
        path: '/tools/convert-case',
        category: 'text',
        featured: true,
        comingSoon: false,
    },
    {
        title: 'XML Editor',
        description: 'Edit, format, and validate XML data',
        tooltip: 'Edit, format, validate, and share XML data with syntax highlighting and real-time validation',
        icon: Code,
        path: '/tools/xml-editor',
        category: 'document',
        featured: true,
        comingSoon: false,
    },
    {
        title: 'PDF Editor',
        description: 'Merge, split, and annotate PDFs',
        tooltip: 'Merge multiple PDFs, split by pages or ranges, and add text annotations entirely client-side',
        icon: FileText,
        path: '/tools/pdf-editor',
        category: 'document',
        featured: true,
        comingSoon: false,
    },

    // Coming Soon Tools
    {
        title: 'PDF Compressor',
        description: 'Reduce PDF file size',
        tooltip: 'Reduce PDF file size while preserving document quality and readability',
        icon: FileText,
        category: 'document',
        featured: false,
        comingSoon: true,
    },
    {
        title: 'Audio Converter',
        description: 'Convert audio files between formats',
        tooltip: 'Convert audio files between different formats (MP3, WAV, FLAC, AAC) with quality options',
        icon: Music,
        category: 'audio',
        featured: false,
        comingSoon: true,
    },
];

/**
 * Get tools that are available (not coming soon)
 */
export const getAvailableTools = (): ToolConfig[] => {
    return TOOLS.filter(tool => !tool.comingSoon);
};

/**
 * Get tools marked as coming soon
 */
export const getComingSoonTools = (): ToolConfig[] => {
    return TOOLS.filter(tool => tool.comingSoon);
};

/**
 * Get featured tools for home page
 */
export const getFeaturedTools = (): ToolConfig[] => {
    return TOOLS.filter(tool => tool.featured && !tool.comingSoon);
};

/**
 * Get tools by category
 */
export const getToolsByCategory = (category: ToolConfig['category']): ToolConfig[] => {
    return TOOLS.filter(tool => tool.category === category);
};

/**
 * Get a specific tool by path
 */
export const getToolByPath = (path: string): ToolConfig | undefined => {
    return TOOLS.find(tool => tool.path === path);
};
