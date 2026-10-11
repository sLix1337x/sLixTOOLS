import React from 'react';
import { FileText, FileImage, Type, Pencil, Square, Circle, Minus, ArrowRight, Merge, Split, X, Move, Palette, RotateCw, Download, Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RibbonTab = 'file' | 'pages' | 'text' | 'draw' | 'annotate' | 'export';

interface PdfRibbonProps {
  activeTab: RibbonTab;
  onTabChange: (tab: RibbonTab) => void;
  activeTool: string | null;
  onToolChange: (tool: string | null) => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  onMergeClick: () => void;
  processingState: {
    isMerging: boolean;
    isSplitting: boolean;
    isDeleting: boolean;
    isReordering: boolean;
    isHighlighting: boolean;
    isAnnotating: boolean;
    isConverting: boolean;
  };
  hasDocument: boolean;
  drawingColor?: string;
  onDrawingColorChange?: (color: string) => void;
  drawingWidth?: number;
  onDrawingWidthChange?: (width: number) => void;
  // Text tool options
  textFontSize?: number;
  onTextFontSizeChange?: (size: number) => void;
  textColor?: string;
  onTextColorChange?: (color: string) => void;
  // Undo/Redo
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // Highlight props
  highlightText?: string;
  highlightPage?: number;
  highlightX?: number;
  highlightY?: number;
  highlightColor?: string;
  setHighlightText?: (val: string) => void;
  setHighlightPage?: (val: number) => void;
  setHighlightX?: (val: number) => void;
  setHighlightY?: (val: number) => void;
  setHighlightColor?: (val: string) => void;
  onHighlight?: () => void;
  // Annotate props
  annotationText?: string;
  annotationPage?: number;
  annotationX?: number;
  annotationY?: number;
  setAnnotationText?: (val: string) => void;
  setAnnotationPage?: (val: number) => void;
  setAnnotationX?: (val: number) => void;
  setAnnotationY?: (val: number) => void;
  onAnnotate?: () => void;
}

const PdfRibbon = ({
  activeTab,
  onTabChange,
  activeTool,
  onToolChange,
  activeModal,
  setActiveModal,
  onMergeClick,
  processingState,
  hasDocument,
  drawingColor = '#ff0000',
  onDrawingColorChange,
  drawingWidth = 2,
  onDrawingWidthChange,
  textFontSize = 12,
  onTextFontSizeChange,
  textColor = '#ffffff',
  onTextColorChange,
  highlightText = '',
  highlightPage = 1,
  highlightX = 50,
  highlightY = 50,
  highlightColor = '#ffff00',
  setHighlightText,
  setHighlightPage,
  setHighlightX,
  setHighlightY,
  setHighlightColor,
  onHighlight,
  annotationText = '',
  annotationPage = 1,
  annotationX = 50,
  annotationY = 50,
  setAnnotationText,
  setAnnotationPage,
  setAnnotationX,
  setAnnotationY,
  onAnnotate,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: PdfRibbonProps) => {
  const tabs: { id: RibbonTab; label: string; icon: React.ReactNode }[] = [
    { id: 'file', label: 'File', icon: <FileText className="h-4 w-4" /> },
    { id: 'pages', label: 'Pages', icon: <FileImage className="h-4 w-4" /> },
    { id: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
    { id: 'draw', label: 'Draw', icon: <Pencil className="h-4 w-4" /> },
    { id: 'annotate', label: 'Annotate', icon: <Palette className="h-4 w-4" /> },
    { id: 'export', label: 'Export', icon: <Download className="h-4 w-4" /> }
  ];

  return (
    <div className="bg-[#2d2d30] border-b border-[#3e3e42]">
      {/* Tab Bar */}
      <div className="flex items-center h-10 px-2 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 h-8 rounded-t-md flex items-center gap-2 text-[12px] font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[#1e1e1e] text-[#cccccc] border-t-2 border-[#007acc]"
                : "text-[#858585] hover:text-[#cccccc] hover:bg-[#252526]"
            )}
            disabled={!hasDocument && tab.id !== 'file'}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tool Panel */}
      <div className="bg-[#1e1e1e] border-t border-[#3e3e42] px-4 py-2 min-h-[60px]">
        {activeTab === 'file' && (
          <div className="flex items-center gap-2">
            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1 border-r border-[#3e3e42] pr-2 mr-2">
              <button
                onClick={onUndo}
                disabled={!canUndo || !hasDocument}
                className="px-2 py-1.5 bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc] rounded text-[12px] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo || !hasDocument}
                className="px-2 py-1.5 bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc] rounded text-[12px] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={onMergeClick}
              disabled={processingState.isMerging}
              className="px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded text-[12px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Merge multiple PDF files into one"
            >
              <Merge className="h-4 w-4" />
              Merge PDFs
            </button>
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveModal('split')}
              disabled={processingState.isSplitting}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeModal === 'split'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]",
                processingState.isSplitting && "opacity-50 cursor-not-allowed"
              )}
            >
              <Split className="h-4 w-4" />
              Split
            </button>
            <button
              onClick={() => setActiveModal('delete')}
              disabled={processingState.isDeleting}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeModal === 'delete'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]",
                processingState.isDeleting && "opacity-50 cursor-not-allowed"
              )}
            >
              <X className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={() => setActiveModal('reorder')}
              disabled={processingState.isReordering}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeModal === 'reorder'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]",
                processingState.isReordering && "opacity-50 cursor-not-allowed"
              )}
            >
              <Move className="h-4 w-4" />
              Reorder
            </button>
            <button
              className="px-3 py-1.5 bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc] rounded text-[12px] flex items-center gap-2 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              Rotate
            </button>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="flex items-center gap-2 flex-wrap justify-between w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  // Always set tool - if clicking the same tool, deactivate it; otherwise activate it
                  // This ensures only one tool is active at a time
                  onToolChange(activeTool === 'text' ? null : 'text');
                }}
                className={cn(
                  "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                  activeTool === 'text'
                    ? "bg-[#0e639c] text-white"
                    : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]"
                )}
              title="Add text to PDF - Double-click on the PDF to place a text box (T)"
              >
                <Type className="h-4 w-4" />
                Add Text
              </button>
            <button
              onClick={() => {
                // Toggle highlight tool
                if (activeTool === 'highlight') {
                  onToolChange(null);
                } else {
                  onToolChange('highlight');
                }
              }}
              disabled={processingState.isHighlighting}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeTool === 'highlight'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]",
                processingState.isHighlighting && "opacity-50 cursor-not-allowed"
              )}
              title="Highlight text - Enable 'Click to set position', click on PDF, then fill form and click Highlight"
            >
              <Palette className="h-4 w-4" />
              Highlight
            </button>
            <button
              onClick={() => {
                // Toggle annotate tool
                if (activeTool === 'annotate') {
                  onToolChange(null);
                } else {
                  onToolChange('annotate');
                }
              }}
              disabled={processingState.isAnnotating}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeTool === 'annotate'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]",
                processingState.isAnnotating && "opacity-50 cursor-not-allowed"
              )}
              title="Add annotation - Enable 'Click to set position', click on PDF, then fill form and click Annotate"
            >
              <Pencil className="h-4 w-4" />
              Annotate
            </button>
            </div>
            
            {/* Text Tool Options - Always visible when Text tab is active */}
            {activeTab === 'text' && (
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-2" title="Text font size">
                  <label className="text-[12px] text-[#cccccc]">Size:</label>
                  <input
                    type="number"
                    min="8"
                    max="72"
                    value={textFontSize}
                    onChange={(e) => onTextFontSizeChange?.(Number(e.target.value) || 12)}
                    className="w-16 px-2 py-1 text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded focus:outline-none focus:border-[#007acc]"
                    title="Font size for new text boxes"
                  />
                </div>
                <div className="flex items-center gap-2" title="Text color">
                  <label className="text-[12px] text-[#cccccc]">Color:</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => onTextColorChange?.(e.target.value)}
                    className="w-8 h-6 rounded cursor-pointer border border-[#3e3e42]"
                    title="Text color for new text boxes"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Highlight Form - Inline in ribbon */}
        {activeTab === 'text' && activeTool === 'highlight' && (
          <div className="px-4 py-2 border-t border-[#3e3e42] flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#cccccc] whitespace-nowrap">Text:</label>
              <input
                type="text"
                placeholder="Text to highlight"
                value={highlightText}
                onChange={(e) => setHighlightText?.(e.target.value)}
                className="px-2 py-1 text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded w-32 focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#cccccc] whitespace-nowrap">Page:</label>
              <input
                type="number"
                min={1}
                value={highlightPage}
                onChange={(e) => setHighlightPage?.(parseInt(e.target.value) || 1)}
                className="px-2 py-1 text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded w-16 focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#cccccc] whitespace-nowrap">X:</label>
              <input
                type="number"
                value={highlightX}
                onChange={(e) => setHighlightX?.(parseInt(e.target.value) || 0)}
                className="px-2 py-1 text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded w-16 focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#cccccc] whitespace-nowrap">Y:</label>
              <input
                type="number"
                value={highlightY}
                onChange={(e) => setHighlightY?.(parseInt(e.target.value) || 0)}
                className="px-2 py-1 text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded w-16 focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#cccccc] whitespace-nowrap">Color:</label>
              <input
                type="color"
                value={highlightColor}
                onChange={(e) => setHighlightColor?.(e.target.value)}
                className="w-8 h-6 rounded cursor-pointer border border-[#464647]"
              />
            </div>
            <button
              onClick={onHighlight}
              disabled={processingState.isHighlighting || !hasDocument}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                "bg-[#0e639c] hover:bg-[#1177bb] text-white",
                (processingState.isHighlighting || !hasDocument) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Download className="h-4 w-4" />
              {processingState.isHighlighting ? 'Highlighting...' : 'Highlight & Download'}
            </button>
          </div>
        )}

        {/* Annotate Form - Inline in ribbon */}
        {activeTab === 'text' && activeTool === 'annotate' && (
          <div className="px-4 py-2 border-t border-[#3e3e42] flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#cccccc] whitespace-nowrap">Text:</label>
              <input
                type="text"
                placeholder="Annotation text"
                value={annotationText}
                onChange={(e) => setAnnotationText?.(e.target.value)}
                className="px-2 py-1 text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded w-32 focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#cccccc] whitespace-nowrap">Page:</label>
              <input
                type="number"
                min={1}
                value={annotationPage}
                onChange={(e) => setAnnotationPage?.(parseInt(e.target.value) || 1)}
                className="px-2 py-1 text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded w-16 focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#cccccc] whitespace-nowrap">X:</label>
              <input
                type="number"
                value={annotationX}
                onChange={(e) => setAnnotationX?.(parseInt(e.target.value) || 0)}
                className="px-2 py-1 text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded w-16 focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#cccccc] whitespace-nowrap">Y:</label>
              <input
                type="number"
                value={annotationY}
                onChange={(e) => setAnnotationY?.(parseInt(e.target.value) || 0)}
                className="px-2 py-1 text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded w-16 focus:outline-none focus:border-[#007acc]"
              />
            </div>
            <button
              onClick={onAnnotate}
              disabled={processingState.isAnnotating || !hasDocument}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                "bg-[#0e639c] hover:bg-[#1177bb] text-white",
                (processingState.isAnnotating || !hasDocument) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Download className="h-4 w-4" />
              {processingState.isAnnotating ? 'Annotating...' : 'Annotate & Download'}
            </button>
          </div>
        )}

        {activeTab === 'draw' && (
          <div className="flex items-center gap-2 flex-wrap justify-between w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onToolChange(activeTool === 'draw' ? null : 'draw')}
                className={cn(
                  "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                  activeTool === 'draw'
                    ? "bg-[#0e639c] text-white"
                    : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]"
                )}
              title="Freehand drawing tool - Click and drag to draw (D)"
              >
                <Pencil className="h-4 w-4" />
                Freehand
              </button>
            <button
              onClick={() => onToolChange(activeTool === 'rectangle' ? null : 'rectangle')}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeTool === 'rectangle'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]"
              )}
              title="Rectangle tool - Click and drag to draw a rectangle (R)"
            >
              <Square className="h-4 w-4" />
              Rectangle
            </button>
            <button
              onClick={() => onToolChange(activeTool === 'circle' ? null : 'circle')}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeTool === 'circle'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]"
              )}
              title="Circle tool - Click and drag to draw a circle (C)"
            >
              <Circle className="h-4 w-4" />
              Circle
            </button>
            <button
              onClick={() => onToolChange(activeTool === 'line' ? null : 'line')}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeTool === 'line'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]"
              )}
              title="Line tool - Click and drag to draw a line (L)"
            >
              <Minus className="h-4 w-4" />
              Line
            </button>
            <button
              onClick={() => onToolChange(activeTool === 'arrow' ? null : 'arrow')}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeTool === 'arrow'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]"
              )}
              title="Arrow tool - Click and drag to draw an arrow (A)"
            >
              <ArrowRight className="h-4 w-4" />
              Arrow
            </button>
            </div>
            
            {/* Drawing Controls - Always visible when Draw tab is active */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-2" title="Select drawing color">
                <label className="text-[12px] text-[#cccccc]">Color:</label>
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(e) => onDrawingColorChange?.(e.target.value)}
                  className="w-8 h-6 rounded cursor-pointer border border-[#3e3e42]"
                  title="Click to change drawing color"
                />
              </div>
              <div className="flex items-center gap-2" title="Adjust line width">
                <label className="text-[12px] text-[#cccccc]">Width:</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={drawingWidth}
                  onChange={(e) => onDrawingWidthChange?.(Number(e.target.value))}
                  className="w-20"
                  title="Adjust line width"
                />
                <span className="text-[12px] text-[#cccccc] min-w-[30px]">{drawingWidth}px</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'annotate' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveModal('annotate')}
              disabled={processingState.isAnnotating}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeModal === 'annotate'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]",
                processingState.isAnnotating && "opacity-50 cursor-not-allowed"
              )}
            >
              <Pencil className="h-4 w-4" />
              Add Comment
            </button>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveModal('convert')}
              disabled={processingState.isConverting}
              className={cn(
                "px-3 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors",
                activeModal === 'convert'
                  ? "bg-[#0e639c] text-white"
                  : "bg-[#3e3e42] hover:bg-[#464647] text-[#cccccc]",
                processingState.isConverting && "opacity-50 cursor-not-allowed"
              )}
            >
              <FileImage className="h-4 w-4" />
              Convert to Images
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfRibbon;

