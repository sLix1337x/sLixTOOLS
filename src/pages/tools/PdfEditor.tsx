import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import PdfUpload from '@/components/tools/pdf/PdfUpload';
import PdfActionPanel from '@/components/tools/pdf/PdfActionPanel';
import PdfMenuBar from '@/components/tools/pdf/PdfMenuBar';
import PdfRibbon, { type RibbonTab } from '@/components/tools/pdf/PdfRibbon';
import PdfSidebar from '@/components/tools/pdf/PdfSidebar';
import PdfDocumentView, { type ViewMode as DocumentViewMode } from '@/components/tools/pdf/PdfDocumentView';
import PdfStatusBar from '@/components/tools/pdf/PdfStatusBar';
import PdfProgressIndicator from '@/components/tools/pdf/PdfProgressIndicator';
import PdfConfirmDialog from '@/components/tools/pdf/PdfConfirmDialog';
import * as pdfjsLib from 'pdfjs-dist';
import { downloadBlob } from '@/utils/download';
import type { ToolType, ViewMode, TextBox, Drawing, PageRotation } from '@/types/pdfEditor';

// Configure PDF.js worker - use public directory file which Vite serves correctly
const isGitHubPages = window.location.hostname.includes('github.io');
const basePath = import.meta.env.BASE_URL || '/sLixTOOLS/';

