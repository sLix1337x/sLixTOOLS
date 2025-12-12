/**
 * External URL configuration
 * Centralized management of all external URLs used in the application
 */

// Helper to get local asset path (works in both dev and production)
const getLocalAssetPath = (path: string): string => {
  const basePath = import.meta.env.BASE_URL || '/sLixTOOLS/';
  // Remove trailing slash from basePath if present, add leading slash to path if not present
  const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

export const EXTERNAL_URLS = {
  // Social Media and Branding
  OG_IMAGE: 'https://slixtools.io/og-image.png',
  BANNER_IMAGE: 'https://sLix1337x.github.io/sLixTOOLS/assets/images/slixtool-banner.svg',
  
  // Demo Images - Using local paths to avoid COEP blocking
  // These files are in public/images/ directory
  DEMO_IMAGES: {
    FUNKY_KONG: getLocalAssetPath('images/funkykong.gif'),
    LOGO: getLocalAssetPath('images/vorncrash2.gif'),
  },
  
  // Example URLs for placeholders
  PLACEHOLDERS: {
    IMAGE: 'https://example.com/image.jpg',
    ANIMATION_GIF: 'https://example.com/animation.gif',
  },
  
  // GitHub and Repository URLs
  GITHUB: {
    DEPLOY_BADGE: 'https://github.com/slix1337x/sLixTOOLS/actions/workflows/deploy.yml/badge.svg',
    DEPLOY_ACTION: 'https://github.com/slix1337x/sLixTOOLS/actions/workflows/deploy.yml',
    LICENSE_BADGE: 'https://img.shields.io/badge/License-MIT-yellow.svg',
    LICENSE_URL: 'https://opensource.org/licenses/MIT',
  },
} as const;

// Type for external URL keys
export type ExternalUrlKey = keyof typeof EXTERNAL_URLS;

// Helper function to get URL with fallback
export const getExternalUrl = (category: keyof typeof EXTERNAL_URLS, key?: string): string => {
  const categoryUrls = EXTERNAL_URLS[category];
  
  if (typeof categoryUrls === 'string') {
    return categoryUrls;
  }
  
  if (key && typeof categoryUrls === 'object' && key in categoryUrls) {
    const urlMap = categoryUrls as Record<string, string>;
    return urlMap[key];
  }
  
  // Return first URL in category as fallback
  if (typeof categoryUrls === 'object') {
    const urlMap = categoryUrls as Record<string, string>;
    const firstKey = Object.keys(urlMap)[0];
    return urlMap[firstKey] || '';
  }
  
  return '';
};

// Validation helper to check if URL is external
export const isExternalUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};