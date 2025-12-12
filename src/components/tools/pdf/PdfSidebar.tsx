import React, { useState } from 'react';
import { FileText, Search, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import PdfThumbnails from './PdfThumbnails';
import PdfSearch from './PdfSearch';
import type { PDFDocumentProxy } from 'pdfjs-dist';

type SidebarTab = 'thumbnails' | 'search' | 'properties';

interface PdfSidebarProps {
  visible: boolean;
  onToggle: () => void;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  pdfDoc: PDFDocumentProxy | null;
  currentPage: number;
  onPageSelect: (page: number) => void;
  onPageReorder: (newOrder: number[]) => void;
  onResultSelect: (page: number) => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

const PdfSidebar = ({
  visible,
  onToggle,
  activeTab,
  onTabChange,
  pdfDoc,
  currentPage,
  onPageSelect,
  onPageReorder,
  onResultSelect,
  width = 250,
  onWidthChange
}: PdfSidebarProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(width);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.min(Math.max(200, e.clientX), 400);
        setSidebarWidth(newWidth);
        onWidthChange?.(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isResizing, onWidthChange]);

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-0 h-full w-6 bg-[#252526] border-r border-[#3e3e42] hover:bg-[#2a2d2e] transition-colors z-40 flex items-center justify-center text-[#858585] hover:text-[#cccccc]"
        title="Show Sidebar"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    );
  }

  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'thumbnails', label: 'Thumbnails', icon: <FileText className="h-4 w-4" /> },
    { id: 'search', label: 'Search', icon: <Search className="h-4 w-4" /> },
    { id: 'properties', label: 'Properties', icon: <Info className="h-4 w-4" /> }
  ];

  return (
    <div
      className="bg-[#252526] border-r border-[#3e3e42] flex flex-col h-full"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Sidebar Header */}
      <div className="flex items-center border-b border-[#3e3e42] h-10">
        <div className="flex-1 flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 text-[12px] transition-colors",
                activeTab === tab.id
                  ? "bg-[#1e1e1e] text-[#cccccc] border-b-2 border-[#007acc]"
                  : "text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onToggle}
          className="px-2 h-10 hover:bg-[#2a2d2e] transition-colors text-[#858585] hover:text-[#cccccc]"
          title="Hide Sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-auto pdf-scrollbar">
        {activeTab === 'thumbnails' && pdfDoc && (
          <PdfThumbnails
            pdfDoc={pdfDoc}
            currentPage={currentPage}
            onPageSelect={onPageSelect}
            onPageReorder={onPageReorder}
          />
        )}
        {activeTab === 'search' && pdfDoc && (
          <div className="p-2">
            <PdfSearch
              pdfDoc={pdfDoc}
              onResultSelect={onResultSelect}
            />
          </div>
        )}
        {activeTab === 'properties' && (
          <div className="p-4 text-[12px] text-[#cccccc] space-y-2">
            <div>
              <div className="text-[#858585] mb-1">Pages</div>
              <div>{pdfDoc ? pdfDoc.numPages : 0}</div>
            </div>
            {pdfDoc && (
              <>
                <div>
                  <div className="text-[#858585] mb-1">Current Page</div>
                  <div>{currentPage} / {pdfDoc.numPages}</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#007acc] transition-colors",
          isResizing && "bg-[#007acc]"
        )}
        style={{ right: '-2px' }}
      />
    </div>
  );
};

export default PdfSidebar;

