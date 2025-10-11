/**
 * Centralized formatting utilities to eliminate code duplication
 * across components that need file size and duration formatting.
 */

// Type constraints for numeric values
type NonNegativeNumber = number;

// Validation helper for numeric inputs
const validateNumericInput = (value: number, allowNegative = false): number => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  return allowNegative ? value : Math.max(0, value);
};

/**
 * Formats file size in bytes to human-readable format
 * @param bytes - File size in bytes (must be non-negative)
 * @returns Formatted string (e.g., "1.5 MB", "256 KB")
 */
export const formatFileSize = (bytes: NonNegativeNumber): string => {
  const validBytes = validateNumericInput(bytes);
  if (validBytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const;
  const i = Math.floor(Math.log(validBytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);
  
  return parseFloat((validBytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
};

/**
 * Formats duration in seconds to MM:SS format
 * @param seconds - Duration in seconds (must be non-negative)
 * @returns Formatted string (e.g., "2:30", "0:45")
 */
export const formatDuration = (seconds: NonNegativeNumber): string => {
  const validSeconds = validateNumericInput(seconds);
  
  const mins = Math.floor(validSeconds / 60);
  const secs = Math.floor(validSeconds % 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formats duration in seconds to human-readable format with hours
 * @param seconds - Duration in seconds (must be non-negative)
 * @returns Formatted string (e.g., "1h 2m 30s", "2m 30s", "30s")
 */
export const formatDurationLong = (seconds: NonNegativeNumber): string => {
  const validSeconds = validateNumericInput(seconds);
  
  const hours = Math.floor(validSeconds / 3600);
  const mins = Math.floor((validSeconds % 3600) / 60);
  const secs = Math.floor(validSeconds % 60);
  
  const parts: string[] = [];
  
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};

/**
 * Formats percentage with specified decimal places
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "85.5%")
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Converts bytes to megabytes
 * @param bytes - File size in bytes
 * @returns Size in megabytes as a number
 */
export const bytesToMB = (bytes: number): number => {
  return bytes / (1024 * 1024);
};

/**
 * Formats file size in bytes to MB with specified decimal places
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.50 MB", "256.00 MB")
 */
export const formatFileSizeMB = (bytes: number, decimals: number = 2): string => {
  return `${bytesToMB(bytes).toFixed(decimals)} MB`;
};

/**
 * Formats compression ratio as a readable string
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Formatted compression info (e.g., "Reduced by 45% (2.1 MB → 1.2 MB)")
 */
export const formatCompressionRatio = (originalSize: number, compressedSize: number): string => {
  if (originalSize === 0) return 'No compression data';
  
  const reductionPercent = ((originalSize - compressedSize) / originalSize) * 100;
  const originalFormatted = formatFileSize(originalSize);
  const compressedFormatted = formatFileSize(compressedSize);
  
  if (reductionPercent > 0) {
    return `Reduced by ${formatPercentage(reductionPercent)} (${originalFormatted} → ${compressedFormatted})`;
  } else if (reductionPercent < 0) {
    return `Increased by ${formatPercentage(Math.abs(reductionPercent))} (${originalFormatted} → ${compressedFormatted})`;
  } else {
    return `No size change (${originalFormatted})`;
  }
};