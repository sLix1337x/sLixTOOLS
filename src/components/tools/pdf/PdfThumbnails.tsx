import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { cn } from '@/lib/utils';

interface PdfThumbnailsProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  onPageSelect: (page: number) => void;
  onPageReorder?: (newOrder: number[]) => void;
  className?: string;
}

const PdfThumbnails = ({
  pdfDoc,
  currentPage,
  onPageSelect,
  onPageReorder,
  className,
}: PdfThumbnailsProps) => {
  const [thumbnails, setThumbnails] = useState<Array<{ pageNum: number; url: string }>>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const thumbnailRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    if (!pdfDoc) {
      setThumbnails([]);
      return;
    }

    const loadThumbnails = async () => {
      const newThumbnails: Array<{ pageNum: number; url: string }> = [];
      
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) continue;
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: context, viewport }).promise;
          
          newThumbnails.push({
            pageNum: i,
            url: canvas.toDataURL(),
          });
        } catch (error) {
          console.error(`Failed to load thumbnail for page ${i}:`, error);
        }
      }
      
      setThumbnails(newThumbnails);
    };

    loadThumbnails();
  }, [pdfDoc]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || !onPageReorder) return;
    
    const newOrder = [...thumbnails];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    
    const pageOrder = newOrder.map(item => item.pageNum);
    onPageReorder(pageOrder);
    setDraggedIndex(null);
  };

  if (!pdfDoc || thumbnails.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-32 overflow-y-auto bg-black/20 border-r border-white/10 p-2", className)}>
      <div className="text-xs text-gray-400 mb-2 font-semibold">Pages</div>
      <div className="space-y-2">
        {thumbnails.map((thumbnail, index) => (
          <div
            key={thumbnail.pageNum}
            draggable={!!onPageReorder}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => onPageSelect(thumbnail.pageNum)}
            className={cn(
              "cursor-pointer border-2 rounded p-1 transition-all",
              currentPage === thumbnail.pageNum
                ? "border-green-400 bg-green-400/10"
                : "border-transparent hover:border-white/20 hover:bg-white/5"
            )}
          >
            <img
              src={thumbnail.url}
              alt={`Page ${thumbnail.pageNum}`}
              className="w-full h-auto rounded"
            />
            <div className="text-xs text-center text-gray-400 mt-1">
              {thumbnail.pageNum}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PdfThumbnails;

