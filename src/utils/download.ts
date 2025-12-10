import { toast } from 'sonner';

/**
 * Options for the downloadBlob function
 */
export interface DownloadBlobOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    showToast?: boolean;
}

/**
 * Universal file download utility
 * Downloads a Blob as a file with the specified filename
 * 
 * @param blob - The Blob to download
 * @param filename - The name to save the file as
 * @param options - Optional configuration
 */
export const downloadBlob = (
    blob: Blob,
    filename: string,
    options: DownloadBlobOptions = {}
): void => {
    try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        if (options.showToast) {
            toast.success('Download started!');
        }
        options.onSuccess?.();
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Download failed');
        options.onError?.(err);
        if (options.showToast) {
            toast.error('Download failed');
        }
    }
};

/**
 * Generate standardized filename with prefix, optional original name, and extension
 * 
 * @param prefix - Prefix for the filename (e.g., 'compressed', 'converted')
 * @param originalFilename - Original filename to extract base name from
 * @param extension - File extension without the dot
 * @returns Generated filename
 */
export const generateFilename = (
    prefix: string,
    originalFilename: string | undefined,
    extension: string
): string => {
    const base = originalFilename?.split('.')[0] || 'file';
    const timestamp = Date.now();
    return `${prefix}-${base}-${timestamp}.${extension}`;
};

/**
 * Download a Blob with an auto-generated filename
 * 
 * @param blob - The Blob to download
 * @param prefix - Prefix for the filename
 * @param originalFilename - Original filename to extract base name from
 * @param extension - File extension without the dot
 * @param options - Optional configuration
 */
export const downloadBlobWithGeneratedName = (
    blob: Blob,
    prefix: string,
    originalFilename: string | undefined,
    extension: string,
    options: DownloadBlobOptions = {}
): void => {
    const filename = generateFilename(prefix, originalFilename, extension);
    downloadBlob(blob, filename, options);
};
