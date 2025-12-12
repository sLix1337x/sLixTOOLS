import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, X, Split, Move, Palette, Pencil, FileImage } from 'lucide-react';

// Define complex types for props to keep things valid
interface PdfActionPanelProps {
    activeModal: string | null;
    setActiveModal: (modal: string | null) => void;
    uploadedFile: Blob | null; // Using Blob/null to check existence
    uploadedFiles: { name: string }[]; // Minimal interface for display

    // State Values
    splitRange: string;
    pagesToDelete: string;
    pageOrder: number[];
    highlightText: string;
    highlightPage: number;
    highlightX: number; // Changed from highlightX
    highlightY: number; // Changed from highlightY
    highlightColor: string;
    annotationText: string;
    annotationPage: number;
    annotationX: number;
    annotationY: number;
    imageFormat: string;

    // Setters
    setSplitRange: (val: string) => void;
    setPagesToDelete: (val: string) => void;
    setPageOrder: (val: number[]) => void;
    setHighlightText: (val: string) => void;
    setHighlightPage: (val: number) => void;
    setHighlightX: (val: number) => void;
    setHighlightY: (val: number) => void;
    setHighlightColor: (val: string) => void;
    setAnnotationText: (val: string) => void;
    setAnnotationPage: (val: number) => void;
    setAnnotationX: (val: number) => void;
    setAnnotationY: (val: number) => void;
    setImageFormat: (val: string) => void;

    // Actions
    onSplit: () => void;
    onDelete: () => void;
    onReorder: () => void;
    onHighlight: () => void;
    onAnnotate: () => void;
    onConvert: () => void;
    onMerge: () => void;

    // Processing States
    processingState: {
        isSplitting: boolean;
        isDeleting: boolean;
        isReordering: boolean;
        isHighlighting: boolean;
        isAnnotating: boolean;
        isConverting: boolean;
        isMerging: boolean;
    };
}

