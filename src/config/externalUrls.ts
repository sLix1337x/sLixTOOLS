/**
 * External URL configuration
 * Centralized management of all external URLs used in the application
 */

// Helper to get local asset path (works in both dev and production)
export const getLocalAssetPath = (path: string): string => {
  const basePath = import.meta.env.BASE_URL || '/sLixTOOLS/';
  // Remove trailing slash from basePath if present, add leading slash to path if not present
  const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

export const EXTERNAL_URLS = {
  /** Public site root (GitHub Pages). Routes live behind the hash: `${SITE}#/tools` — matches public/sitemap.xml */
  SITE: 'https://sLix1337x.github.io/sLixTOOLS/',

  // Social Media and Branding
  OG_IMAGE: 'https://sLix1337x.github.io/sLixTOOLS/formen.png',
  BANNER_IMAGE: 'https://sLix1337x.github.io/sLixTOOLS/assets/images/slixtool-banner.svg',
  
  // Demo Images - Using local paths to avoid COEP blocking
  // These files are in public/images/ directory
  DEMO_IMAGES: {
    FUNKY_KONG: getLocalAssetPath('images/funkykong.gif'),
    LOGO: getLocalAssetPath('images/vorncrash2.gif'),
    CRASH_DANCE: getLocalAssetPath('images/crash_dance.gif'),
  },
  
  // Example URLs for placeholders
  PLACEHOLDERS: {
    IMAGE: 'https://example.com/image.jpg',
    ANIMATION_GIF: 'https://example.com/animation.gif',
  },
  
  // GitHub and Repository URLs
  GITHUB: {
    REPO: 'https://github.com/sLix1337x/sLixTOOLS',
    ISSUES: 'https://github.com/sLix1337x/sLixTOOLS/issues/new',
    DEPLOY_BADGE: 'https://github.com/slix1337x/sLixTOOLS/actions/workflows/deploy.yml/badge.svg',
    DEPLOY_ACTION: 'https://github.com/slix1337x/sLixTOOLS/actions/workflows/deploy.yml',
    LICENSE_BADGE: 'https://img.shields.io/badge/License-MIT-yellow.svg',
    LICENSE_URL: 'https://opensource.org/licenses/MIT',
  },
} as const;

/** Public URL of a route, in the same `#/path` form public/sitemap.xml uses */
export const siteUrl = (pathname: string): string =>
  pathname === '/' ? EXTERNAL_URLS.SITE : `${EXTERNAL_URLS.SITE}#${pathname}`;

