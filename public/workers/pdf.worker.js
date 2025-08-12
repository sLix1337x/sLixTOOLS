// PDF Processing Worker
// Handles PDF creation, merging, and page extraction tasks

// Import jsPDF from CDN for PDF operations
importScripts('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

self.onmessage = function(e) {
  const { type, data, taskId } = e.data;
  
  try {
    switch (type) {
      case 'createPdf':
        handleCreatePdf(data, taskId);
        break;
      case 'mergePdfs':
        handleMergePdfs(data, taskId);
        break;
      case 'extractPages':
        handleExtractPages(data, taskId);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      taskId,
      success: false,
      error: error.message
    });
  }
};

function handleCreatePdf(data, taskId) {
  const { images, options = {} } = data;
  
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4'
    });
    
    let isFirstPage = true;
    
    images.forEach((imageData, index) => {
      if (!isFirstPage) {
        pdf.addPage();
      }
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = options.margin || 10;
      
      // Calculate image dimensions to fit page
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2);
      
      // Add image to PDF
      pdf.addImage(
        imageData,
        'JPEG',
        margin,
        margin,
        maxWidth,
        maxHeight,
        undefined,
        'FAST'
      );
      
      isFirstPage = false;
      
      // Report progress
      self.postMessage({
        taskId,
        progress: ((index + 1) / images.length) * 100,
        status: 'processing'
      });
    });
    
    const pdfBlob = pdf.output('blob');
    
    self.postMessage({
      taskId,
      success: true,
      result: pdfBlob,
      progress: 100
    });
    
  } catch (error) {
    throw new Error(`PDF creation failed: ${error.message}`);
  }
}

function handleMergePdfs(data, taskId) {
  const { pdfs, options = {} } = data;
  
  try {
    const { jsPDF } = window.jspdf;
    const mergedPdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4'
    });
    
    let totalPages = 0;
    let processedPages = 0;
    
    // First pass: count total pages
    pdfs.forEach(pdfData => {
      // This is a simplified approach - in reality, you'd need a PDF parsing library
      totalPages += pdfData.pageCount || 1;
    });
    
    // Second pass: merge PDFs
    pdfs.forEach((pdfData, pdfIndex) => {
      const pages = pdfData.pages || [pdfData];
      
      pages.forEach((pageData, pageIndex) => {
        if (processedPages > 0) {
          mergedPdf.addPage();
        }
        
        // Add page content (simplified - would need proper PDF parsing)
        if (pageData.imageData) {
          const pageWidth = mergedPdf.internal.pageSize.getWidth();
          const pageHeight = mergedPdf.internal.pageSize.getHeight();
          
          mergedPdf.addImage(
            pageData.imageData,
            'JPEG',
            0,
            0,
            pageWidth,
            pageHeight
          );
        }
        
        processedPages++;
        
        // Report progress
        self.postMessage({
          taskId,
          progress: (processedPages / totalPages) * 100,
          status: 'processing'
        });
      });
    });
    
    const mergedBlob = mergedPdf.output('blob');
    
    self.postMessage({
      taskId,
      success: true,
      result: mergedBlob,
      progress: 100
    });
    
  } catch (error) {
    throw new Error(`PDF merge failed: ${error.message}`);
  }
}

function handleExtractPages(data, taskId) {
  const { pdf, pageNumbers, options = {} } = data;
  
  try {
    const { jsPDF } = window.jspdf;
    const extractedPages = [];
    
    pageNumbers.forEach((pageNum, index) => {
      const newPdf = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: 'mm',
        format: options.format || 'a4'
      });
      
      // Extract page content (simplified - would need proper PDF parsing)
      if (pdf.pages && pdf.pages[pageNum - 1]) {
        const pageData = pdf.pages[pageNum - 1];
        
        if (pageData.imageData) {
          const pageWidth = newPdf.internal.pageSize.getWidth();
          const pageHeight = newPdf.internal.pageSize.getHeight();
          
          newPdf.addImage(
            pageData.imageData,
            'JPEG',
            0,
            0,
            pageWidth,
            pageHeight
          );
        }
      }
      
      extractedPages.push({
        pageNumber: pageNum,
        blob: newPdf.output('blob')
      });
      
      // Report progress
      self.postMessage({
        taskId,
        progress: ((index + 1) / pageNumbers.length) * 100,
        status: 'processing'
      });
    });
    
    self.postMessage({
      taskId,
      success: true,
      result: extractedPages,
      progress: 100
    });
    
  } catch (error) {
    throw new Error(`Page extraction failed: ${error.message}`);
  }
}

// Error handling
self.onerror = function(error) {
  console.error('PDF Worker Error:', error);
  self.postMessage({
    success: false,
    error: 'PDF worker encountered an error'
  });
};