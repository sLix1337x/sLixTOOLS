import React, { useEffect, useRef, useState } from 'react';
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

// One page of the multi-page views. The canvas is always mounted (loading label overlaid) and
// rendering is driven by the effect, so each page renders once per (doc, page, zoom) and an
// in-flight pdf.js render is cancelled when any of them changes or the page scrolls out.
const PageCanvas = ({
  pdfDoc,
  pageNum,
  zoom,
  className,
}: {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  zoom: number;
  className?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    let task: pdfjsLib.RenderTask | null = null;
    setStatus('loading');

    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const ctx = canvas.getContext('2d');
        if (cancelled || !ctx) return;
        const viewport = page.getViewport({ scale: zoom });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        task = page.render({ canvasContext: ctx, viewport, canvas });
        await task.promise;
        if (!cancelled) setStatus('done');
      } catch (error) {
        if (cancelled || error instanceof pdfjsLib.RenderingCancelledException) return;
        console.error(`Failed to render page ${pageNum}:`, error);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdfDoc, pageNum, zoom]);

  return (
    <>
      <canvas ref={ref} className={className} />
      {status !== 'done' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2d2d30] rounded text-center text-[#858585] text-xs">
          {status === 'error' ? `Failed to render page ${pageNum}` : `Loading page ${pageNum}...`}
        </div>
      )}
    </>
  );
};

const DRAW_TOOLS = ['draw', 'rectangle', 'circle', 'line', 'arrow'] as const;

const MultiPageRenderer = ({
  viewMode,
  previewPage,
  previewTotalPages,
  zoom,
  pdfDoc,
  canvasRef,
  overlayRef,
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
  onTextBoxEdit,
}: MultiPageRendererProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageNum: number } | null>(
    null
  );
  // Scale-1 viewport size of the current page; overlays (text boxes, drawings) live in this space
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!pdfDoc || viewMode !== 'single') return;
    let cancelled = false;
    pdfDoc
      .getPage(previewPage)
      .then((page) => {
        if (cancelled) return;
        const { width, height } = page.getViewport({ scale: 1 });
        setPageSize({ width, height });
      })
      .catch(() => {
        /* doc replaced/destroyed mid-load; the next effect run handles the new doc */
      });
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, previewPage, viewMode]);

  // Get pages to render based on view mode
  const getPagesToRender = (): number[] => {
    if (!pdfDoc) return [];

    switch (viewMode) {
      case 'single':
        return [previewPage];
      case 'continuous': {
        // Virtual scrolling: render visible pages + buffer based on scroll position
        // For now, render pages around current page with buffer
        // TODO: Implement intersection observer for true virtual scrolling
        const start = Math.max(1, previewPage - 3);
        const end = Math.min(previewTotalPages, previewPage + 8);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }
      case 'two-up': {
        // Render current page and next page
        const current = previewPage;
        const next = Math.min(previewTotalPages, current + 1);
        return current === next ? [current] : [current, next];
      }
      case 'four-up': {
        // Render 4 pages starting from current
        const startPage = Math.max(1, Math.floor((previewPage - 1) / 4) * 4 + 1);
        return Array.from(
          { length: Math.min(4, previewTotalPages - startPage + 1) },
          (_, i) => startPage + i
        );
      }
      default:
        return [previewPage];
    }
  };

  if (viewMode === 'single') {
    // Get current page text boxes and drawings
    const currentPageTextBoxes = textBoxes.filter((tb) => tb.page === previewPage);
    const currentPageDrawings = drawings.filter((d) => d.page === previewPage);

    const effectivePageSize = pageSize;
    const drawTool = DRAW_TOOLS.find((t) => t === activeTool) ?? null;

    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="relative" style={{ display: 'inline-block' }}>
          <canvas ref={canvasRef} className="block shadow-lg" />

          {/* Drawing Canvas Overlay - always mounted so drawings stay visible; inert unless a draw tool is active */}
          {effectivePageSize.width > 0 && effectivePageSize.height > 0 && (
            <PdfDrawingCanvas
              drawings={currentPageDrawings}
              currentPage={previewPage}
              activeTool={drawTool}
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
              'absolute top-0 left-0',
              activeTool === 'text'
                ? 'cursor-text'
                : activeTool === 'select'
                  ? 'cursor-default'
                  : activeTool === 'draw' ||
                      activeTool === 'rectangle' ||
                      activeTool === 'circle' ||
                      activeTool === 'line' ||
                      activeTool === 'arrow'
                    ? 'cursor-crosshair'
                    : 'cursor-default',
              // Disable pointer events when drawing tools are active so drawing canvas can receive events
              (activeTool === 'draw' ||
                activeTool === 'rectangle' ||
                activeTool === 'circle' ||
                activeTool === 'line' ||
                activeTool === 'arrow') &&
                'pointer-events-none'
            )}
            style={{
              width: effectivePageSize.width > 0 ? `${effectivePageSize.width * zoom}px` : '100%',
              height:
                effectivePageSize.height > 0 ? `${effectivePageSize.height * zoom}px` : '100%',
              pointerEvents:
                activeTool === 'draw' ||
                activeTool === 'rectangle' ||
                activeTool === 'circle' ||
                activeTool === 'line' ||
                activeTool === 'arrow'
                  ? 'none'
                  : 'auto',
            }}
            onMouseDown={(e) => {
              // Don't handle clicks when drawing tools are active - let drawing canvas handle them
              if (
                activeTool === 'draw' ||
                activeTool === 'rectangle' ||
                activeTool === 'circle' ||
                activeTool === 'line' ||
                activeTool === 'arrow'
              ) {
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
                  color: '#38bdf8',
                  background: 'rgba(0,0,0,0.8)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  border: '1px solid #38bdf8',
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

  if (viewMode !== 'continuous' && viewMode !== 'two-up' && viewMode !== 'four-up') return null;

  const pagesToRender = getPagesToRender();
  const fourUp = viewMode === 'four-up';

  return (
    <div
      className={
        viewMode === 'continuous'
          ? 'flex flex-col items-center gap-4'
          : 'flex items-start justify-center gap-4 flex-wrap'
      }
    >
      {pagesToRender.map((pageNum) => (
        <div
          key={pageNum}
          className={cn(
            'relative cursor-pointer transition-all',
            fourUp && 'w-[48%]',
            pageNum === previewPage && 'ring-2 ring-[#007acc]'
          )}
          onClick={() => onPageClick(pageNum)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, pageNum });
          }}
        >
          {pdfDoc && (
            <PageCanvas
              pdfDoc={pdfDoc}
              pageNum={pageNum}
              zoom={zoom}
              className={cn(
                'block shadow-lg',
                viewMode === 'two-up' && 'max-w-full',
                fourUp && 'w-full h-auto'
              )}
            />
          )}
          <div
            className={
              fourUp
                ? 'absolute bottom-1 left-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px]'
                : 'absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs'
            }
          >
            {fourUp ? pageNum : `Page ${pageNum}`}
          </div>
        </div>
      ))}
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
};

export default MultiPageRenderer;
