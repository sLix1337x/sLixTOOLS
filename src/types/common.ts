/**
 * Common type definitions
 * Replaces Record<string, unknown> with proper types
 */

/**
 * Metadata for error reporting
 */
export interface ErrorMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Metadata for processing operations
 */
export interface ProcessingMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Parameters for edit operations
 */
export interface EditParams {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Generic metadata type for flexible use cases
 */
export type Metadata = Record<string, string | number | boolean | null | undefined>;