const PdfActionPanel = ({
    activeModal,
    setActiveModal,
    uploadedFile,
    uploadedFiles,

    splitRange,
    pagesToDelete,
    pageOrder,
    highlightText,
    highlightPage,
    highlightX,
    highlightY,
    highlightColor,
    annotationText,
    annotationPage,
    annotationX,
    annotationY,
    imageFormat,

    setSplitRange,
    setPagesToDelete,
    setPageOrder,
    setHighlightText,
    setHighlightPage,
    setHighlightX,
    setHighlightY,
    setHighlightColor,
    setAnnotationText,
    setAnnotationPage,
    setAnnotationX,
    setAnnotationY,
    setImageFormat,

    onSplit,
    onDelete,
    onReorder,
    onHighlight,
    onAnnotate,
    onConvert,
    onMerge,

    processingState
}: PdfActionPanelProps) => {
    return (
        <>
            {activeModal && (
                <div className="bg-black/30 border border-white/10 rounded-lg p-4 mb-4">
                    <div>
                        {activeModal === 'split' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Split className="text-yellow-400 h-4 w-4" />
                                        <h4 className="font-semibold text-yellow-400">Split PDF</h4>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="split-range">Pages to extract</Label>
                                        <input
                                            id="split-range"
                                            type="text"
                                            placeholder="e.g., 1-3,5,7-8 (leave empty for all)"
                                            value={splitRange}
                                            onChange={(e) => setSplitRange(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                        />
                                    </div>
                                    <Button onClick={onSplit} disabled={!uploadedFile || processingState.isSplitting} className="w-full h-10">
                                        <Download className="mr-2 h-4 w-4" />{processingState.isSplitting ? 'Splitting...' : 'Split & Download'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeModal === 'delete' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <X className="text-red-400 h-4 w-4" />
                                        <h4 className="font-semibold text-red-400">Delete Pages</h4>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="delete-pages">Pages to delete</Label>
                                        <input
                                            id="delete-pages"
                                            type="text"
                                            placeholder="e.g., 1-3,5,7-8"
                                            value={pagesToDelete}
                                            onChange={(e) => setPagesToDelete(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                        />
                                    </div>
                                    <Button onClick={onDelete} disabled={!uploadedFile || processingState.isDeleting} className="w-full h-10">
                                        <Download className="mr-2 h-4 w-4" />{processingState.isDeleting ? 'Deleting...' : 'Delete & Download'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeModal === 'reorder' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Move className="text-cyan-400 h-4 w-4" />
                                        <h4 className="font-semibold text-cyan-400">Reorder Pages</h4>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="page-order">Page order</Label>
                                        <input
                                            id="page-order"
                                            type="text"
                                            placeholder="e.g., 3,1,2,4"
                                            value={pageOrder.join(',')}
                                            onChange={(e) => {
                                                const order = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                                                setPageOrder(order);
                                            }}
                                            className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400">Enter page numbers in desired order, separated by commas</p>
                                    <Button onClick={onReorder} disabled={!uploadedFile || processingState.isReordering} className="w-full h-10">
                                        <Download className="mr-2 h-4 w-4" />{processingState.isReordering ? 'Reordering...' : 'Reorder & Download'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeModal === 'highlight' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Palette className="text-orange-400 h-4 w-4" />
                                        <h4 className="font-semibold text-orange-400">Highlight Text</h4>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label htmlFor="highlight-text">Text</Label>
                                            <input
                                                id="highlight-text"
                                                type="text"
                                                placeholder="Text to highlight"
                                                value={highlightText}
                                                onChange={(e) => setHighlightText(e.target.value)}
                                                className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="highlight-page">Page</Label>
                                            <input
                                                id="highlight-page"
                                                type="number"
                                                min={1}
                                                value={highlightPage}
                                                onChange={(e) => setHighlightPage(parseInt(e.target.value || '1', 10))}
                                                className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="highlight-x">X Position</Label>
                                            <input
                                                id="highlight-x"
                                                type="number"
                                                value={highlightX}
                                                onChange={(e) => setHighlightX(parseInt(e.target.value || '0', 10))}
                                                className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="highlight-y">Y Position</Label>
                                            <input
                                                id="highlight-y"
                                                type="number"
                                                value={highlightY}
                                                onChange={(e) => setHighlightY(parseInt(e.target.value || '0', 10))}
                                                className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="highlight-color">Color</Label>
                                        <input
                                            id="highlight-color"
                                            type="color"
                                            value={highlightColor}
                                            onChange={(e) => setHighlightColor(e.target.value)}
                                            className="w-20 mt-1 px-1 py-1 rounded-md bg-black/40 border border-white/20"
                                        />
                                    </div>
                                    <Button onClick={onHighlight} disabled={!uploadedFile || processingState.isHighlighting} className="w-full h-10">
                                        <Download className="mr-2 h-4 w-4" />{processingState.isHighlighting ? 'Highlighting...' : 'Highlight & Download'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeModal === 'annotate' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Pencil className="text-purple-400 h-4 w-4" />
                                        <h4 className="font-semibold text-purple-400">Add Text Annotation</h4>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label htmlFor="annotation-text">Text</Label>
                                            <input
                                                id="annotation-text"
                                                type="text"
                                                placeholder="Enter text"
                                                value={annotationText}
                                                onChange={(e) => setAnnotationText(e.target.value)}
                                                className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="annotation-page">Page</Label>
                                            <input
                                                id="annotation-page"
                                                type="number"
                                                min={1}
                                                value={annotationPage}
                                                onChange={(e) => setAnnotationPage(parseInt(e.target.value || '1', 10))}
                                                className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="annotation-x">X Position</Label>
                                            <input
                                                id="annotation-x"
                                                type="number"
                                                value={annotationX}
                                                onChange={(e) => setAnnotationX(parseInt(e.target.value || '0', 10))}
                                                className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="annotation-y">Y Position</Label>
                                            <input
                                                id="annotation-y"
                                                type="number"
                                                value={annotationY}
                                                onChange={(e) => setAnnotationY(parseInt(e.target.value || '0', 10))}
                                                className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-white/20 text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                    <Button onClick={onAnnotate} disabled={!uploadedFile || processingState.isAnnotating} className="w-full h-10">
                                        <Download className="mr-2 h-4 w-4" />{processingState.isAnnotating ? 'Annotating...' : 'Annotate & Download'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeModal === 'convert' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <FileImage className="text-green-400 h-4 w-4" />
                                        <h4 className="font-semibold text-green-400">Convert to Images</h4>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-400">Convert all PDF pages to images in a ZIP file</p>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">Output Format:</label>
                                        <select
                                            value={imageFormat}
                                            onChange={(e) => setImageFormat(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="png">PNG (Lossless)</option>
                                            <option value="jpeg">JPEG (Compressed)</option>
                                            <option value="webp">WebP (Modern)</option>
                                            <option value="bmp">BMP (Bitmap)</option>
                                            <option value="tiff">TIFF (High Quality)</option>
                                        </select>
                                    </div>
                                    <Button onClick={onConvert} disabled={!uploadedFile || processingState.isConverting} className="w-full h-10">
                                        <Download className="mr-2 h-4 w-4" />{processingState.isConverting ? 'Converting...' : `Convert to ${imageFormat.toUpperCase()} & Download`}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Merge Files Display - NOW VISIBLE OUTSIDE OF ACTIVE MODAL CHECK */}
            {uploadedFiles.length > 0 && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-blue-300">Files to Merge</h5>
                        <Button onClick={onMerge} disabled={uploadedFiles.length < 2 || processingState.isMerging} size="sm">
                            <Download className="mr-1 h-3 w-3" />{processingState.isMerging ? 'Merging...' : 'Merge & Download'}
                        </Button>
                    </div>
                    <div className="text-sm text-gray-400">
                        {uploadedFiles.length} files: {uploadedFiles.map(f => f.name).join(', ')}
                    </div>
                </div>
            )}
        </>
    );
};

export default PdfActionPanel;
