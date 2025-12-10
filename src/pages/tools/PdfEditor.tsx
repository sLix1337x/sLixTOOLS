import React, { useCallback, useState, useEffect, useRef } from 'react';
import ToolPageLayout from '@/components/ToolPageLayout';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import PdfInfo from '@/components/tools/pdf/PdfInfo';
import PdfUpload from '@/components/tools/pdf/PdfUpload';
import PdfToolbar from '@/components/tools/pdf/PdfToolbar';
import PdfPreview from '@/components/tools/pdf/PdfPreview';
import PdfActionPanel from '@/components/tools/pdf/PdfActionPanel';
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
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `split_${selectedPages.join('-')}.pdf`);
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
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'annotated.pdf');
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
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'merged.pdf');
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
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'pages_deleted.pdf');
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
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'highlighted.pdf');
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
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'reordered.pdf');
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

        const renderContext = { canvasContext: ctx, viewport, canvas };
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

        const renderContext = { canvasContext: ctx, viewport, canvas };
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

          <PdfUpload
            onUpload={onUpload}
            resetAll={resetAll}
            isUploading={isUploading}
            hasFile={!!uploadedFile}
          />

          {pdfjsDoc && (
            <PdfPreview
              previewPage={previewPage}
              previewTotalPages={previewTotalPages}
              zoom={zoom}
              usePrecisePlacement={usePrecisePlacement}
              clickCoord={clickCoord}
              annotationText={annotationText}
              onPageChange={setPreviewPage}
              onZoomChange={setZoom}
              onPrecisePlacementChange={setUsePrecisePlacement}
              onCanvasClick={onCanvasClick}
              canvasRef={canvasRef}
              overlayRef={overlayRef}
            />
          )}

          {uploadedFile && (
            <>
              <PdfToolbar
                activeModal={activeModal}
                setActiveModal={setActiveModal}
                processingState={{
                  isMerging,
                  isSplitting,
                  isDeleting,
                  isReordering,
                  isHighlighting,
                  isAnnotating,
                  isConverting
                }}
                onMergeClick={() => document.getElementById('merge-files')?.click()}
              />

              <PdfInfo />
            </>
          )}

          <input
            id="merge-files"
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => onMultipleUpload(e.target.files)}
            className="hidden"
          />

          <PdfActionPanel
            activeModal={activeModal}
            setActiveModal={setActiveModal}
            uploadedFile={uploadedFile ? uploadedFile.file : null}
            uploadedFiles={uploadedFiles}

            splitRange={splitRange}
            pagesToDelete={pagesToDelete}
            pageOrder={pageOrder}
            highlightText={highlightText}
            highlightPage={highlightPage}
            highlightX={highlightX}
            highlightY={highlightY}
            highlightColor={highlightColor}
            annotationText={annotationText}
            annotationPage={annotationPage}
            annotationX={annotationX}
            annotationY={annotationY}
            imageFormat={imageFormat}

            setSplitRange={setSplitRange}
            setPagesToDelete={setPagesToDelete}
            setPageOrder={setPageOrder}
            setHighlightText={setHighlightText}
            setHighlightPage={setHighlightPage}
            setHighlightX={setHighlightX}
            setHighlightY={setHighlightY}
            setHighlightColor={setHighlightColor}
            setAnnotationText={setAnnotationText}
            setAnnotationPage={setAnnotationPage}
            setAnnotationX={setAnnotationX}
            setAnnotationY={setAnnotationY}
            setImageFormat={setImageFormat}

            onSplit={splitPdf}
            onDelete={deletePages}
            onReorder={reorderPages}
            onHighlight={highlightTextFunc}
            onAnnotate={annotatePdf}
            onConvert={convertToImages}
            onMerge={mergePdfs}

            processingState={{
              isSplitting,
              isDeleting,
              isReordering,
              isHighlighting,
              isAnnotating,
              isConverting,
              isMerging
            }}
          />
        </section>
      </div>
    </ToolPageLayout>
  );
};

export default PdfEditor;