import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileImage, FileText, Download, Loader2, Upload, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
  'image/tiff',
];

const ImageToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [output, setOutput] = useState<{ url: string; name: string } | null>(null);
  const [pdfQuality, setPdfQuality] = useState(80);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    // Clear previous results
    setOutput(null);

    // Validate files
    const validFiles = selectedFiles.filter(file => {
      // Check file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`${file.name} is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
        return false;
      }

      // Check file type
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported image type.`);
        return false;
      }

      return true;
    });

    if (validFiles.length) {
      setFiles(validFiles);
    }
  };

  const convertImagesToPdf = async () => {
    if (!files.length) return;
    
    setIsProcessing(true);
    setOutput(null);
    
    try {
      // Import jsPDF dynamically to reduce initial bundle size
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF();
    
      let currentPage = 0;
      
      // Process each image
      for (const file of files) {
        const imgUrl = URL.createObjectURL(file);
        
        // Create an image element to get dimensions
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            // Add a new page if not the first image
            if (currentPage > 0) {
              doc.addPage();
            }
            
            // Calculate dimensions to fit the page
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            const imgRatio = img.width / img.height;
            let imgWidth = pageWidth;
            let imgHeight = pageWidth / imgRatio;
            
            // If height exceeds page, scale down
            if (imgHeight > pageHeight) {
              imgHeight = pageHeight;
              imgWidth = pageHeight * imgRatio;
            }
            
            // Center image on page
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;
            
            // Add image to PDF
            doc.addImage(
              img, 
              'JPEG', 
              x, 
              y, 
              imgWidth, 
              imgHeight, 
              undefined, 
              'MEDIUM'
            );
            
            currentPage++;
            URL.revokeObjectURL(imgUrl);
            resolve();
          };
          img.src = imgUrl;
        });
      }
      
      // Convert to data URL
      const pdfUrl = doc.output('datauristring');
      const pdfName = files.length === 1 
        ? files[0].name.replace(/\.(jpg|jpeg|png|webp|gif|bmp|avif|tiff)$/i, '.pdf')
        : 'images_to_pdf.pdf';
      
      setOutput({
        url: pdfUrl,
        name: pdfName
      });
      
      toast.success(`Successfully converted ${files.length} image(s) to PDF.`);
    } catch (error) {
      console.error('Error converting images to PDF:', error);
      
      // Provide more specific error messages based on error types
      if (error instanceof Error) {
        if (error.message.includes('memory')) {
          toast.error('Memory limit exceeded. Try converting fewer or smaller images.');
        } else if (error.message.includes('format') || error.message.includes('corrupt')) {
          toast.error('One or more images appear to be corrupted. Please check your files.');
        } else {
          toast.error(`Error converting to PDF: ${error.message}`);
        }
      } else {
        toast.error('Error converting images to PDF. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    
    const link = document.createElement('a');
    link.href = output.url;
    link.download = output.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      // Create a synthetic event object with files
      const syntheticEvent = {
        target: { files: e.dataTransfer.files }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileChange(syntheticEvent);
    }
  };

  return (
    <div className="text-white relative min-h-screen">
      <ParticleBackground />
      <Helmet>
        <title>Image to PDF Converter | sLixTOOLS</title>
        <meta name="description" content="Convert JPG, PNG, and other image formats to PDF. Combine multiple images into a single PDF file. Free, fast, and secure - no upload required." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <AnimatedElement type="fadeIn" delay={0.1} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
            Image to PDF Converter
          </h1>
          <p className="mt-2 text-center text-gray-300 max-w-2xl mx-auto">
            Convert multiple images (JPG, PNG, WebP, etc.) into a single PDF document.
          </p>
        </AnimatedElement>

        <AnimatedElement type="slideUp" delay={0.2} className="mt-8">
          <Card className="bg-gray-900/40 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
            <div className="p-6">
              <div className="space-y-6">
                {/* File Upload Area */}
                <div
                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center bg-gray-800/20 hover:bg-gray-800/30 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.tiff"
                    multiple={true}
                  />
                  <div className="flex flex-col items-center">
                    <Upload className="h-10 w-10 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-300">
                      Drop your images here or click to browse
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      JPG, PNG, WebP, GIF, BMP, AVIF, TIFF files up to {MAX_FILE_SIZE_MB}MB
                    </p>
                    {files.length > 0 && (
                      <div className="mt-4 text-green-400 text-sm">
                        {files.length} file(s) selected
                      </div>
                    )}
                  </div>
                </div>

                {/* Quality Settings */}
                <div className="bg-gray-800/20 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-300">Quality Settings</h3>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-sm text-gray-400">PDF Quality</label>
                        <span className="text-sm text-gray-300">{pdfQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="100"
                        value={pdfQuality}
                        onChange={(e) => setPdfQuality(parseInt(e.target.value))}
                        className="w-full accent-green-400 bg-gray-700 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Convert Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={convertImagesToPdf}
                    disabled={files.length === 0 || isProcessing}
                    className="bg-[#2AD587] text-black font-semibold py-2 px-6 text-base"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-5 w-5" />
                        <span>Convert Images to PDF</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Results Section */}
                {output && (
                  <div className="mt-8 border-t border-gray-700/50 pt-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Converted File</h3>
                    <div className="bg-gray-800/30 p-4 rounded-lg flex justify-between items-center">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-red-400 mr-3" />
                        <span className="text-sm text-gray-300 truncate max-w-md">
                          {output.name}
                        </span>
                      </div>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                        onClick={handleDownload}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </AnimatedElement>

        <AnimatedElement type="fadeIn" delay={0.6} className="mt-8">
          <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center">
              <SlidersHorizontal className="mr-2 h-5 w-5 text-green-400" />
              How to use
            </h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Upload one or more images by clicking the upload area or dragging and dropping</li>
              <li>Adjust the PDF quality setting if needed</li>
              <li>Click "Convert Images to PDF" to combine all images into a single PDF</li>
              <li>Each image will be placed on a separate page in the PDF</li>
              <li>Download your generated PDF file</li>
            </ol>
            <p className="mt-4 text-xs text-gray-500">
              <span className="font-semibold">Note:</span> All processing happens in your browser. Your images are never uploaded to any server.
            </p>
          </div>
        </AnimatedElement>
      </div>
    </div>
  );
};

export default ImageToPdf;
