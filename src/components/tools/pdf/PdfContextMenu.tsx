import React, { useEffect, useRef } from 'react';
import { RotateCw, Trash2, Copy, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfContextMenuProps {
  x: number;
  y: number;
  pageNum: number;
  onClose: () => void;
  onRotate?: (rotation: 90 | 180 | 270) => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onExtract?: () => void;
  onView?: () => void;
}

const PdfContextMenu = ({
  x,
  y,
  pageNum,
  onClose,
  onRotate,
  onDelete,
  onCopy,
  onExtract,
  onView
}: PdfContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  const [adjustedX, adjustedY] = React.useMemo(() => {
    if (!menuRef.current) return [x, y];
    const rect = menuRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let newX = x;
    let newY = y;
    
    if (x + rect.width > windowWidth) {
      newX = windowWidth - rect.width - 10;
    }
    if (y + rect.height > windowHeight) {
      newY = windowHeight - rect.height - 10;
    }
    
    return [newX, newY];
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-[#252526] border border-[#3e3e42] shadow-lg rounded py-1 z-50 min-w-[180px]"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
    >
      <div className="px-3 py-1.5 text-[11px] text-[#858585] border-b border-[#3e3e42]">
        Page {pageNum}
      </div>
      
      {onView && (
        <button
          onClick={() => {
            onView();
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e] flex items-center gap-3 transition-colors"
        >
          <Eye className="h-4 w-4" />
          <span>Go to Page</span>
        </button>
      )}
      
      {onRotate && (
        <>
          <button
            onClick={() => {
              onRotate(90);
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e] flex items-center gap-3 transition-colors"
          >
            <RotateCw className="h-4 w-4" />
            <span>Rotate 90°</span>
          </button>
          <button
            onClick={() => {
              onRotate(180);
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e] flex items-center gap-3 transition-colors"
          >
            <RotateCw className="h-4 w-4" />
            <span>Rotate 180°</span>
          </button>
          <button
            onClick={() => {
              onRotate(270);
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e] flex items-center gap-3 transition-colors"
          >
            <RotateCw className="h-4 w-4" />
            <span>Rotate 270°</span>
          </button>
        </>
      )}
      
      {onCopy && (
        <button
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e] flex items-center gap-3 transition-colors"
        >
          <Copy className="h-4 w-4" />
          <span>Copy Page</span>
        </button>
      )}
      
      {onExtract && (
        <button
          onClick={() => {
            onExtract();
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e] flex items-center gap-3 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Extract Page</span>
        </button>
      )}
      
      {onDelete && (
        <>
          <div className="h-px bg-[#3e3e42] my-1" />
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-[13px] text-[#ff6b6b] hover:bg-[#2a2d2e] flex items-center gap-3 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Page</span>
          </button>
        </>
      )}
    </div>
  );
};

export default PdfContextMenu;

