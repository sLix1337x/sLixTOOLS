import React from 'react';
import { Merge, Split, X, Move, Palette, Pencil, FileImage, Type, Square, Circle, Minus, ArrowRight } from 'lucide-react';

interface PdfToolbarProps {
    setActiveModal: (modal: string | null) => void;
    activeModal: string | null;
    activeTool?: string | null;
    onToolChange?: (tool: string | null) => void;
    processingState: {
        isMerging: boolean;
        isSplitting: boolean;
        isDeleting: boolean;
        isReordering: boolean;
        isHighlighting: boolean;
        isAnnotating: boolean;
        isConverting: boolean;
    };
    onMergeClick: () => void;
}

const PdfToolbar = ({
    setActiveModal,
    activeModal,
    activeTool = null,
    onToolChange,
    processingState,
    onMergeClick
}: PdfToolbarProps) => {
    return (
        <div className="mb-4">
            {/* Icon-only toolbar with category labels */}
            <div className="flex items-center justify-center bg-gradient-to-r from-slate-500/15 to-slate-600/10 rounded-lg border border-slate-500/25 shadow-sm hover:shadow-slate-500/20 transition-all duration-200 p-3 gap-1 overflow-x-auto">
                {/* FILE category */}
                <span className="text-xs text-blue-400 font-semibold tracking-wide mr-1">FILE</span>
                <button
                    onClick={onMergeClick}
                    disabled={processingState.isMerging}
                    className="flex items-center justify-center p-2 text-slate-300 hover:text-slate-100 hover:bg-slate-500/30 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Merge multiple PDFs into one document"
                >
                    <Merge className="h-4 w-4" />
                </button>

                <div className="w-px h-6 bg-gradient-to-b from-slate-400/50 to-slate-600/30 mx-2"></div>

                {/* PAGES category */}
                <span className="text-xs text-green-400 font-semibold tracking-wide mr-1">PAGES</span>
                <button
                    onClick={() => setActiveModal('split')}
                    disabled={processingState.isSplitting}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${activeModal === 'split'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Split PDF into separate pages or ranges"
                >
                    <Split className="h-4 w-4" />
                </button>

                <button
                    onClick={() => setActiveModal('delete')}
                    disabled={processingState.isDeleting}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${activeModal === 'delete'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Delete specific pages from PDF"
                >
                    <X className="h-4 w-4" />
                </button>

                <button
                    onClick={() => setActiveModal('reorder')}
                    disabled={processingState.isReordering}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${activeModal === 'reorder'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Reorder pages in custom sequence"
                >
                    <Move className="h-4 w-4" />
                </button>

                <div className="w-px h-6 bg-gradient-to-b from-slate-400/50 to-slate-600/30 mx-2"></div>

                {/* TEXT category */}
                <span className="text-xs text-purple-400 font-semibold tracking-wide mr-1">TEXT</span>
                <button
                    onClick={() => onToolChange?.('text')}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${activeTool === 'text'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Add text box"
                >
                    <Type className="h-4 w-4" />
                </button>
                
                <button
                    onClick={() => setActiveModal('highlight')}
                    disabled={processingState.isHighlighting}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${activeModal === 'highlight'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Highlight text with custom color"
                >
                    <Palette className="h-4 w-4" />
                </button>

                <button
                    onClick={() => setActiveModal('annotate')}
                    disabled={processingState.isAnnotating}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${activeModal === 'annotate'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Add text annotations to PDF"
                >
                    <Pencil className="h-4 w-4" />
                </button>

                <div className="w-px h-6 bg-gradient-to-b from-slate-400/50 to-slate-600/30 mx-2"></div>

                {/* DRAW category */}
                <span className="text-xs text-pink-400 font-semibold tracking-wide mr-1">DRAW</span>
                <button
                    onClick={() => onToolChange?.(activeTool === 'draw' ? null : 'draw')}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${activeTool === 'draw'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Freehand drawing"
                >
                    <Pencil className="h-4 w-4" />
                </button>
                
                <button
                    onClick={() => onToolChange?.(activeTool === 'rectangle' ? null : 'rectangle')}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${activeTool === 'rectangle'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Draw rectangle"
                >
                    <Square className="h-4 w-4" />
                </button>
                
                <button
                    onClick={() => onToolChange?.(activeTool === 'circle' ? null : 'circle')}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${activeTool === 'circle'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Draw circle"
                >
                    <Circle className="h-4 w-4" />
                </button>
                
                <button
                    onClick={() => onToolChange?.(activeTool === 'line' ? null : 'line')}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${activeTool === 'line'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Draw line"
                >
                    <Minus className="h-4 w-4" />
                </button>
                
                <button
                    onClick={() => onToolChange?.(activeTool === 'arrow' ? null : 'arrow')}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${activeTool === 'arrow'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Draw arrow"
                >
                    <ArrowRight className="h-4 w-4" />
                </button>

                <div className="w-px h-6 bg-gradient-to-b from-slate-400/50 to-slate-600/30 mx-2"></div>

                {/* EXPORT category */}
                <span className="text-xs text-orange-400 font-semibold tracking-wide mr-1">EXPORT</span>
                <button
                    onClick={() => setActiveModal('convert')}
                    disabled={processingState.isConverting}
                    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${activeModal === 'convert'
                        ? 'text-slate-100 bg-slate-500/40 shadow-md'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                        }`}
                    title="Convert PDF pages to image formats"
                >
                    <FileImage className="h-4 w-4" />
                </button>
            </div>

            {/* Explanatory text below toolbar */}
            <div className="mt-3 text-center">
                <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <Merge className="h-3 w-3" />
                        Merge
                    </span>
                    <span className="flex items-center gap-1">
                        <Split className="h-3 w-3" />
                        Split
                    </span>
                    <span className="flex items-center gap-1">
                        <X className="h-3 w-3" />
                        Delete
                    </span>
                    <span className="flex items-center gap-1">
                        <Move className="h-3 w-3" />
                        Reorder
                    </span>
                    <span className="flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        Highlight
                    </span>
                    <span className="flex items-center gap-1">
                        <Pencil className="h-3 w-3" />
                        Annotate
                    </span>
                    <span className="flex items-center gap-1">
                        <FileImage className="h-3 w-3" />
                        Convert
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PdfToolbar;
