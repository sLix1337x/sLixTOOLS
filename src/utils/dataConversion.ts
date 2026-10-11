/**
 * Data conversion utilities for working with base64 data URIs and Blobs
 */

/**
 * Converts a data URI string to a Blob object
 * Commonly used for converting canvas.toDataURL() output to downloadable files
 * 
 * @param dataURI - The data URI string (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
 * @returns Blob object with appropriate MIME type
 * 
 * @example
 * ```typescript
 * const canvas = document.createElement('canvas');
 * const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
 * const blob = dataURItoBlob(dataUrl);
 * // Now you can download the blob or upload it
 * ```
 */
export const dataURItoBlob = (dataURI: string): Blob => {
    // Split the data URI to get the base64 data and MIME type
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // Convert the base64 string to a byte array
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // Create and return the Blob
    return new Blob([ab], { type: mimeString });
};

/**
 * Converts a Blob to a data URI string
 * Useful for previewing images in the browser
 * 
 * @param blob - The Blob object to convert
 * @returns Promise that resolves to a data URI string
 * 
 * @example
 * ```typescript
 * const blob = new Blob(['Hello World'], { type: 'text/plain' });
 * const dataUri = await blobToDataURI(blob);
 * console.log(dataUri); // "data:text/plain;base64,SGVsbG8gV29ybGQ="
 * ```
 */
export const blobToDataURI = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
