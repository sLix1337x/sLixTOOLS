import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';

interface PdfPreviewProps {
    previewPage: number;
    previewTotalPages: number;
    zoom: number;
    usePrecisePlacement: boolean;
    clickCoord: { x: number; y: number } | null;
    annotationText: string;
    onPageChange: (newPage: number) => void;
    onZoomChange: (newZoom: number) => void;
    onPrecisePlacementChange: (checked: boolean) => void;
    onCanvasClick: (e: React.MouseEvent) => void;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    overlayRef: React.RefObject<HTMLDivElement>;
}

const PdfPreview = ({
    previewPage,
    previewTotalPages,
    zoom,
    usePrecisePlacement,
    clickCoord,
    annotationText,
    onPageChange,
    onZoomChange,
    onPrecisePlacementChange,
    onCanvasClick,
    canvasRef,
    overlayRef,
}: PdfPreviewProps) => {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <FileText className="text-gray-400 h-4 w-4" />
                <h4 className="font-semibold text-gray-300">Preview & Navigation</h4>
            </div>

            {/* Preview Controls */}
            <div className="mb-3 flex items-center gap-3">
                <Button variant="secondary" onClick={() => onPageChange(Math.max(1, previewPage - 1))}>Prev</Button>
                <span className="text-sm text-gray-300">Page {previewPage} / {previewTotalPages}</span>
                <Button variant="secondary" onClick={() => onPageChange(Math.min(previewTotalPages, previewPage + 1))}>Next</Button>
                <div className="flex items-center gap-2 ml-4">
                    <Label htmlFor="zoom">Zoom</Label>
                    <input
                        id="zoom"
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                    />
                    <span className="text-sm text-gray-300">{Math.round(zoom * 100)}%</span>
                </div>
                <label className="ml-4 flex items-center gap-2 text-sm text-gray-300">
                    <input
                        type="checkbox"
                        checked={usePrecisePlacement}
                        onChange={(e) => onPrecisePlacementChange(e.target.checked)}
                    />
                    Click to set position
                </label>
            </div>

            {/* Preview Canvas with overlay */}
            <div className="relative border border-white/10 rounded-md overflow-hidden mb-4" style={{ backgroundColor: '#0f0f0d' }}>
                <canvas ref={canvasRef} className="block max-w-full mx-auto" />
                <div
                    ref={overlayRef}
                    className="absolute inset-0 cursor-crosshair"
                    onClick={onCanvasClick}
                >
                    {clickCoord && (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${clickCoord.x * zoom}px`,
                                top: `${clickCoord.y * zoom}px`,
                                transform: 'translate(-50%, -100%)',
                                color: '#ff6363',
                                background: 'rgba(0,0,0,0.6)',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                fontSize: '12px',
                            }}
                        >
                            {annotationText || 'Text'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PdfPreview;
