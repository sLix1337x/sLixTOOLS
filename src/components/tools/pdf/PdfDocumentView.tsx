import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Type, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import * as pdfjsLib from 'pdfjs-dist';
import MultiPageRenderer from './MultiPageRenderer';
import PdfToolHint from './PdfToolHint';
import type { TextBox, Drawing } from '@/types/pdfEditor';

export type ViewMode = 'single' | 'continuous' | 'two-up' | 'four-up';

interface PdfDocumentViewProps {
  previewPage: number;
  previewTotalPages: number;
  zoom: number;
  viewMode: ViewMode;
  usePrecisePlacement: boolean;
  clickCoord: { x: number; y: number } | null;
  annotationText: string;
  onPageChange: (newPage: number) => void;
  onZoomChange: (newZoom: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onPrecisePlacementChange: (checked: boolean) => void;
  onCanvasClick: (e: React.MouseEvent) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToPage: () => void;
  onFitToWidth: () => void;
  onActualSize: () => void;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
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
  textClickState?: { pending: boolean; x: number; y: number; timestamp: number } | null;
  editingTextBoxId?: string | null;
  onTextBoxEdit?: (id: string | null) => void;
}

const PdfDocumentView = ({
  previewPage,
  previewTotalPages,
  zoom,
  viewMode,
  usePrecisePlacement,
  clickCoord,
  annotationText,
  onPageChange,
  onZoomChange,
  onViewModeChange,
  onPrecisePlacementChange,
  onCanvasClick,
  canvasRef,
  overlayRef,
  onZoomIn,
  onZoomOut,
  onFitToPage,
  onFitToWidth,
  onActualSize,
  pdfDoc,
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
}: PdfDocumentViewProps) => {
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (!isNaN(page) && page >= 1 && page <= previewTotalPages) {
      onPageChange(page);
    }
  };

