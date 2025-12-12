import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist';
import type { ViewMode } from './PdfDocumentView';
import PdfContextMenu from './PdfContextMenu';
import PdfTextBox from './PdfTextBox';
import PdfDrawingCanvas from './PdfDrawingCanvas';
import type { TextBox, Drawing } from '@/types/pdfEditor';

interface MultiPageRendererProps {
  viewMode: ViewMode;
  previewPage: number;
  previewTotalPages: number;
  zoom: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
  clickCoord: { x: number; y: number } | null;
  annotationText: string;
  onCanvasClick: (e: React.MouseEvent) => void;
  onPageClick: (page: number) => void;
  textBoxes: TextBox[];
  drawings: Drawing[];
  activeTool: string | null;
  onTextBoxUpdate: (id: string, updates: Partial<TextBox>) => void;
  onTextBoxDelete: (id: string) => void;
  onTextBoxSave: (textBox: TextBox) => void;
  onDrawingComplete: (drawing: Drawing) => void;
  onDrawingUpdate: (id: string, drawing: Partial<Drawing>) => void;
  onDrawingDelete: (id: string) => void;
  selectedAnnotation: string | null;
  onAnnotationSelect: (id: string | null) => void;
  drawingColor: string;
  drawingWidth: number;
  textClickState?: { pending: boolean; x: number; y: number; timestamp: number } | null | undefined;
  editingTextBoxId?: string | null | undefined;
  onTextBoxEdit?: ((id: string | null) => void) | undefined;
}

