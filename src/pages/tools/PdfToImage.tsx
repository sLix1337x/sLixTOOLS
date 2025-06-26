import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileImage, FileText, Download, Loader2, Upload, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';

// We'll dynamically import pdfjs-dist to avoid issues
import type * as pdfjsLib from 'pdfjs-dist';
let pdfjs: typeof pdfjsLib;

// Initialize PDF.js worker in useEffect
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PdfToImage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [output, setOutput] = useState<{ url: string; name: string }[]>([]);
  const [imageQuality, setImageQuality] = useState(80);
  const [imageFormat, setImageFormat] = useState<'jpeg' | 'png'>('jpeg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Clear previous results
    setOutput([]);

    // Validate file
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Please select a valid PDF file.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setFile(selectedFile);
  };

  const convertPdfToImages = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setOutput([]);
    
    try {
      // Dynamically import pdfjs-dist
      if (!pdfjs) {
        pdfjs = await import('pdfjs-dist');
        // Set the worker source location
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
      }
      
      const results: { url: string; name: string }[] = [];
      
      // Load the PDF document
      const pdfData = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
      
      const totalPages = pdf.numPages;
      toast.info(`Processing ${totalPages} pages...`);
      
      // Process each page
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Scale for better quality
        
        // Prepare canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (context) {
          // Render PDF page to canvas
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          // Convert canvas to image
          const mimeType = imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = imageFormat === 'jpeg' ? imageQuality / 100 : undefined;
          const imageUrl = canvas.toDataURL(mimeType, quality);
          const extension = imageFormat === 'jpeg' ? 'jpg' : 'png';
          const pageName = file.name.replace('.pdf', '') + `_page_${i}.${extension}`;
          
          results.push({
            url: imageUrl,
            name: pageName
          });
        }
      }
      
      setOutput(results);
      toast.success(`Successfully converted PDF to ${results.length} images.`);
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      
      // Provide more specific error messages based on error types
      if (error instanceof Error) {
        if (error.message.includes('password')) {
          toast.error('This PDF is password protected. Please provide an unprotected PDF.');
        } else if (error.message.includes('corrupt')) {
          toast.error('The PDF file appears to be corrupted. Please try a different file.');
        } else {
          toast.error(`Error converting PDF: ${error.message}`);
        }
      } else {
        toast.error('Error converting PDF. Please try again with a different file.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    if (output.length <= 0) return;
    
    // Create a zip file if there are multiple images
    if (output.length > 1) {
      try {
        // Use alternative approach for bundle loading
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Add each image to the zip
        output.forEach((item) => {
          // Convert data URL to blob
          const dataUrlParts = item.url.split(',');
          const mimeString = dataUrlParts[0].split(':')[1].split(';')[0];
          const byteString = atob(dataUrlParts[1]);
          const arrayBuffer = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(arrayBuffer);
          
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          const blob = new Blob([arrayBuffer], { type: mimeString });
          zip.file(item.name, blob);
        });
        
        // Generate the zip file
        const content = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = file?.name.replace('.pdf', '') + '_images.zip' || 'pdf_images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);
      } catch (error) {
        console.error('Error creating ZIP file:', error);
        toast.error('Error creating ZIP file. Please try again.');
      }
    } else if (output.length === 1) {
      // Just download the single image directly
      handleDownload(output[0].url, output[0].name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0 && droppedFiles[0].type === 'application/pdf') {
      // Create a synthetic event object with files
      const syntheticEvent = {
        target: { files: [droppedFiles[0]] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileChange(syntheticEvent);
    } else {
      toast.error('Please drop a valid PDF file.');
    }
  };

  return (
    <div className="text-white relative min-h-screen">
      <ParticleBackground />
      <Helmet>
        <title>PDF to Image Converter | sLixTOOLS</title>
        <meta name="description" content="Convert PDF documents to high-quality JPG or PNG images. Extract all pages or select specific ones. Free, fast, and secure - no upload required." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <AnimatedElement type="fadeIn" delay={0.1} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
            PDF to Image Converter
          </h1>
          <p className="mt-2 text-center text-gray-300 max-w-2xl mx-auto">
            Convert PDF documents to high-quality JPG or PNG images. Each page becomes a separate image file.
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
                    accept=".pdf,application/pdf"
                  />
                  <div className="flex flex-col items-center">
                    <Upload className="h-10 w-10 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-300">
                      Drop your PDF here or click to browse
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      PDF files up to {MAX_FILE_SIZE_MB}MB
                    </p>
                    {file && (
                      <div className="mt-4 text-green-400 text-sm">
                        {file.name} selected
                      </div>
                    )}
                  </div>
                </div>

                {/* Quality Settings */}
                <div className="bg-gray-800/20 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-300">Output Settings</h3>
                  </div>
                  
                  <div className="flex flex-col space-y-4">
                    {/* Image Format */}
                    <div className="space-y-1">
                      <label className="text-sm text-gray-400">Image Format</label>
                      <div className="flex space-x-2 mt-1">
                        <Button
                          type="button"
                          variant={imageFormat === 'jpeg' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setImageFormat('jpeg')}
                          className={imageFormat === 'jpeg' ? 'bg-green-400/20 text-green-400 border-green-400/30' : ''}
                        >
                          JPG
                        </Button>
                        <Button
                          type="button"
                          variant={imageFormat === 'png' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setImageFormat('png')}
                          className={imageFormat === 'png' ? 'bg-green-400/20 text-green-400 border-green-400/30' : ''}
                        >
                          PNG
                        </Button>
                      </div>
                    </div>
                    
                    {/* Quality Slider (only for JPEG) */}
                    {imageFormat === 'jpeg' && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-sm text-gray-400">Image Quality</label>
                          <span className="text-sm text-gray-300">{imageQuality}%</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="100"
                          value={imageQuality}
                          onChange={(e) => setImageQuality(parseInt(e.target.value))}
                          className="w-full accent-green-400 bg-gray-700 rounded-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Convert Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={convertPdfToImages}
                    disabled={!file || isProcessing}
                    className="bg-[#2AD587] text-black font-semibold py-2 px-6 text-base"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FileImage className="mr-2 h-5 w-5" />
                        <span>Convert PDF to {imageFormat === 'jpeg' ? 'JPG' : 'PNG'}</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Results Section */}
                {output.length > 0 && (
                  <div className="mt-8 border-t border-gray-700/50 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-200">Converted Images</h3>
                      {output.length > 1 && (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                          onClick={handleDownloadAll}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download All
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                      {output.map((item, index) => (
                        <div key={index} className="bg-gray-800/30 p-4 rounded-lg flex justify-between items-center">
                          <div className="flex items-center flex-1 mr-4">
                            <FileImage className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-300 truncate max-w-md">
                                {item.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                Page {index + 1} of {output.length}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <img 
                              src={item.url} 
                              alt={`Page ${index + 1} preview`} 
                              className="h-10 w-10 object-cover rounded border border-gray-700"
                            />
                            <Button 
                              variant="outline"
                              size="sm"
                              className="text-green-400 border-green-400/30 hover:bg-green-400/10 whitespace-nowrap"
                              onClick={() => handleDownload(item.url, item.name)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
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
              <li>Upload a PDF file by clicking the upload area or dragging and dropping</li>
              <li>Choose your preferred output format (JPG or PNG)</li>
              <li>For JPG, adjust the quality setting if needed (higher quality means larger file size)</li>
              <li>Click "Convert PDF to Images" to process your file</li>
              <li>Each page of your PDF will be converted to a separate image</li>
              <li>Download images individually or all at once as a ZIP file</li>
            </ol>
            <p className="mt-4 text-xs text-gray-500">
              <span className="font-semibold">Note:</span> All processing happens in your browser. Your files are never uploaded to any server.
            </p>
          </div>
        </AnimatedElement>
      </div>
    </div>
  );
};

export default PdfToImage;
