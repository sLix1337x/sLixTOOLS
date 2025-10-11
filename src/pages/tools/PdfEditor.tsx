import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import ToolPageLayout from '@/components/ToolPageLayout';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, Split, Download, Upload, Trash2, Pencil, Merge, X, Palette, Move, FileImage } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker to use local file to avoid CSP issues
// Use window.location.origin + base path for GitHub Pages compatibility
const isGitHubPages = window.location.hostname.includes('github.io');
pdfjsLib.GlobalWorkerOptions.workerSrc = isGitHubPages 
  ? `${window.location.origin}/sLixTOOLS/workers/pdf.worker.min.mjs`
  : '/workers/pdf.worker.min.mjs';

// Dynamically import pdf-lib when needed to keep initial bundle small
const loadPdfLib = async () => {
  const pdfLib = await import('pdf-lib');
  return pdfLib;
};

// Utility function to convert preview coordinates to PDF coordinates
const convertPreviewToPdfCoordinates = (
  clickCoord: { x: number; y: number },
  baseViewportDims: { width: number; height: number },
  pageSize: { width: number; height: number }
): { x: number; y: number } => {
  if (baseViewportDims.width <= 0 || baseViewportDims.height <= 0) {
    return { x: 50, y: 50 }; // fallback
  }
  
  const pxToPtX = pageSize.width / baseViewportDims.width;
  const pxToPtY = pageSize.height / baseViewportDims.height;
  const targetX = clickCoord.x * pxToPtX;
  // PDF origin is bottom-left, preview origin is top-left
  const targetY = pageSize.height - clickCoord.y * pxToPtY;
  
  return { x: targetX, y: targetY };
};

type LoadedPdf = {
  file: File;
  name: string;
  arrayBuffer: ArrayBuffer;
};

