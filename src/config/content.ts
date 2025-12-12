/**
 * Centralized content constants
 * Single source of truth for reusable text content
 */

export const CONTENT = {
  TOOLS_DESCRIPTION: {
    INTRO: "Explore our collection of free online tools to help with all your file conversion and optimization needs.",
    PRIVACY: "All processing happens in your browser",
    PRIVACY_SUFFIX: "– your files never leave your computer.",
  },
} as const;

/**
 * Get the full tools description paragraph
 */
export const getToolsDescription = (): string => {
  return `${CONTENT.TOOLS_DESCRIPTION.INTRO}\n${CONTENT.TOOLS_DESCRIPTION.PRIVACY} ${CONTENT.TOOLS_DESCRIPTION.PRIVACY_SUFFIX}`;
};

