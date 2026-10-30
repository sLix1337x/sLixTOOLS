import { useEffect, useState } from 'react';

/** Object URL for a file or blob, revoked when the blob changes or the component unmounts. */
export const useObjectUrl = (blob: Blob | null) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [blob]);

  return url;
};
