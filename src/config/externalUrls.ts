/**
 * External URL configuration
 * Centralized management of all external URLs used in the application
 */

export const EXTERNAL_URLS = {
  // Social Media and Branding
  OG_IMAGE: 'https://slixtools.io/og-image.png',
  BANNER_IMAGE: 'https://sLix1337x.github.io/sLixTOOLS/assets/images/slixtool-banner.svg',
  
  // Demo Images
  DEMO_IMAGES: {
    FUNKY_KONG: 'https://i.ibb.co/MkhkkNG6/funkykong.gif',
    VORN_CRASH: 'https://i.ibb.co/s8Cz1nC/vorncrash2.gif',
    LOGO: 'https://i.ibb.co/s8Cz1nC/vorncrash2.gif',
  },
  
  // Example URLs for placeholders
  PLACEHOLDERS: {
    IMAGE: 'https://example.com/image.jpg',
    IMAGE_JPG: 'https://example.com/image.jpg',
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
    return (categoryUrls as Record<string, string>)[key];
  }
  
  // Return first URL in category as fallback
  if (typeof categoryUrls === 'object') {
    const firstKey = Object.keys(categoryUrls)[0];
    return (categoryUrls as Record<string, string>)[firstKey] || '';
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