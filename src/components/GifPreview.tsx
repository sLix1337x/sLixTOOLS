
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface GifPreviewProps {
  gifBlob: Blob;
  onDownload: () => void;
  onCopyLink: (url: string) => void;
}

const GifPreview = ({ gifBlob, onDownload, onCopyLink }: GifPreviewProps) => {
  const [copied, setCopied] = useState(false);
  const gifUrl = React.useMemo(() => {
    return URL.createObjectURL(gifBlob);
  }, [gifBlob]);
  
  React.useEffect(() => {
    return () => {
      URL.revokeObjectURL(gifUrl);
    };
  }, [gifUrl]);
  
  const handleDownload = () => {
    onDownload();
    const link = document.createElement('a');
    link.href = gifUrl;
    link.download = `converted-${Date.now()}.gif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleCopyLink = async () => {
    try {
      onCopyLink(gifUrl);
      await navigator.clipboard.writeText(gifUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      // Failed to copy link to clipboard
      toast.error('Failed to copy link to clipboard');
    }
  };
  
  return (
    <div className="flex flex-col gap-6 bg-black/50 p-6 border-2 border-dashed border-green-400/50 rounded-lg">
      <h3 className="text-2xl font-bold text-green-300">YOUR GIF IS READY!</h3>
      
      <div className="relative rounded-lg overflow-hidden bg-black/50 border-2 border-dashed border-blue-400/50">
        <img 
          src={gifUrl} 
          alt="Converted GIF" 
          className="w-full h-auto mx-auto"
          style={{ maxHeight: '400px' }}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button 
          onClick={handleDownload} 
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-none border-2 border-green-400 hover:border-green-300 transition-all duration-200 transform hover:scale-105"
        >
          <Download className="mr-2 h-5 w-5" /> DOWNLOAD GIF
        </Button>
        
        <Button 
          onClick={handleCopyLink}
          disabled={copied}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-none border-2 border-green-400 hover:border-green-300 transition-all duration-200 transform hover:scale-105"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-5 w-5" /> COPIED!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-5 w-5" /> COPY LINK
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default GifPreview;