  // Edit Text Panel Component
  const EditTextBoxPanel = ({ 
    textBox, 
    onUpdate, 
    onSave, 
    onClose 
  }: { 
    textBox: TextBox; 
    onUpdate: (id: string, updates: Partial<TextBox>) => void; 
    onSave: (textBox: TextBox) => void; 
    onClose: () => void;
  }) => {
    const [localText, setLocalText] = useState(textBox.text);
    const [localFontSize, setLocalFontSize] = useState(textBox.fontSize);
    const [localColor, setLocalColor] = useState(textBox.color);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      setLocalText(textBox.text);
      setLocalFontSize(textBox.fontSize);
      setLocalColor(textBox.color);
    }, [textBox]);

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, []);

    const handleSave = () => {
      onUpdate(textBox.id, {
        text: localText,
        fontSize: localFontSize,
        color: localColor,
      });
      onSave({ ...textBox, text: localText, fontSize: localFontSize, color: localColor });
      onClose();
    };

    const handleCancel = () => {
      setLocalText(textBox.text);
      setLocalFontSize(textBox.fontSize);
      setLocalColor(textBox.color);
      onClose();
    };

    return (
      <div className="ml-4 bg-[#1e1e1e] border border-[#3e3e42] rounded-lg p-3 min-w-[200px] shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Edit Text</span>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-2">
          <div>
            <Label htmlFor="text-content" className="text-xs text-gray-300">Text</Label>
            <input
              ref={inputRef}
              id="text-content"
              type="text"
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              className="w-full mt-1 px-2 py-1 rounded bg-black/40 border border-white/20 text-white text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="font-size" className="text-xs text-gray-300">Size</Label>
              <input
                id="font-size"
                type="number"
                min="8"
                max="72"
                value={localFontSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setLocalFontSize(newSize);
                  // Update font size immediately for real-time preview
                  onUpdate(textBox.id, { fontSize: newSize });
                }}
                className="w-full mt-1 px-2 py-1 rounded bg-black/40 border border-white/20 text-white text-sm"
              />
            </div>
            
            <div className="flex-1">
              <Label htmlFor="text-color" className="text-xs text-gray-300">Color</Label>
              <input
                id="text-color"
                type="color"
                value={localColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setLocalColor(newColor);
                  // Update color immediately for real-time preview
                  onUpdate(textBox.id, { color: newColor });
                }}
                className="w-full mt-1 h-8 rounded bg-black/40 border border-white/20"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Navigation Bar */}
      <div className="h-10 bg-[#2d2d30] border-b border-[#3e3e42] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.max(1, previewPage - 1))}
            disabled={previewPage <= 1}
            className="h-7 px-2 text-[12px] text-[#cccccc] hover:bg-[#3e3e42]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="number"
            min={1}
            max={previewTotalPages}
            value={previewPage}
            onChange={handlePageInputChange}
            className="w-12 h-7 px-2 text-center text-[12px] bg-[#3e3e42] border border-[#464647] text-[#cccccc] rounded focus:outline-none focus:border-[#007acc]"
          />
          <span className="text-[12px] text-[#858585]">of {previewTotalPages}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.min(previewTotalPages, previewPage + 1))}
            disabled={previewPage >= previewTotalPages}
            className="h-7 px-2 text-[12px] text-[#cccccc] hover:bg-[#3e3e42]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 border-r border-[#3e3e42] pr-2">
            <button
              onClick={() => onViewModeChange('single')}
              className={cn(
                "px-2 py-1 text-[11px] rounded transition-colors",
                viewMode === 'single'
                  ? "bg-[#007acc] text-white"
                  : "text-[#858585] hover:text-[#cccccc] hover:bg-[#3e3e42]"
              )}
              title="Single Page"
            >
              1
            </button>
            <button
              onClick={() => onViewModeChange('continuous')}
              className={cn(
                "px-2 py-1 text-[11px] rounded transition-colors",
                viewMode === 'continuous'
                  ? "bg-[#007acc] text-white"
                  : "text-[#858585] hover:text-[#cccccc] hover:bg-[#3e3e42]"
              )}
              title="Continuous Scroll"
            >
              ∞
            </button>
            <button
              onClick={() => onViewModeChange('two-up')}
              className={cn(
                "px-2 py-1 text-[11px] rounded transition-colors",
                viewMode === 'two-up'
                  ? "bg-[#007acc] text-white"
                  : "text-[#858585] hover:text-[#cccccc] hover:bg-[#3e3e42]"
              )}
              title="Two Pages"
            >
              2
            </button>
            <button
              onClick={() => onViewModeChange('four-up')}
              className={cn(
                "px-2 py-1 text-[11px] rounded transition-colors",
                viewMode === 'four-up'
                  ? "bg-[#007acc] text-white"
                  : "text-[#858585] hover:text-[#cccccc] hover:bg-[#3e3e42]"
              )}
              title="Four Pages"
            >
              4
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomOut}
              className="h-7 px-2 text-[#cccccc] hover:bg-[#3e3e42]"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.1}
              value={zoom}
              onChange={(e) => onZoomChange(parseFloat(e.target.value))}
              className="w-20 h-1 bg-[#3e3e42] rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[11px] text-[#858585] w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomIn}
              className="h-7 px-2 text-[#cccccc] hover:bg-[#3e3e42]"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 border-l border-[#3e3e42] pl-2">
              <button
                onClick={onFitToWidth}
                className="px-2 py-1 text-[11px] text-[#858585] hover:text-[#cccccc] hover:bg-[#3e3e42] rounded transition-colors"
                title="Fit to Width"
              >
                Fit Width
              </button>
              <button
                onClick={onFitToPage}
                className="px-2 py-1 text-[11px] text-[#858585] hover:text-[#cccccc] hover:bg-[#3e3e42] rounded transition-colors"
                title="Fit to Page"
              >
                Fit Page
              </button>
              <button
                onClick={onActualSize}
                className="px-2 py-1 text-[11px] text-[#858585] hover:text-[#cccccc] hover:bg-[#3e3e42] rounded transition-colors"
                title="Actual Size (100%)"
              >
                100%
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Canvas Area */}
      <div className="flex-1 overflow-auto bg-[#0f0f0d] pdf-scrollbar relative">
        <MultiPageRenderer
          viewMode={viewMode}
          previewPage={previewPage}
          previewTotalPages={previewTotalPages}
          zoom={zoom}
          pdfDoc={pdfDoc}
          canvasRef={canvasRef}
          overlayRef={overlayRef}
          clickCoord={clickCoord}
          annotationText={annotationText}
          onCanvasClick={onCanvasClick}
          onPageClick={onPageChange}
          textBoxes={textBoxes}
          drawings={drawings}
          activeTool={activeTool}
          onTextBoxUpdate={onTextBoxUpdate}
          onTextBoxDelete={onTextBoxDelete}
          onTextBoxSave={onTextBoxSave}
          onDrawingComplete={onDrawingComplete}
          onDrawingUpdate={onDrawingUpdate}
          onDrawingDelete={onDrawingDelete}
          selectedAnnotation={selectedAnnotation}
          onAnnotationSelect={onAnnotationSelect}
          drawingColor={drawingColor}
          drawingWidth={drawingWidth}
          textClickState={textClickState}
          editingTextBoxId={editingTextBoxId}
          onTextBoxEdit={onTextBoxEdit}
        />
        
        {/* Right-side panels container - stacks Edit Text Panel above Tool Hint */}
        <div className="absolute bottom-4 right-4 z-40 flex flex-col-reverse gap-4 items-end">
          {/* Tool Hint - Shows instructions for active tool on the right side, at the bottom */}
          <div className="max-w-sm">
            <PdfToolHint activeTool={activeTool} />
          </div>
          
          {/* Edit Text Panel - Above tooltip on the right side */}
          {editingTextBoxId && (() => {
            const editingTextBox = textBoxes.find(tb => tb.id === editingTextBoxId);
            if (!editingTextBox) return null;
            
            return (
              <div className="z-50">
                <EditTextBoxPanel
                  textBox={editingTextBox}
                  onUpdate={onTextBoxUpdate}
                  onSave={onTextBoxSave}
                  onClose={() => onTextBoxEdit?.(null)}
                />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Precise Placement Toggle - Only show for old annotation system */}
      {usePrecisePlacement && (activeTool === 'annotate' || activeTool === 'highlight') && (
        <div className="h-8 bg-[#2d2d30] border-t border-[#3e3e42] flex items-center justify-center px-4">
          <label className="flex items-center gap-2 text-[11px] text-[#858585] cursor-pointer">
            <input
              type="checkbox"
              checked={usePrecisePlacement}
              onChange={(e) => onPrecisePlacementChange(e.target.checked)}
              className="w-3 h-3"
            />
            <span>Click to set position (for Annotate/Highlight tools)</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default PdfDocumentView;