const MultiPageRenderer = ({
  viewMode,
  previewPage,
  previewTotalPages,
  zoom,
  pdfDoc,
  canvasRef,
  overlayRef,
  clickCoord,
  annotationText,
  onCanvasClick,
  onPageClick,
  textBoxes,
  drawings,
  activeTool,
  onTextBoxUpdate,
  onTextBoxDelete,
  onTextBoxSave,
  onDrawingComplete,
  onDrawingUpdate,
  onDrawingDelete,
  selectedAnnotation,
  onAnnotationSelect,
  drawingColor,
  drawingWidth,
  textClickState,
  editingTextBoxId,
  onTextBoxEdit
}: MultiPageRendererProps) => {
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set());
  const renderCancellations = useRef<Map<number, AbortController>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageNum: number } | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // Update overlay size when canvas size changes to ensure it covers the full canvas
  useEffect(() => {
    if (canvasRef.current && overlayRef.current && viewMode === 'single') {
      const updateOverlaySize = () => {
        if (canvasRef.current && overlayRef.current) {
          const canvas = canvasRef.current;
          overlayRef.current.style.width = `${canvas.width}px`;
          overlayRef.current.style.height = `${canvas.height}px`;
          // Ensure overlay is positioned at top-left of canvas
          overlayRef.current.style.top = '0px';
          overlayRef.current.style.left = '0px';
        }
      };
      
      // Update immediately
      updateOverlaySize();
      
      // Also update when canvas size state changes
      const timeoutId = setTimeout(updateOverlaySize, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [canvasSize, zoom, viewMode]);

  // Get pages to render based on view mode
  const getPagesToRender = (): number[] => {
    if (!pdfDoc) return [];
    
    switch (viewMode) {
      case 'single':
        return [previewPage];
      case 'continuous':
        // Virtual scrolling: render visible pages + buffer based on scroll position
        // For now, render pages around current page with buffer
        // TODO: Implement intersection observer for true virtual scrolling
        const start = Math.max(1, previewPage - 3);
        const end = Math.min(previewTotalPages, previewPage + 8);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
      case 'two-up':
        // Render current page and next page
        const current = previewPage;
        const next = Math.min(previewTotalPages, current + 1);
        return current === next ? [current] : [current, next];
      case 'four-up':
        // Render 4 pages starting from current
        const startPage = Math.max(1, Math.floor((previewPage - 1) / 4) * 4 + 1);
        return Array.from({ length: Math.min(4, previewTotalPages - startPage + 1) }, (_, i) => startPage + i);
      default:
        return [previewPage];
    }
  };

  // Render a single page to a canvas element with cancellation support
  const renderPage = useCallback(async (pageNum: number, targetCanvas: HTMLCanvasElement) => {
    if (!pdfDoc) return;

    // Cancel any existing render for this page
    const existingCancel = renderCancellations.current.get(pageNum);
    if (existingCancel) {
      existingCancel.abort();
    }

    const abortController = new AbortController();
    renderCancellations.current.set(pageNum, abortController);
    setLoadingPages((prev) => new Set(prev).add(pageNum));

    try {
      const page = await pdfDoc.getPage(pageNum);
      if (abortController.signal.aborted) return;

      const viewport = page.getViewport({ scale: zoom });
      
      // Store page size for annotations
      const baseViewport = page.getViewport({ scale: 1 });
      if (pageNum === previewPage) {
        setPageSize({ width: baseViewport.width, height: baseViewport.height });
      }
      
      const ctx = targetCanvas.getContext('2d');
      if (!ctx || abortController.signal.aborted) return;

      targetCanvas.width = viewport.width;
      targetCanvas.height = viewport.height;

      const renderContext = { canvasContext: ctx, viewport, canvas: targetCanvas };
      await page.render(renderContext).promise;
      
      if (abortController.signal.aborted) return;
      
      // Update canvas size for overlay positioning
      if (pageNum === previewPage && canvasRef.current) {
        setCanvasSize({ width: canvasRef.current.width, height: canvasRef.current.height });
      }
      
      setRenderedPages((prev) => new Set(prev).add(pageNum));
      setLoadingPages((prev) => {
        const next = new Set(prev);
        next.delete(pageNum);
        return next;
      });
      renderCancellations.current.delete(pageNum);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Render was cancelled, ignore
      }
      console.error(`Failed to render page ${pageNum}:`, error);
      setLoadingPages((prev) => {
        const next = new Set(prev);
        next.delete(pageNum);
        return next;
      });
      renderCancellations.current.delete(pageNum);
    }
  }, [pdfDoc, zoom, previewPage]);

  // Set canvas ref callback
  const setCanvasRef = useCallback((pageNum: number) => (el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(pageNum, el);
      if (!renderedPages.has(pageNum) && !loadingPages.has(pageNum) && pdfDoc) {
        renderPage(pageNum, el);
      }
    } else {
      // Cancel rendering if element is removed
      const cancel = renderCancellations.current.get(pageNum);
      if (cancel) {
        cancel.abort();
        renderCancellations.current.delete(pageNum);
      }
      canvasRefs.current.delete(pageNum);
    }
  }, [renderedPages, loadingPages, pdfDoc, renderPage]);

  // Clear rendered pages when zoom changes
  useEffect(() => {
    // Cancel all ongoing renders
    renderCancellations.current.forEach((cancel) => cancel.abort());
    renderCancellations.current.clear();
    setRenderedPages(new Set());
    setLoadingPages(new Set());
  }, [zoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      renderCancellations.current.forEach((cancel) => cancel.abort());
      renderCancellations.current.clear();
    };
  }, []);

  if (viewMode === 'single') {
    // Get current page text boxes and drawings
    const currentPageTextBoxes = textBoxes.filter(tb => tb.page === previewPage);
    const currentPageDrawings = drawings.filter(d => d.page === previewPage);
    
    // Get page size from canvasSize if available, otherwise use stored pageSize
    // canvasSize is set when the page renders (line 139)
    const effectivePageSize = (() => {
      if (canvasSize.width > 0 && canvasSize.height > 0) {
        // Calculate base page size from canvas dimensions and zoom
        return {
          width: canvasSize.width / zoom,
          height: canvasSize.height / zoom
        };
      }
      // Fallback: try to get from canvas ref directly
      if (canvasRef.current && canvasRef.current.width > 0 && canvasRef.current.height > 0) {
        return {
          width: canvasRef.current.width / zoom,
          height: canvasRef.current.height / zoom
        };
      }
      return pageSize;
    })();
    
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="relative" style={{ display: 'inline-block' }}>
          <canvas ref={canvasRef} className="block shadow-lg" />
          
          {/* Drawing Canvas Overlay - Must be positioned exactly over the PDF canvas */}
          {activeTool && (activeTool === 'draw' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') && effectivePageSize.width > 0 && effectivePageSize.height > 0 && (
            <PdfDrawingCanvas
              drawings={currentPageDrawings}
              currentPage={previewPage}
              activeTool={activeTool}
              onDrawingComplete={onDrawingComplete}
              onDrawingUpdate={onDrawingUpdate}
              onDrawingDelete={onDrawingDelete}
              pageSize={effectivePageSize}
              viewportScale={zoom}
              strokeColor={drawingColor}
              strokeWidth={drawingWidth}
            />
          )}
          
          {/* Text Boxes Overlay */}
          <div
            ref={overlayRef}
            className={cn(
              "absolute top-0 left-0",
              activeTool === 'text' ? "cursor-text" : activeTool === 'select' ? "cursor-default" : activeTool === 'draw' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow' ? "cursor-crosshair" : "cursor-default",
              // Disable pointer events when drawing tools are active so drawing canvas can receive events
              (activeTool === 'draw' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') && "pointer-events-none"
            )}
            style={{
              width: canvasRef.current?.width ? `${canvasRef.current.width}px` : (canvasSize.width > 0 ? `${canvasSize.width}px` : '100%'),
              height: canvasRef.current?.height ? `${canvasRef.current.height}px` : (canvasSize.height > 0 ? `${canvasSize.height}px` : '100%'),
              pointerEvents: (activeTool === 'draw' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') ? 'none' : 'auto',
            }}
            onMouseDown={(e) => {
              // Don't handle clicks when drawing tools are active - let drawing canvas handle them
              if (activeTool === 'draw' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') {
                return;
              }
              
              // For text tool, pass event to onCanvasClick which is handleTextToolClick
              // But only if we're not clicking on an existing text box
              if (activeTool === 'text') {
                const target = e.target as HTMLElement;
                // Check if click is on a text box element
                if (target.closest('.group')) {
                  // Click is on a text box, let it handle the event
                  return;
                }
                e.stopPropagation();
                e.preventDefault();
                onCanvasClick(e);
              } else if (activeTool === 'select') {
                // Deselect on background click
                e.stopPropagation();
                onAnnotationSelect(null);
              } else if (activeTool === 'annotate' || activeTool === 'highlight') {
                // For annotate/highlight tools, pass through to onCanvasClick
                // This will set clickCoord if usePrecisePlacement is enabled
                e.stopPropagation();
                onCanvasClick(e);
              } else {
                // For other tools, pass through
                e.stopPropagation();
                onCanvasClick(e);
              }
            }}
            onClick={(e) => {
              // Also handle click events for compatibility
              if (activeTool === 'draw' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') {
                return;
              }
              
              if (activeTool === 'text') {
                e.stopPropagation();
                onCanvasClick(e);
              } else if (activeTool === 'select') {
                e.stopPropagation();
                onAnnotationSelect(null);
              } else {
                e.stopPropagation();
                onCanvasClick(e);
              }
            }}
          >
            {/* Render text boxes */}
            {currentPageTextBoxes.map((textBox) => (
              <PdfTextBox
                key={textBox.id}
                textBox={textBox}
                onUpdate={onTextBoxUpdate}
                onDelete={onTextBoxDelete}
                onSave={onTextBoxSave}
                pageSize={effectivePageSize}
                viewportScale={zoom}
                isSelected={selectedAnnotation === textBox.id}
                isEditing={editingTextBoxId === textBox.id}
                onSelect={onAnnotationSelect}
                onEdit={onTextBoxEdit}
              />
            ))}
            
            {/* Double-click preview indicator */}
            {textClickState?.pending && activeTool === 'text' && (
              <div
                style={{
                  position: 'absolute',
                  left: `${textClickState.x}px`,
                  top: `${textClickState.y}px`,
                  transform: 'translate(-50%, -100%)',
                  color: '#4ade80',
                  background: 'rgba(0,0,0,0.8)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  border: '1px solid #4ade80',
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              >
                Double-click to place text
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pagesToRender = getPagesToRender();

  if (viewMode === 'continuous') {
    return (
      <div ref={containerRef} className="flex flex-col items-center gap-4">
        {pagesToRender.map((pageNum) => {
          const isRendered = renderedPages.has(pageNum);
          const isLoading = loadingPages.has(pageNum);
          if (!isRendered && !isLoading) {
            return (
              <div key={pageNum} className="w-full max-w-4xl bg-[#2d2d30] rounded p-8 text-center text-[#858585]">
                Loading page {pageNum}...
              </div>
            );
          }
          if (isLoading) {
            return (
              <div key={pageNum} className="w-full max-w-4xl bg-[#2d2d30] rounded p-8 text-center text-[#858585]">
                Rendering page {pageNum}...
              </div>
            );
          }
          return (
            <div
              key={pageNum}
              className={cn(
                "relative cursor-pointer transition-all",
                pageNum === previewPage && "ring-2 ring-[#007acc]"
              )}
              onClick={() => onPageClick(pageNum)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, pageNum });
              }}
            >
              <canvas
                ref={setCanvasRef(pageNum)}
                className="block shadow-lg"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                Page {pageNum}
              </div>
            </div>
          );
        })}
        {contextMenu && (
          <PdfContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            pageNum={contextMenu.pageNum}
            onClose={() => setContextMenu(null)}
            onView={() => onPageClick(contextMenu.pageNum)}
          />
        )}
      </div>
    );
  }

  if (viewMode === 'two-up') {
    return (
      <div className="flex items-start justify-center gap-4 flex-wrap">
        {pagesToRender.map((pageNum) => {
          const isRendered = renderedPages.has(pageNum);
          const isLoading = loadingPages.has(pageNum);
          if (!isRendered && !isLoading) {
            return (
              <div key={pageNum} className="w-[48%] bg-[#2d2d30] rounded p-8 text-center text-[#858585]">
                Loading page {pageNum}...
              </div>
            );
          }
          if (isLoading) {
            return (
              <div key={pageNum} className="w-[48%] bg-[#2d2d30] rounded p-8 text-center text-[#858585]">
                Rendering page {pageNum}...
              </div>
            );
          }
          return (
            <div
              key={pageNum}
              className={cn(
                "relative cursor-pointer transition-all",
                pageNum === previewPage && "ring-2 ring-[#007acc]"
              )}
              onClick={() => onPageClick(pageNum)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, pageNum });
              }}
            >
              <canvas
                ref={setCanvasRef(pageNum)}
                className="block shadow-lg max-w-full"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                Page {pageNum}
              </div>
            </div>
          );
        })}
        {contextMenu && (
          <PdfContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            pageNum={contextMenu.pageNum}
            onClose={() => setContextMenu(null)}
            onView={() => onPageClick(contextMenu.pageNum)}
          />
        )}
      </div>
    );
  }

  if (viewMode === 'four-up') {
    return (
      <div className="flex items-start justify-center gap-4 flex-wrap">
        {pagesToRender.map((pageNum) => {
          const isRendered = renderedPages.has(pageNum);
          const isLoading = loadingPages.has(pageNum);
          if (!isRendered && !isLoading) {
            return (
              <div key={pageNum} className="w-[48%] bg-[#2d2d30] rounded p-4 text-center text-[#858585] text-xs">
                Loading {pageNum}...
              </div>
            );
          }
          if (isLoading) {
            return (
              <div key={pageNum} className="w-[48%] bg-[#2d2d30] rounded p-4 text-center text-[#858585] text-xs">
                Rendering {pageNum}...
              </div>
            );
          }
          return (
            <div
              key={pageNum}
              className={cn(
                "relative cursor-pointer transition-all w-[48%]",
                pageNum === previewPage && "ring-2 ring-[#007acc]"
              )}
              onClick={() => onPageClick(pageNum)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, pageNum });
              }}
            >
              <canvas
                ref={setCanvasRef(pageNum)}
                className="block shadow-lg w-full h-auto"
              />
              <div className="absolute bottom-1 left-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px]">
                {pageNum}
              </div>
            </div>
          );
        })}
        {contextMenu && (
          <PdfContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            pageNum={contextMenu.pageNum}
            onClose={() => setContextMenu(null)}
            onView={() => onPageClick(contextMenu.pageNum)}
          />
        )}
      </div>
    );
  }

  return null;
};

export default MultiPageRenderer;

