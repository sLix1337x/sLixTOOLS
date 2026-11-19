import { useEffect, useRef } from 'react';

/**
 * Passes a file from one tool to the next ("Open in Video Converter").
 * In-memory only: the file lives as long as the tab and is taken once.
 */
let pending: File | null = null;

export const handOff = (file: File) => {
  pending = file;
};

const takeHandoff = (): File | null => {
  const file = pending;
  pending = null;
  return file;
};

/** Calls onFile once on mount when another tool handed a file over. */
export const useHandoff = (onFile: (file: File) => void) => {
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;
  useEffect(() => {
    const file = takeHandoff();
    if (file) onFileRef.current(file);
  }, []);
};

/** Wraps a result blob into a File named after the source, for handing it on. */
export const toFile = (blob: Blob, sourceName: string | undefined, ext: string, suffix = 'edited') => {
  const base = (sourceName ?? 'file').replace(/\.[^.]+$/, '') || 'file';
  return new File([blob], `${base}-${suffix}.${ext}`, { type: blob.type });
};