const PdfEditor: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<LoadedPdf | null>(null);
  // New state for multiple files for merging
  const [uploadedFiles, setUploadedFiles] = useState<LoadedPdf[]>([]);
  const [splitRange, setSplitRange] = useState<string>(''); // e.g., "1-3,5,7-8"
  const [annotationText, setAnnotationText] = useState<string>('');
  const [annotationPage, setAnnotationPage] = useState<number>(1);
  const [annotationX, setAnnotationX] = useState<number>(50);
  const [annotationY, setAnnotationY] = useState<number>(50);

  // New state for page operations
  const [pagesToDelete, setPagesToDelete] = useState<string>('');
  const [highlightColor, setHighlightColor] = useState<string>('#ffff00');
  const [highlightText, setHighlightText] = useState<string>('');
  const [highlightPage, setHighlightPage] = useState<number>(1);
  const [highlightX, setHighlightX] = useState<number>(50);
  const [highlightY, setHighlightY] = useState<number>(50);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [imageFormat, setImageFormat] = useState<string>('png');

  // Modal state for compact toolbar
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Loading states for better UX
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isHighlighting, setIsHighlighting] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isReordering, setIsReordering] = useState<boolean>(false);

  // Preview state (PDF.js)
  const [pdfjsDoc, setPdfjsDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewTotalPages, setPreviewTotalPages] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [baseViewportDims, setBaseViewportDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [usePrecisePlacement, setUsePrecisePlacement] = useState<boolean>(true);
  const [clickCoord, setClickCoord] = useState<{ x: number; y: number } | null>(null);

  const resetAll = useCallback(() => {
    setUploadedFile(null);
    setUploadedFiles([]);
    setSplitRange('');
    setAnnotationText('');
    setAnnotationPage(1);
    setAnnotationX(50);
    setAnnotationY(50);
    setPagesToDelete('');
    setHighlightText('');
    setHighlightPage(1);
    setHighlightX(50);
    setHighlightY(50);
    setPageOrder([]);
    setImageFormat('png');
    
    // Properly dispose of PDF.js document to prevent memory leaks
    if (pdfjsDoc) {
      pdfjsDoc.destroy();
    }
    setPdfjsDoc(null);
    setPreviewPage(1);
    setPreviewTotalPages(0);
    setZoom(1);
    setBaseViewportDims({ width: 0, height: 0 });
    setClickCoord(null);
    
    // Reset loading states
    setIsUploading(false);
    setIsSplitting(false);
    setIsAnnotating(false);
    setIsMerging(false);
    setIsDeleting(false);
    setIsHighlighting(false);
    setIsConverting(false);
    setIsReordering(false);
  }, [pdfjsDoc]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
    };
  }, [pdfjsDoc]);

  const onUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    
    try {
      const ab = await file.arrayBuffer();
      const loaded = { file, name: file.name, arrayBuffer: ab };
      setUploadedFile(loaded);
      
      // Load with PDF.js for preview
      const loadingTask = pdfjsLib.getDocument({ data: ab });
      const doc = await loadingTask.promise;
      
      // Dispose of previous document if exists
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
      
      setPdfjsDoc(doc);
      setPreviewTotalPages(doc.numPages);
      setPreviewPage(1);
      setClickCoord(null);
      // Initialize page order for reordering
      setPageOrder(Array.from({ length: doc.numPages }, (_, i) => i + 1));
      toast.success('PDF loaded for preview');
    } catch (error) {
      console.error('PDF upload error:', error);
      toast.error('Failed to load PDF preview. Please check if the file is valid.');
      
      // Reset state on error
      setUploadedFile(null);
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
      setPdfjsDoc(null);
      setPreviewTotalPages(0);
      setPreviewPage(1);
    } finally {
      setIsUploading(false);
    }
  }, [pdfjsDoc]);

  const downloadBlob = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  // Merge disabled in single-upload mode

  const parseRanges = useCallback((input: string, maxPages: number): number[] => {
    // e.g., "1-3,5,7-8" -> [1,2,3,5,7,8]
    const pages = new Set<number>();
    const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        let start = parseInt(startStr, 10);
        let end = parseInt(endStr, 10);
        if (Number.isNaN(start) || Number.isNaN(end)) continue;
        if (start > end) [start, end] = [end, start];
        start = Math.max(1, start);
        end = Math.min(maxPages, end);
        for (let i = start; i <= end; i++) pages.add(i);
      } else {
        const p = parseInt(part, 10);
        if (!Number.isNaN(p) && p >= 1 && p <= maxPages) pages.add(p);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }, []);

  const splitPdf = useCallback(async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }
    
    setIsSplitting(true);
    
    try {
      const { PDFDocument } = await loadPdfLib();
      const srcDoc = await PDFDocument.load(uploadedFile.arrayBuffer);
      const maxPages = srcDoc.getPageCount();
      const selectedPages = splitRange ? parseRanges(splitRange, maxPages) : srcDoc.getPageIndices().map((i) => i + 1);
      if (selectedPages.length === 0) {
        toast.error('No valid pages selected');
        return;
      }
      const outDoc = await PDFDocument.create();
      const pagesToCopy = selectedPages.map((p) => p - 1);
      const copied = await outDoc.copyPages(srcDoc, pagesToCopy);
      copied.forEach((p) => outDoc.addPage(p));
      const bytes = await outDoc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `split_${selectedPages.join('-')}.pdf`);
      toast.success('Split PDF generated');
    } catch (err) {
      console.error('Split PDF error:', err);
      toast.error('Failed to split PDF. Please check if the file is valid.');
    } finally {
      setIsSplitting(false);
    }
  }, [uploadedFile, splitRange, parseRanges, downloadBlob]);

  const annotatePdf = useCallback(async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }
    if (!annotationText.trim()) {
      toast.error('Enter annotation text');
      return;
    }
    
    setIsAnnotating(true);
    
    try {
      const { PDFDocument, rgb, StandardFonts } = await loadPdfLib();
      const doc = await PDFDocument.load(uploadedFile.arrayBuffer);
      const pageCount = doc.getPageCount();
      const pageIndex = Math.min(Math.max(annotationPage - 1, 0), pageCount - 1);
      const page = doc.getPage(pageIndex);

      // Use utility function for coordinate conversion
      let targetX = annotationX;
      let targetY = annotationY;
      if (clickCoord && baseViewportDims.width > 0 && baseViewportDims.height > 0) {
        const pageSize = page.getSize();
        const converted = convertPreviewToPdfCoordinates(clickCoord, baseViewportDims, pageSize);
        targetX = converted.x;
        targetY = converted.y;
      }

      const font = await doc.embedFont(StandardFonts.Helvetica);
      page.drawText(annotationText, {
        x: targetX,
        y: targetY,
        size: 12,
        font,
        color: rgb(1, 0, 0),
      });

      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'annotated.pdf');
      toast.success('Annotation added');
    } catch (err) {
      console.error('Annotation error:', err);
      toast.error('Failed to annotate PDF. Please check if the file is valid.');
    } finally {
      setIsAnnotating(false);
    }
  }, [uploadedFile, annotationText, annotationPage, annotationX, annotationY, downloadBlob, clickCoord, baseViewportDims]);

  // New function for multiple file upload (for merging)
  const onMultipleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const loadedFiles: LoadedPdf[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== 'application/pdf') {
          toast.error(`File ${file.name} is not a PDF`);
          continue;
        }
        
        const ab = await file.arrayBuffer();
        loadedFiles.push({ file, name: file.name, arrayBuffer: ab });
      }
      
      setUploadedFiles(loadedFiles);
      toast.success(`${loadedFiles.length} PDF files loaded for merging`);
    } catch (error) {
      console.error('Multiple PDF upload error:', error);
      toast.error('Failed to load PDF files');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // PDF Merging function
  const mergePdfs = useCallback(async () => {
    if (uploadedFiles.length < 2) {
      toast.error('Please upload at least 2 PDF files to merge');
      return;
    }
    
    setIsMerging(true);
    
    try {
      const { PDFDocument } = await loadPdfLib();
      const mergedDoc = await PDFDocument.create();
      
      for (const pdfFile of uploadedFiles) {
        const doc = await PDFDocument.load(pdfFile.arrayBuffer);
        const pageIndices = doc.getPageIndices();
        const pages = await mergedDoc.copyPages(doc, pageIndices);
        pages.forEach((page) => mergedDoc.addPage(page));
      }
      
      const bytes = await mergedDoc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'merged.pdf');
      toast.success('PDFs merged successfully');
    } catch (err) {
      console.error('Merge PDF error:', err);
      toast.error('Failed to merge PDFs');
    } finally {
      setIsMerging(false);
    }
  }, [uploadedFiles, downloadBlob]);

  // Page deletion function
  const deletePages = useCallback(async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }
    if (!pagesToDelete.trim()) {
      toast.error('Please specify pages to delete');
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const { PDFDocument } = await loadPdfLib();
      const srcDoc = await PDFDocument.load(uploadedFile.arrayBuffer);
      const maxPages = srcDoc.getPageCount();
      const pagesToRemove = parseRanges(pagesToDelete, maxPages);
      
      if (pagesToRemove.length === 0) {
        toast.error('No valid pages specified');
        return;
      }
      
      if (pagesToRemove.length >= maxPages) {
        toast.error('Cannot delete all pages');
        return;
      }
      
      const outDoc = await PDFDocument.create();
      const allPages = Array.from({ length: maxPages }, (_, i) => i + 1);
      const pagesToKeep = allPages.filter(page => !pagesToRemove.includes(page));
      
      const pagesToCopy = pagesToKeep.map(p => p - 1);
      const copied = await outDoc.copyPages(srcDoc, pagesToCopy);
      copied.forEach((p) => outDoc.addPage(p));
      
      const bytes = await outDoc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'pages_deleted.pdf');
      toast.success(`Deleted pages ${pagesToRemove.join(', ')}`);
    } catch (err) {
      console.error('Delete pages error:', err);
      toast.error('Failed to delete pages');
    } finally {
      setIsDeleting(false);
    }
  }, [uploadedFile, pagesToDelete, parseRanges, downloadBlob]);

  // Text highlighting function
  const highlightTextFunc = useCallback(async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }
    if (!highlightText.trim()) {
      toast.error('Enter text to highlight');
      return;
    }
    
    setIsHighlighting(true);
    
    try {
      const { PDFDocument, rgb } = await loadPdfLib();
      const doc = await PDFDocument.load(uploadedFile.arrayBuffer);
      const pageCount = doc.getPageCount();
      const pageIndex = Math.min(Math.max(highlightPage - 1, 0), pageCount - 1);
      const page = doc.getPage(pageIndex);

      // Convert hex color to RGB
      const hexColor = highlightColor.replace('#', '');
      const r = parseInt(hexColor.substr(0, 2), 16) / 255;
      const g = parseInt(hexColor.substr(2, 2), 16) / 255;
      const b = parseInt(hexColor.substr(4, 2), 16) / 255;

      // Use utility function for coordinate conversion
      let targetX = highlightX;
      let targetY = highlightY;
      if (clickCoord && baseViewportDims.width > 0 && baseViewportDims.height > 0) {
        const pageSize = page.getSize();
        const converted = convertPreviewToPdfCoordinates(clickCoord, baseViewportDims, pageSize);
        targetX = converted.x;
        targetY = converted.y;
      }

      // Draw highlight rectangle
      const textWidth = highlightText.length * 8; // Approximate text width
      page.drawRectangle({
        x: targetX,
        y: targetY - 2,
        width: textWidth,
        height: 16,
        color: rgb(r, g, b),
        opacity: 0.3,
      });

      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'highlighted.pdf');
      toast.success('Text highlighted');
    } catch (err) {
      console.error('Highlight error:', err);
      toast.error('Failed to highlight text');
    } finally {
      setIsHighlighting(false);
    }
  }, [uploadedFile, highlightText, highlightPage, highlightX, highlightY, highlightColor, downloadBlob, clickCoord, baseViewportDims]);

  // Page reordering function
  const reorderPages = useCallback(async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }
    if (pageOrder.length === 0) {
      toast.error('No page order specified');
      return;
    }
    
    setIsReordering(true);
    
    try {
      const { PDFDocument } = await loadPdfLib();
      const srcDoc = await PDFDocument.load(uploadedFile.arrayBuffer);
      const maxPages = srcDoc.getPageCount();
      
      // Validate page order
      const validPages = pageOrder.filter(p => p >= 1 && p <= maxPages);
      if (validPages.length === 0) {
        toast.error('No valid pages in order');
        return;
      }
      
      const outDoc = await PDFDocument.create();
      const pagesToCopy = validPages.map(p => p - 1);
      const copied = await outDoc.copyPages(srcDoc, pagesToCopy);
      copied.forEach((p) => outDoc.addPage(p));
      
      const bytes = await outDoc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'reordered.pdf');
      toast.success('Pages reordered successfully');
    } catch (err) {
      console.error('Reorder pages error:', err);
      toast.error('Failed to reorder pages');
    } finally {
      setIsReordering(false);
    }
  }, [uploadedFile, pageOrder, downloadBlob]);

  // Format conversion function
  const convertToImages = useCallback(async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }
    
    setIsConverting(true);
    
    try {
      if (!pdfjsDoc) {
        toast.error('PDF not loaded for preview');
        return;
      }
      
      const zip = await import('jszip');
      const JSZip = zip.default;
      const zipFile = new JSZip();
      
      // Define format configurations
      const formatConfig = {
        png: { mimeType: 'image/png', extension: 'png', quality: undefined },
        jpeg: { mimeType: 'image/jpeg', extension: 'jpg', quality: 0.9 },
        webp: { mimeType: 'image/webp', extension: 'webp', quality: 0.9 },
        bmp: { mimeType: 'image/bmp', extension: 'bmp', quality: undefined },
        tiff: { mimeType: 'image/tiff', extension: 'tiff', quality: undefined }
      };
      
      const config = formatConfig[imageFormat as keyof typeof formatConfig] || formatConfig.png;
      
      for (let pageNum = 1; pageNum <= pdfjsDoc.numPages; pageNum++) {
        const page = await pdfjsDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 }); // Higher scale for better quality
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = { canvasContext: ctx, viewport } as any;
        await page.render(renderContext).promise;
        
        // Convert canvas to blob with selected format
        const blob = await new Promise<Blob>((resolve) => {
          if (config.quality !== undefined) {
            canvas.toBlob((blob) => resolve(blob!), config.mimeType, config.quality);
          } else {
            canvas.toBlob((blob) => resolve(blob!), config.mimeType);
          }
        });
        
        zipFile.file(`page_${pageNum}.${config.extension}`, blob);
      }
      
      const zipBlob = await zipFile.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `pdf_pages_${imageFormat}.zip`);
      toast.success(`PDF converted to ${imageFormat.toUpperCase()} images`);
    } catch (err) {
      console.error('Convert error:', err);
      toast.error('Failed to convert PDF to images');
    } finally {
      setIsConverting(false);
    }
  }, [uploadedFile, pdfjsDoc, downloadBlob, imageFormat]);

  // Optimized render effect with better dependency management
  useEffect(() => {
    let isCancelled = false;
    
    const render = async () => {
      if (!pdfjsDoc || !canvasRef.current || isCancelled) return;
      
      try {
        const page = await pdfjsDoc.getPage(previewPage);
        if (isCancelled) return;
        
        const baseViewport = page.getViewport({ scale: 1 });
        setBaseViewportDims({ width: baseViewport.width, height: baseViewport.height });
        
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx || isCancelled) return;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = { canvasContext: ctx, viewport } as any;
        await page.render(renderContext).promise;
      } catch (error) {
        if (!isCancelled) {
          console.error('PDF render error:', error);
          toast.error('Failed to render PDF page');
        }
      }
    };
    
    render();
    
    // Cleanup function to cancel ongoing render if component unmounts or dependencies change
    return () => {
      isCancelled = true;
    };
  }, [pdfjsDoc, previewPage, zoom]);

  const onCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!usePrecisePlacement || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom; // normalize to scale 1 px
    const y = (e.clientY - rect.top) / zoom;
    setClickCoord({ x, y });
    setAnnotationPage(previewPage);
    toast.success('Position captured from preview');
  }, [usePrecisePlacement, zoom, previewPage]);

  return (
    <ToolPageLayout
      title="PDF Editor - sLixTOOLS"
      description="Upload a PDF, preview pages, and annotate precisely in your browser. All processing happens locally for maximum privacy."
      keywords="PDF editor, PDF annotation, PDF split, PDF tools, browser PDF editor"
      canonicalUrl="https://slixtools.io/tools/pdf-editor"
      pageTitle="PDF Editor - sLixTOOLS"
      pageDescription="Upload a PDF, preview pages, and annotate precisely in your browser. All processing happens locally for maximum privacy."
    >
      <div className="space-y-8">
        {/* PDF Editor - Combined Upload, Preview & Editing Tools */}
        <section className="border border-white/10 rounded-lg p-4" style={{ backgroundColor: '#171714' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-blue-400" />
            <h3 className="text-lg font-bold">PDF Editor</h3>
          </div>
          
          {/* Upload Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="text-gray-400 h-4 w-4" />
              <h4 className="font-semibold text-gray-300">Upload PDF</h4>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <input type="file" accept="application/pdf" onChange={(e) => onUpload(e.target.files)} disabled={isUploading} />
              <Button variant="secondary" onClick={resetAll} disabled={isUploading}><Trash2 className="mr-2 h-4 w-4" />Clear</Button>
              {isUploading && <span className="text-sm text-gray-400">Loading PDF...</span>}
            </div>
          </div>

          {/* Preview Section */}
          {pdfjsDoc && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="text-gray-400 h-4 w-4" />
                <h4 className="font-semibold text-gray-300">Preview & Navigation</h4>
              </div>
              
              {/* Preview Controls */}
              <div className="mb-3 flex items-center gap-3">
                <Button variant="secondary" onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <span className="text-sm text-gray-300">Page {previewPage} / {previewTotalPages}</span>
                <Button variant="secondary" onClick={() => setPreviewPage((p) => Math.min(previewTotalPages, p + 1))}>Next</Button>
                <div className="flex items-center gap-2 ml-4">
                  <Label htmlFor="zoom">Zoom</Label>
                  <input id="zoom" type="range" min={0.5} max={2} step={0.1} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
                  <span className="text-sm text-gray-300">{Math.round(zoom * 100)}%</span>
                </div>
                <label className="ml-4 flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={usePrecisePlacement} onChange={(e) => setUsePrecisePlacement(e.target.checked)} />
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
          )}

          {/* Editing Tools Section */}
          {uploadedFile && (
            <>
              <div className="mb-4">
                {/* Icon-only toolbar with category labels */}
                <div className="flex items-center justify-center bg-gradient-to-r from-slate-500/15 to-slate-600/10 rounded-lg border border-slate-500/25 shadow-sm hover:shadow-slate-500/20 transition-all duration-200 p-3 gap-1 overflow-x-auto">
                {/* FILE category */}
                <span className="text-xs text-blue-400 font-semibold tracking-wide mr-1">FILE</span>
                <button
                  onClick={() => document.getElementById('merge-files')?.click()}
                  disabled={isMerging}
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
                  disabled={isSplitting}
                  className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeModal === 'split' 
                      ? 'text-slate-100 bg-slate-500/40 shadow-md' 
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                  }`}
                  title="Split PDF into separate pages or ranges"
                >
                  <Split className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => setActiveModal('delete')}
                  disabled={isDeleting}
                  className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeModal === 'delete' 
                      ? 'text-slate-100 bg-slate-500/40 shadow-md' 
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                  }`}
                  title="Delete specific pages from PDF"
                >
                  <X className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => setActiveModal('reorder')}
                  disabled={isReordering}
                  className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeModal === 'reorder' 
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
                  onClick={() => setActiveModal('highlight')}
                  disabled={isHighlighting}
                  className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeModal === 'highlight' 
                      ? 'text-slate-100 bg-slate-500/40 shadow-md' 
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                  }`}
                  title="Highlight text with custom color"
                >
                  <Palette className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => setActiveModal('annotate')}
                  disabled={isAnnotating}
                  className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeModal === 'annotate' 
                      ? 'text-slate-100 bg-slate-500/40 shadow-md' 
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-500/30'
                  }`}
                  title="Add text annotations to PDF"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                
                <div className="w-px h-6 bg-gradient-to-b from-slate-400/50 to-slate-600/30 mx-2"></div>
                
                {/* EXPORT category */}
                <span className="text-xs text-orange-400 font-semibold tracking-wide mr-1">EXPORT</span>
                <button
                  onClick={() => setActiveModal('convert')}
                  disabled={isConverting}
                  className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeModal === 'convert' 
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

            {/* Comprehensive Tool Description */}
            <div className="mt-6 bg-gradient-to-br from-slate-800/40 to-slate-900/30 border border-slate-600/30 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-blue-500/20 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">PDF Editor - Complete Document Management</h3>
                  <div className="space-y-4 text-slate-300">
                    <p className="leading-relaxed">
                      Transform your PDF documents with our comprehensive editing suite. This powerful tool provides everything you need to manipulate, enhance, and convert PDF files with professional-grade precision.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-medium text-blue-400 mb-1">FILE Operations</h4>
                            <p className="text-sm text-slate-400">Merge multiple PDFs into a single document seamlessly</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-medium text-green-400 mb-1">PAGES Management</h4>
                            <p className="text-sm text-slate-400">Split documents, delete unwanted pages, and reorder content with drag-and-drop functionality</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-medium text-purple-400 mb-1">TEXT Enhancement</h4>
                            <p className="text-sm text-slate-400">Highlight important content and add custom annotations with precision</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 bg-orange-400 rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-medium text-orange-400 mb-1">EXPORT Options</h4>
                            <p className="text-sm text-slate-400">Convert PDF pages to high-quality image formats (PNG, JPG, WebP)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-600/30">
                      <h4 className="font-medium text-slate-200 mb-2">How to Use:</h4>
                      <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                        <li>Upload your PDF file using the upload area above</li>
                        <li>Select the desired operation from the color-coded toolbar</li>
                        <li>Follow the interactive prompts for each specific function</li>
                        <li>Preview your changes in real-time before finalizing</li>
                        <li>Download your edited document or converted images</li>
                      </ol>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
                      <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                      <span>All processing happens locally in your browser for maximum privacy and security</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}

          {/* Hidden file input for merge */}
          <input
            id="merge-files"
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => onMultipleUpload(e.target.files)}
            className="hidden"
          />

          {/* Modal Content Area */}
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
                        <Button onClick={splitPdf} disabled={!uploadedFile || isSplitting} className="w-full h-10">
                          <Download className="mr-2 h-4 w-4" />{isSplitting ? 'Splitting...' : 'Split & Download'}
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
                        <Button onClick={deletePages} disabled={!uploadedFile || isDeleting} className="w-full h-10">
                          <Download className="mr-2 h-4 w-4" />{isDeleting ? 'Deleting...' : 'Delete & Download'}
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
                        <Button onClick={reorderPages} disabled={!uploadedFile || isReordering} className="w-full h-10">
                          <Download className="mr-2 h-4 w-4" />{isReordering ? 'Reordering...' : 'Reorder & Download'}
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
                        <Button onClick={highlightTextFunc} disabled={!uploadedFile || isHighlighting} className="w-full h-10">
                          <Download className="mr-2 h-4 w-4" />{isHighlighting ? 'Highlighting...' : 'Highlight & Download'}
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
                        <Button onClick={annotatePdf} disabled={!uploadedFile || isAnnotating} className="w-full h-10">
                          <Download className="mr-2 h-4 w-4" />{isAnnotating ? 'Annotating...' : 'Annotate & Download'}
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
                        <Button onClick={convertToImages} disabled={!uploadedFile || isConverting} className="w-full h-10">
                          <Download className="mr-2 h-4 w-4" />{isConverting ? 'Converting...' : `Convert to ${imageFormat.toUpperCase()} & Download`}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Merge Files Display */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-blue-300">Files to Merge</h5>
                        <Button onClick={mergePdfs} disabled={uploadedFiles.length < 2 || isMerging} size="sm">
                          <Download className="mr-1 h-3 w-3" />{isMerging ? 'Merging...' : 'Merge & Download'}
                        </Button>
                      </div>
                      <div className="text-sm text-gray-400">
                        {uploadedFiles.length} files: {uploadedFiles.map(f => f.name).join(', ')}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </section>
      </div>
    </ToolPageLayout>
  );
};

export default PdfEditor;