// Set worker path - Always use base path to ensure correct serving
// Vite serves public files relative to base path in both dev and production
let workerPath: string;
if (isGitHubPages) {
  workerPath = `${window.location.origin}${basePath}workers/pdf.worker.min.mjs`;
} else {
  // Use base path for both dev and production
  workerPath = `${basePath}workers/pdf.worker.min.mjs`.replace(/\/\//g, '/');
}

// Set worker source immediately
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
console.log('PDF.js worker configured:', workerPath);

// Dynamically import pdf-lib when needed to keep initial bundle small
const loadPdfLib = async () => {
  const pdfLib = await import('pdf-lib');
  return pdfLib;
};

// Helper to create Rotation object for pdf-lib
// pdf-lib's Rotation type requires 'type' and 'angle' properties
// Use type assertion since RotationTypes enum may not be easily accessible
const createRotation = (degrees: number): any => {
  return { type: 'degrees', angle: degrees };
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

const PdfEditor = () => {
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
  
  // Enhanced tool state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [documentViewMode, setDocumentViewMode] = useState<DocumentViewMode>('single');
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [pageRotations, setPageRotations] = useState<Map<number, PageRotation>>(new Map());
  const [searchText, setSearchText] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ page: number; index: number }>>([]);
  
  // Text tool options
  const [textFontSize, setTextFontSize] = useState<number>(12);
  const [textColor, setTextColor] = useState<string>('#ffffff');
  
  // Double-click detection for text tool
  const [textClickState, setTextClickState] = useState<{
    pending: boolean;
    x: number;
    y: number;
    timestamp: number;
  } | null>(null);

  // New UI state
  const [ribbonTab, setRibbonTab] = useState<RibbonTab>('file');
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'thumbnails' | 'search' | 'properties'>('thumbnails');
  const [sidebarWidth, setSidebarWidth] = useState<number>(250);
  
  // Undo/Redo system
  const [history, setHistory] = useState<ArrayBuffer[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  
  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  
  // Progress tracking
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressValue, setProgressValue] = useState<number | undefined>(undefined);

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
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
      return;
    }
    // Direct reset if no unsaved changes
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

    // Reset enhanced features
    setActiveTool('select');
    setViewMode('single');
    setTextBoxes([]);
    setDrawings([]);
    setPageRotations(new Map());
    setSearchText('');
    setSearchResults([]);

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
    setHistory([]);
    setHistoryIndex(-1);
    setCanUndo(false);
    setCanRedo(false);
    setHasUnsavedChanges(false);

    // Reset loading states
    setIsUploading(false);
    setIsSplitting(false);
    setIsAnnotating(false);
    setIsMerging(false);
    setIsDeleting(false);
    setIsHighlighting(false);
    setIsConverting(false);
    setIsReordering(false);
  }, [hasUnsavedChanges, pdfjsDoc]);
  
  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
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

    // Reset enhanced features
    setActiveTool('select');
    setViewMode('single');
    setTextBoxes([]);
    setDrawings([]);
    setPageRotations(new Map());
    setSearchText('');
    setSearchResults([]);

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
    setHistory([]);
    setHistoryIndex(-1);
    setCanUndo(false);
    setCanRedo(false);
    setHasUnsavedChanges(false);

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

  // Ensure worker is configured on mount
  useEffect(() => {
    // Reconfigure worker path on mount to ensure it's correct
    // Use the same logic as the initial configuration
    const currentWorkerPath = pdfjsLib.GlobalWorkerOptions.workerSrc;
    if (!currentWorkerPath || currentWorkerPath.includes('node_modules')) {
      // If worker path is not set or points to node_modules, reconfigure
      let newWorkerPath: string;
      if (isGitHubPages) {
        newWorkerPath = `${window.location.origin}${basePath}workers/pdf.worker.min.mjs`;
      } else {
        newWorkerPath = `${basePath}workers/pdf.worker.min.mjs`.replace(/\/\//g, '/');
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = newWorkerPath;
      console.log('PDF.js worker reconfigured on mount:', newWorkerPath);
    }
  }, []);


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
      // Reset enhanced features
      setTextBoxes([]);
      setDrawings([]);
      setPageRotations(new Map());
      setSearchText('');
      setSearchResults([]);
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
      setHistory([]);
      setHistoryIndex(-1);
      setCanUndo(false);
      setCanRedo(false);
    } finally {
      setIsUploading(false);
    }
  }, [pdfjsDoc]);

  // Using downloadBlob from @/utils/download

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

  // Save state to history
  // Use functional updates to avoid stale closure issues with historyIndex
  const saveToHistory = useCallback((arrayBuffer: ArrayBuffer) => {
    setHistoryIndex((prevIndex) => {
      // Use the current index to slice history correctly
      setHistory((prevHistory) => {
        const newHistory = prevHistory.slice(0, prevIndex + 1);
        newHistory.push(arrayBuffer);
        // Limit history to 50 states
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        return newHistory;
      });
      
      const newIndex = Math.min(prevIndex + 1, 49);
      setCanUndo(newIndex > 0);
      setCanRedo(false);
      return newIndex;
    });
  }, []);

  const splitPdf = useCallback(async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }
    if (!splitRange.trim()) {
      toast.error('Please specify page ranges to split');
      return;
    }

    setIsSplitting(true);
    setProgressMessage('Splitting PDF...');
    setProgressValue(0);

    try {
      const { PDFDocument } = await loadPdfLib();
      const srcDoc = await PDFDocument.load(uploadedFile.arrayBuffer);
      const maxPages = srcDoc.getPageCount();
      const selectedPages = splitRange ? parseRanges(splitRange, maxPages) : srcDoc.getPageIndices().map((i) => i + 1);
      if (selectedPages.length === 0) {
        toast.error('No valid pages selected');
        return;
      }

      setProgressValue(30);
      const outDoc = await PDFDocument.create();
      const pagesToCopy = selectedPages.map((p) => p - 1);
      setProgressValue(60);
      const copied = await outDoc.copyPages(srcDoc, pagesToCopy);
      copied.forEach((p) => outDoc.addPage(p));

      setProgressValue(80);
      const bytes = await outDoc.save();
      setProgressValue(100);
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `split_${selectedPages.join('-')}.pdf`);
      toast.success('Split PDF generated successfully');
    } catch (err) {
      console.error('Split PDF error:', err);
      toast.error('Failed to split PDF. Please check if the file is valid.');
    } finally {
      setIsSplitting(false);
      setProgressMessage('');
      setProgressValue(undefined);
    }
  }, [uploadedFile, splitRange, parseRanges]);

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
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const arrayBuffer = await blob.arrayBuffer();
      
      // Update uploaded file
      const newFile = { ...uploadedFile, arrayBuffer };
      setUploadedFile(newFile);
      saveToHistory(arrayBuffer);
      setHasUnsavedChanges(true);
      
      // Reload PDF.js document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const newDoc = await loadingTask.promise;
      
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
      setPdfjsDoc(newDoc);
      
      toast.success('Annotation added');
    } catch (err) {
      console.error('Annotation error:', err);
      toast.error('Failed to annotate PDF. Please check if the file is valid.');
    } finally {
      setIsAnnotating(false);
    }
  }, [uploadedFile, annotationText, annotationPage, annotationX, annotationY, clickCoord, baseViewportDims, pdfjsDoc, saveToHistory]);

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

  // PDF Merging function with progress
  const mergePdfs = useCallback(async () => {
    if (uploadedFiles.length < 2) {
      toast.error('Please upload at least 2 PDF files to merge');
      return;
    }

    setIsMerging(true);
    setProgressMessage('Merging PDFs...');
    setProgressValue(0);

    try {
      const { PDFDocument } = await loadPdfLib();
      const mergedDoc = await PDFDocument.create();

      for (let i = 0; i < uploadedFiles.length; i++) {
        const pdfFile = uploadedFiles[i];
        const progress = Math.round((i / uploadedFiles.length) * 80);
        setProgressValue(progress);
        setProgressMessage(`Merging PDF ${i + 1} of ${uploadedFiles.length}...`);
        
        const doc = await PDFDocument.load(pdfFile.arrayBuffer);
        const pageIndices = doc.getPageIndices();
        const pages = await mergedDoc.copyPages(doc, pageIndices);
        pages.forEach((page) => mergedDoc.addPage(page));
      }

      setProgressValue(90);
      setProgressMessage('Finalizing merged PDF...');
      const bytes = await mergedDoc.save();
      setProgressValue(100);
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'merged.pdf');
      toast.success(`${uploadedFiles.length} PDFs merged successfully`);
    } catch (err) {
      console.error('Merge PDF error:', err);
      toast.error('Failed to merge PDFs');
    } finally {
      setIsMerging(false);
      setProgressMessage('');
      setProgressValue(undefined);
    }
  }, [uploadedFiles]);

  // Page deletion function with confirmation
  const deletePages = useCallback(async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first', {
        description: 'Click "Open" in the File menu or drag and drop a PDF file to get started.'
      });
      return;
    }
    if (!pagesToDelete.trim()) {
      toast.error('Please specify pages to delete', {
        description: 'Enter page numbers like "1-3,5,7-9" to select which pages to remove.'
      });
      return;
    }

    // Show confirmation dialog
    setShowDeleteConfirm(true);
  }, [uploadedFile, pagesToDelete]);
  
  const handleConfirmDelete = useCallback(async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setProgressMessage('Deleting pages...');
    setProgressValue(0);

    try {
      const { PDFDocument } = await loadPdfLib();
      const srcDoc = await PDFDocument.load(uploadedFile!.arrayBuffer);
      const maxPages = srcDoc.getPageCount();
      const pagesToRemove = parseRanges(pagesToDelete, maxPages);

      if (pagesToRemove.length === 0) {
        toast.error('No valid pages specified', {
          description: `The document has ${maxPages} page${maxPages > 1 ? 's' : ''}. Please enter valid page numbers (e.g., "1-3,5" or "1,2,3").`
        });
        return;
      }

      if (pagesToRemove.length >= maxPages) {
        toast.error('Cannot delete all pages', {
          description: `You tried to delete ${pagesToRemove.length} page${pagesToRemove.length > 1 ? 's' : ''}, but the document only has ${maxPages} page${maxPages > 1 ? 's' : ''}. At least one page must remain.`
        });
        return;
      }

      setProgressValue(30);
      const outDoc = await PDFDocument.create();
      const allPages = Array.from({ length: maxPages }, (_, i) => i + 1);
      const pagesToKeep = allPages.filter(page => !pagesToRemove.includes(page));

      setProgressValue(60);
      const pagesToCopy = pagesToKeep.map(p => p - 1);
      const copied = await outDoc.copyPages(srcDoc, pagesToCopy);
      copied.forEach((p) => outDoc.addPage(p));

      setProgressValue(80);
      const bytes = await outDoc.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const arrayBuffer = await blob.arrayBuffer();
      
      setProgressValue(90);
      // Update uploaded file
      const newFile = { ...uploadedFile!, arrayBuffer };
      setUploadedFile(newFile);
      saveToHistory(arrayBuffer);
      setHasUnsavedChanges(true);
      
      // Reload PDF.js document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const newDoc = await loadingTask.promise;
      
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
      setPdfjsDoc(newDoc);
      setPreviewTotalPages(newDoc.numPages);
      setPreviewPage(Math.min(previewPage, newDoc.numPages));
      
      setProgressValue(100);
      toast.success(`Deleted ${pagesToRemove.length} page${pagesToRemove.length > 1 ? 's' : ''}`, {
        description: `Removed pages: ${pagesToRemove.join(', ')}. The document now has ${newDoc.numPages} page${newDoc.numPages > 1 ? 's' : ''}.`
      });
    } catch (err) {
      console.error('Delete pages error:', err);
      toast.error('Failed to delete pages', {
        description: 'The PDF file may be corrupted or password-protected. Please try a different file.'
      });
    } finally {
      setIsDeleting(false);
      setProgressMessage('');
      setProgressValue(undefined);
    }
  }, [uploadedFile, pagesToDelete, parseRanges, pdfjsDoc, previewPage, saveToHistory]);

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
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const arrayBuffer = await blob.arrayBuffer();
      
      // Update uploaded file
      const newFile = { ...uploadedFile, arrayBuffer };
      setUploadedFile(newFile);
      saveToHistory(arrayBuffer);
      setHasUnsavedChanges(true);
      
      // Reload PDF.js document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const newDoc = await loadingTask.promise;
      
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
      setPdfjsDoc(newDoc);
      
      toast.success('Text highlighted');
    } catch (err) {
      console.error('Highlight error:', err);
      toast.error('Failed to highlight text');
    } finally {
      setIsHighlighting(false);
    }
  }, [uploadedFile, highlightText, highlightPage, highlightX, highlightY, highlightColor, clickCoord, baseViewportDims, pdfjsDoc, saveToHistory]);

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
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const arrayBuffer = await blob.arrayBuffer();
      
      // Update uploaded file
      const newFile = { ...uploadedFile, arrayBuffer };
      setUploadedFile(newFile);
      saveToHistory(arrayBuffer);
      setHasUnsavedChanges(true);
      
      // Reload PDF.js document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const newDoc = await loadingTask.promise;
      
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
      setPdfjsDoc(newDoc);
      
      toast.success('Pages reordered successfully');
    } catch (err) {
      console.error('Reorder pages error:', err);
      toast.error('Failed to reorder pages');
    } finally {
      setIsReordering(false);
    }
  }, [uploadedFile, pageOrder, pdfjsDoc, saveToHistory]);

  // Format conversion function with progress
  const convertToImages = useCallback(async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }

    setIsConverting(true);
    setProgressMessage('Converting PDF to images...');
    setProgressValue(0);

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
      const totalPages = pdfjsDoc.numPages;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const progress = Math.round((pageNum / totalPages) * 90);
        setProgressValue(progress);
        setProgressMessage(`Converting page ${pageNum} of ${totalPages}...`);

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

      setProgressValue(95);
      setProgressMessage('Creating ZIP file...');
      const zipBlob = await zipFile.generateAsync({ type: 'blob' });
      setProgressValue(100);
      downloadBlob(zipBlob, `pdf_pages_${imageFormat}.zip`);
      toast.success(`PDF converted to ${imageFormat.toUpperCase()} images successfully`);
    } catch (err) {
      console.error('Convert error:', err);
      toast.error('Failed to convert PDF to images');
    } finally {
      setIsConverting(false);
      setProgressMessage('');
      setProgressValue(undefined);
    }
  }, [uploadedFile, pdfjsDoc, imageFormat]);

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

  // Old annotation system - only works when usePrecisePlacement is enabled
  const onCanvasClick = useCallback((e: React.MouseEvent) => {
    // This is only for the old annotation/highlight system with manual coordinates
    // The new tools (draw, text) have their own handlers
    if (!usePrecisePlacement || !overlayRef.current || !canvasRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Store click coordinates for annotation/highlight tools
    // These will be converted to PDF coordinates when the annotation is applied
    setClickCoord({ x: canvasX, y: canvasY });
    setAnnotationPage(previewPage);
    setHighlightPage(previewPage);
    
    // Also update baseViewportDims for coordinate conversion
    if (canvasRef.current.width > 0 && canvasRef.current.height > 0) {
      setBaseViewportDims({
        width: canvasRef.current.width,
        height: canvasRef.current.height
      });
    }
    
    toast.success('Position captured - fill in the form and click Annotate/Highlight');
  }, [usePrecisePlacement, previewPage]);

  // Page rotation function
  const rotatePage = useCallback(async (pageNum: number, rotation: 90 | 180 | 270) => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }

    try {
      const { PDFDocument } = await loadPdfLib();
      const doc = await PDFDocument.load(uploadedFile.arrayBuffer);
      const pageIndex = pageNum - 1;
      
      if (pageIndex < 0 || pageIndex >= doc.getPageCount()) {
        toast.error('Invalid page number');
        return;
      }

      const page = doc.getPage(pageIndex);
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + rotation) % 360;
      // pdf-lib setRotation expects a Rotation object with angle property
      const validRotation = (newRotation % 360) as 0 | 90 | 180 | 270;
      page.setRotation(createRotation(validRotation));

      const bytes = await doc.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      
      // Update uploaded file with rotated version
      const arrayBuffer = await blob.arrayBuffer();
      const newFile = { ...uploadedFile, arrayBuffer };
      setUploadedFile(newFile);
      saveToHistory(arrayBuffer);
      
      // Reload PDF.js document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const newDoc = await loadingTask.promise;
      
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
      setPdfjsDoc(newDoc);
      
      // Update rotation map
      const newRotations = new Map(pageRotations);
      newRotations.set(pageNum, { pageIndex: pageIndex, rotation: newRotation as 0 | 90 | 180 | 270 });
      setPageRotations(newRotations);
      
      toast.success(`Page ${pageNum} rotated ${rotation}°`);
    } catch (err) {
      console.error('Rotate page error:', err);
      toast.error('Failed to rotate page');
    }
  }, [uploadedFile, pdfjsDoc, pageRotations, saveToHistory]);

  // Handle page reorder from thumbnails
  const handlePageReorder = useCallback((newOrder: number[]) => {
    setPageOrder(newOrder);
    toast.success('Page order updated. Click "Reorder" to apply.');
  }, []);

  // Annotation selection state
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [editingTextBoxId, setEditingTextBoxId] = useState<string | null>(null);
  
  // Handler for text box edit
  const handleTextBoxEdit = useCallback((id: string | null) => {
    setEditingTextBoxId(id);
  }, []);
  
  // Drawing tool state
  const [drawingColor, setDrawingColor] = useState<string>('#ff0000');
  const [drawingWidth, setDrawingWidth] = useState<number>(2);

  // Text box handlers
  const handleTextBoxUpdate = useCallback((id: string, updates: Partial<TextBox>) => {
    setTextBoxes((prev) => prev.map((tb) => (tb.id === id ? { ...tb, ...updates } : tb)));
  }, []);

  const handleTextBoxDelete = useCallback((id: string) => {
    setTextBoxes((prev) => prev.filter((tb) => tb.id !== id));
    if (selectedAnnotation === id) {
      setSelectedAnnotation(null);
    }
    toast.success('Text box deleted');
  }, [selectedAnnotation]);

  const handleTextBoxSave = useCallback(() => {
    // Text box is already updated via handleTextBoxUpdate
    // This can be used to save to PDF if needed
    toast.success('Text box saved');
  }, []);

  // Drawing handlers
  const handleDrawingComplete = useCallback((drawing: Drawing) => {
    setDrawings((prev) => [...prev, drawing]);
    toast.success('Drawing added');
  }, []);

  const handleDrawingUpdate = useCallback((id: string, updates: Partial<Drawing>) => {
    setDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  }, []);

  const handleDrawingDelete = useCallback((id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    if (selectedAnnotation === id) {
      setSelectedAnnotation(null);
    }
    toast.success('Drawing deleted');
  }, [selectedAnnotation]);

  // Handle text tool click - require double-click to create new text box
  const handleTextToolClick = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'text') {
      onCanvasClick(e);
      return;
    }
    
    if (!overlayRef.current || !pdfjsDoc || !canvasRef.current) {
      return;
    }

    // Stop all event propagation immediately to prevent the click from reaching any text boxes
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    
    const rect = overlayRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Get canvas dimensions
    const pdfCanvas = canvasRef.current;
    const canvasWidth = pdfCanvas.width;
    const canvasHeight = pdfCanvas.height;
    
    if (canvasWidth === 0 || canvasHeight === 0) {
      return;
    }
    
    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 300; // milliseconds
    const CLICK_DISTANCE_THRESHOLD = 10; // pixels
    
    // Check if this is a double-click
    if (textClickState?.pending) {
      const timeDiff = now - textClickState.timestamp;
      const distance = Math.sqrt(
        Math.pow(canvasX - textClickState.x, 2) + Math.pow(canvasY - textClickState.y, 2)
      );
      
      // If within time and distance threshold, create text box
      if (timeDiff < DOUBLE_CLICK_DELAY && distance < CLICK_DISTANCE_THRESHOLD) {
        // Convert canvas coordinates to PDF coordinates
        pdfjsDoc.getPage(previewPage).then((page) => {
          const pageSize = page.getViewport({ scale: 1 });
          
          // Convert click coordinates to PDF coordinates
          // PDF coordinate system: origin at bottom-left, Y increases upward
          // Canvas coordinate system: origin at top-left, Y increases downward
          const pdfX = (canvasX / canvasWidth) * pageSize.width;
          const pdfY = pageSize.height - ((canvasY / canvasHeight) * pageSize.height);
          
          const newTextBox: TextBox = {
            id: `textbox-${Date.now()}`,
            page: previewPage,
            x: pdfX,
            y: pdfY,
            text: annotationText || 'New Text',
            fontSize: textFontSize,
            fontFamily: 'Helvetica',
            color: textColor,
          };
          
          setTextBoxes((prev) => [...prev, newTextBox]);
          setTextClickState(null);
          toast.success('Text box created');
        }).catch((err) => {
          console.error('Failed to create text box:', err);
          toast.error('Failed to create text box');
          setTextClickState(null);
        });
        return;
      }
    }
    
    // First click - set pending state and show preview
    setTextClickState({
      pending: true,
      x: canvasX,
      y: canvasY,
      timestamp: now,
    });
    
    // Clear pending state after delay if no second click
    setTimeout(() => {
      setTextClickState((prev) => {
        if (prev && now === prev.timestamp) {
          return null;
        }
        return prev;
      });
    }, DOUBLE_CLICK_DELAY);
  }, [activeTool, overlayRef, canvasRef, zoom, pdfjsDoc, previewPage, annotationText, textFontSize, textColor, onCanvasClick, textClickState]);

  // Menu bar handlers
  const handleOpenFile = useCallback(() => {
    document.getElementById('pdf-file-input')?.click();
  }, []);

  const handleSave = useCallback(() => {
    if (uploadedFile) {
      downloadBlob(new Blob([uploadedFile.arrayBuffer], { type: 'application/pdf' }), uploadedFile.name);
      setHasUnsavedChanges(false);
      toast.success('PDF saved successfully');
    } else {
      toast.error('No PDF to save');
    }
  }, [uploadedFile]);

  const handleDownload = useCallback(() => {
    handleSave();
  }, [handleSave]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.25));
  }, []);

  const handleFitToPage = useCallback(() => {
    if (!pdfjsDoc || !canvasRef.current) return;
    
    pdfjsDoc.getPage(previewPage).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const container = canvasRef.current?.parentElement;
      if (!container) return;
      
      const containerWidth = container.clientWidth - 32; // Account for padding
      const containerHeight = container.clientHeight - 32;
      
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const scale = Math.min(scaleX, scaleY, 4); // Max zoom 400%
      
      setZoom(scale);
    });
  }, [pdfjsDoc, previewPage]);

  const handleFitToWidth = useCallback(() => {
    if (!pdfjsDoc || !canvasRef.current) return;
    
    pdfjsDoc.getPage(previewPage).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const container = canvasRef.current?.parentElement;
      if (!container) return;
      
      const containerWidth = container.clientWidth - 32; // Account for padding
      const scale = Math.min(containerWidth / viewport.width, 4); // Max zoom 400%
      
      setZoom(scale);
    });
  }, [pdfjsDoc, previewPage]);

  const handleActualSize = useCallback(() => {
    setZoom(1);
  }, []);

  const handleFind = useCallback(() => {
    setSidebarVisible(true);
    setSidebarTab('search');
  }, []);

  const handleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Undo function
  const handleUndo = useCallback(async () => {
    if (historyIndex <= 0 || !uploadedFile) return;

    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];
    
    try {
      const newArrayBuffer = previousState.slice(0);
      const newFile = { ...uploadedFile, arrayBuffer: newArrayBuffer };
      setUploadedFile(newFile);

      // Reload PDF.js document
      const loadingTask = pdfjsLib.getDocument({ data: newArrayBuffer });
      const newDoc = await loadingTask.promise;
      
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
      setPdfjsDoc(newDoc);
      setPreviewTotalPages(newDoc.numPages);

      setHistoryIndex(newIndex);
      setCanUndo(newIndex > 0);
      setCanRedo(true);
      toast.success('Undone');
    } catch (error) {
      console.error('Undo error:', error);
      toast.error('Failed to undo');
    }
  }, [history, historyIndex, uploadedFile, pdfjsDoc]);

  // Redo function
  const handleRedo = useCallback(async () => {
    if (historyIndex >= history.length - 1 || !uploadedFile) return;

    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    
    try {
      const newArrayBuffer = nextState.slice(0);
      const newFile = { ...uploadedFile, arrayBuffer: newArrayBuffer };
      setUploadedFile(newFile);

      // Reload PDF.js document
      const loadingTask = pdfjsLib.getDocument({ data: newArrayBuffer });
      const newDoc = await loadingTask.promise;
      
      if (pdfjsDoc) {
        pdfjsDoc.destroy();
      }
      setPdfjsDoc(newDoc);
      setPreviewTotalPages(newDoc.numPages);

      setHistoryIndex(newIndex);
      setCanUndo(true);
      setCanRedo(newIndex < history.length - 1);
      toast.success('Redone');
    } catch (error) {
      console.error('Redo error:', error);
      toast.error('Failed to redo');
    }
  }, [history, historyIndex, uploadedFile, pdfjsDoc]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Tool switching shortcuts (only when document is loaded)
      if (uploadedFile && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 't':
            e.preventDefault();
            setActiveTool(activeTool === 'text' ? 'select' : 'text');
            setRibbonTab('text');
            break;
          case 'd':
            e.preventDefault();
            setActiveTool(activeTool === 'draw' ? 'select' : 'draw');
            setRibbonTab('draw');
            break;
          case 'r':
            e.preventDefault();
            setActiveTool(activeTool === 'rectangle' ? 'select' : 'rectangle');
            setRibbonTab('draw');
            break;
          case 'c':
            e.preventDefault();
            setActiveTool(activeTool === 'circle' ? 'select' : 'circle');
            setRibbonTab('draw');
            break;
          case 'l':
            e.preventDefault();
            setActiveTool(activeTool === 'line' ? 'select' : 'line');
            setRibbonTab('draw');
            break;
          case 'a':
            e.preventDefault();
            setActiveTool(activeTool === 'arrow' ? 'select' : 'arrow');
            setRibbonTab('draw');
            break;
          case 's':
            e.preventDefault();
            setActiveTool('select');
            break;
          case 'escape':
            e.preventDefault();
            setActiveTool('select');
            setEditingTextBoxId(null);
            setSelectedAnnotation(null);
            break;
        }
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          handleUndo();
        }
      }
      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) {
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, handleUndo, handleRedo, uploadedFile, activeTool, setRibbonTab]);

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
      <Helmet>
        <title>PDF Editor - sLixTOOLS</title>
        <meta name="description" content="Upload a PDF, preview pages, and annotate precisely in your browser. All processing happens locally for maximum privacy." />
        <meta name="keywords" content="PDF editor, PDF annotation, PDF split, PDF tools, browser PDF editor" />
        <link rel="canonical" href="https://slixtools.io/tools/pdf-editor" />
      </Helmet>

      {/* Menu Bar */}
      <PdfMenuBar
        onOpenFile={handleOpenFile}
        onSave={handleSave}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onClose={resetAll}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFind={handleFind}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToPage={handleFitToPage}
        onFitToWidth={handleFitToWidth}
        onActualSize={handleActualSize}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onFullScreen={handleFullScreen}
        canUndo={canUndo}
        canRedo={canRedo}
        hasDocument={!!uploadedFile}
        sidebarVisible={sidebarVisible}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Ribbon */}
      {uploadedFile && (
        <PdfRibbon
          activeTab={ribbonTab}
          onTabChange={setRibbonTab}
          activeTool={activeTool}
          onToolChange={(tool) => setActiveTool(tool as ToolType)}
          activeModal={activeModal}
          setActiveModal={setActiveModal}
          onMergeClick={() => document.getElementById('merge-files')?.click()}
          processingState={{
            isMerging,
            isSplitting,
            isDeleting,
            isReordering,
            isHighlighting,
            isAnnotating,
            isConverting
          }}
          hasDocument={!!uploadedFile}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          drawingColor={drawingColor}
          onDrawingColorChange={setDrawingColor}
          drawingWidth={drawingWidth}
          onDrawingWidthChange={setDrawingWidth}
          textFontSize={textFontSize}
          onTextFontSizeChange={setTextFontSize}
          textColor={textColor}
          onTextColorChange={setTextColor}
          highlightText={highlightText}
          highlightPage={highlightPage}
          highlightX={highlightX}
          highlightY={highlightY}
          highlightColor={highlightColor}
          setHighlightText={setHighlightText}
          setHighlightPage={setHighlightPage}
          setHighlightX={setHighlightX}
          setHighlightY={setHighlightY}
          setHighlightColor={setHighlightColor}
          onHighlight={highlightTextFunc}
          annotationText={annotationText}
          annotationPage={annotationPage}
          annotationX={annotationX}
          annotationY={annotationY}
          setAnnotationText={setAnnotationText}
          setAnnotationPage={setAnnotationPage}
          setAnnotationX={setAnnotationX}
          setAnnotationY={setAnnotationY}
          onAnnotate={annotatePdf}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {uploadedFile && pdfjsDoc && (
          <PdfSidebar
            visible={sidebarVisible}
            onToggle={() => setSidebarVisible(!sidebarVisible)}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            pdfDoc={pdfjsDoc}
            currentPage={previewPage}
            onPageSelect={setPreviewPage}
            onPageReorder={handlePageReorder}
            onResultSelect={setPreviewPage}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
          />
        )}

        {/* Document View or Upload Area */}
        {!uploadedFile ? (
          <div className="flex-1 flex items-center justify-center">
            <PdfUpload
              onUpload={onUpload}
              resetAll={resetAll}
              isUploading={isUploading}
              hasFile={false}
            />
          </div>
        ) : pdfjsDoc ? (
          <PdfDocumentView
            previewPage={previewPage}
            previewTotalPages={previewTotalPages}
            zoom={zoom}
            viewMode={documentViewMode}
            usePrecisePlacement={usePrecisePlacement}
            clickCoord={clickCoord}
            annotationText={annotationText}
            onPageChange={setPreviewPage}
            onZoomChange={setZoom}
            onViewModeChange={setDocumentViewMode}
            onPrecisePlacementChange={setUsePrecisePlacement}
            onCanvasClick={activeTool === 'text' ? handleTextToolClick : onCanvasClick}
            canvasRef={canvasRef}
            overlayRef={overlayRef}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitToPage={handleFitToPage}
            onFitToWidth={handleFitToWidth}
            onActualSize={handleActualSize}
            pdfDoc={pdfjsDoc}
            textBoxes={textBoxes}
            drawings={drawings}
            activeTool={activeTool}
            onTextBoxUpdate={handleTextBoxUpdate}
            onTextBoxDelete={handleTextBoxDelete}
            onTextBoxSave={handleTextBoxSave}
            onDrawingComplete={handleDrawingComplete}
            onDrawingUpdate={handleDrawingUpdate}
            onDrawingDelete={handleDrawingDelete}
            selectedAnnotation={selectedAnnotation}
            onAnnotationSelect={setSelectedAnnotation}
            drawingColor={drawingColor}
            drawingWidth={drawingWidth}
            textClickState={textClickState}
            editingTextBoxId={editingTextBoxId}
            onTextBoxEdit={handleTextBoxEdit}
          />
        ) : null}
      </div>

      {/* Status Bar */}
      {uploadedFile && pdfjsDoc && (
        <PdfStatusBar
          currentPage={previewPage}
          totalPages={previewTotalPages}
          zoom={zoom}
          documentSize={uploadedFile.arrayBuffer.byteLength}
          activeTool={activeTool}
        />
      )}

      {/* Hidden file inputs */}
      <input
        id="pdf-file-input"
        type="file"
        accept="application/pdf"
        onChange={(e) => onUpload(e.target.files)}
        className="hidden"
      />
      <input
        id="merge-files"
        type="file"
        accept="application/pdf"
        multiple
        onChange={(e) => onMultipleUpload(e.target.files)}
        className="hidden"
      />

      {/* Action Panel (Modals) - Only show non-highlight/annotate modals */}
      {activeModal && activeModal !== 'highlight' && activeModal !== 'annotate' && (
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
      )}
      
      {/* Progress Indicator */}
      {(isMerging || isSplitting || isDeleting || isConverting || isReordering) && progressMessage && (
        <PdfProgressIndicator
          message={progressMessage}
          progress={progressValue}
          showCancel={false}
        />
      )}
      
      {/* Confirmation Dialogs */}
      <PdfConfirmDialog
        isOpen={showCloseConfirm}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close the document? All unsaved changes will be lost."
        confirmText="Close Anyway"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmClose}
        onCancel={() => setShowCloseConfirm(false)}
      />
      
      <PdfConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Pages"
        message={`Are you sure you want to delete the specified pages? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default PdfEditor;