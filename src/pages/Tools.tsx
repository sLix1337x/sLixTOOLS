import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileVideo, FileImage, FileCode, FileArchive, Music, FileText, Scissors, Type, Code } from 'lucide-react';
import AnimatedElement from "@/components/AnimatedElement";
import ParticleBackground from '@/components/ParticleBackground';

interface ToolItemProps {
  title: string;
  description?: string;
  tooltip?: string;
  icon: React.ReactNode;
  path?: string;
  comingSoon?: boolean;
}

const ToolCard: React.FC<ToolItemProps> = React.memo(({ title, icon, path, comingSoon, tooltip }) => {
  const cardContent = (
    <div
      className={`relative w-full aspect-square p-5 md:p-6 lg:p-7 rounded-2xl border shadow-sm transition-all duration-300 ease-in-out flex flex-col items-start justify-start space-y-2 text-left overflow-hidden group focus-within:ring-2 focus-within:ring-green-400/40 ${
        comingSoon
          ? 'bg-transparent border-white/20 cursor-not-allowed opacity-60'
          : 'bg-transparent border-white/40 hover:border-white/70 hover:-translate-y-[2px] hover:shadow-md focus-within:border-white/80 focus-within:-translate-y-[2px]'
      }`}
      style={{ aspectRatio: '1 / 1' }}
    >
      {comingSoon && (
        <span className="absolute right-2 top-2 rounded bg-blue-600/70 px-2 py-1 text-[11px] font-semibold text-neutral-100 shadow">Coming Soon</span>
      )}
      {/* Icon top-left */}
      <div>
        <div
          className={`w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-lg border border-white/10 transition-all duration-300 ${
            comingSoon ? 'bg-gray-800/50 text-gray-500' : 'bg-green-400/10 text-green-400 group-hover:bg-green-400/20 group-hover:scale-105'
          }`}
          aria-hidden="true"
        >
          {React.cloneElement(icon as React.ReactElement, {
            className: 'w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7'
          })}
        </div>
      </div>

      {/* Title close to icon */}
      <h3
        className={`text-sm md:text-base lg:text-lg font-semibold tracking-tight leading-tight transition-colors duration-300 ${
          comingSoon ? 'text-gray-400' : 'text-white group-hover:text-green-400'
        }`}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </h3>

      {/* Small tooltip below title */}
      <p
        className={`text-xs md:text-sm leading-snug pr-1 break-words transition-colors duration-300 ${
          comingSoon ? 'text-gray-500' : 'text-gray-300 group-hover:text-gray-200'
        }`}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {tooltip}
      </p>

      {/* Content distribution handled by justify-between; overflow hidden enforces square */}
    </div>
  );

  if (comingSoon) {
    return (
      <AnimatedElement type="fadeIn">
        <div className="block h-full" data-tool-name={title} aria-disabled="true">
          {cardContent}
        </div>
      </AnimatedElement>
    );
  }

  return (
    <AnimatedElement type="fadeIn">
      <Link to={path} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl" data-tool-name={title}>
        {cardContent}
      </Link>
    </AnimatedElement>
  );
});

ToolCard.displayName = 'ToolCard';

const Tools: React.FC = React.memo(() => {

  return (
    <div className="text-white relative min-h-0 bg-[#060708]">
      <ParticleBackground />
      <Helmet>
        <title>All Tools - sLixTOOLS</title>
        <meta name="description" content="Explore all the free online tools available at sLixTOOLS for your file conversion needs." />
        <link rel="canonical" href="https://slixtools.io/tools" />
      </Helmet>
      <div className="container mx-auto px-6 pt-8 pb-12 flex flex-col min-h-0 bg-[#060708]">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">All Tools</h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Explore our collection of free online tools to help with all your file conversion and optimization needs.
              <br />
              <span className="text-green-400">All processing happens in your browser</span> – your files never leave your computer.
            </p>
          </AnimatedElement>
          
          <AnimatedElement type="fadeIn" delay={0.8} className="w-full text-center">
            <Link to="/">
              <button 
                className="bg-[#2AD587] text-black font-bold py-3 px-8 rounded-lg rainbow-hover flex items-center justify-center mx-auto"
                style={{
                  outline: 'none',
                  border: 'none',
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: '200px'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span className="relative z-10">Back to Home</span>
              </button>
            </Link>
          </AnimatedElement>
        </div>

        <div className="w-[98%] mx-auto">
          <AnimatedElement type="fadeIn" delay={0.6}>
            {/* Available Tools Section */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">
                🚀 Available Tools
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              <ToolCard 
                title="Video to GIF" 
                icon={<FileVideo />}
                path="/tools/video-to-gif"
                tooltip="Convert video files to animated GIF format with customizable quality and frame rate settings"
              />
              <ToolCard 
                title="GIF Compressor" 
                icon={<Scissors />}
                path="/tools/gif-compressor"
                tooltip="Reduce GIF file size while maintaining visual quality using advanced compression algorithms"
              />
              <ToolCard 
                title="Image Compressor" 
                icon={<FileImage />}
                path="/tools/image-compressor"
                tooltip="Compress images to reduce file size without significant quality loss for web optimization"
              />
              <ToolCard 
                title="Image Resizer" 
                icon={<FileImage />}
                path="/tools/image-resizer"
                tooltip="Resize images to specific dimensions or scale them proportionally for different use cases"
              />
              <ToolCard 
                title="Image Converter" 
                icon={<FileImage />}
                path="/tools/image-converter"
                tooltip="Convert images between different formats (JPG, PNG, WebP, SVG) with quality control"
              />
              <ToolCard 
                title="Video Converter" 
                icon={<FileVideo />}
                path="/tools/video-converter"
                tooltip="Convert video files between various formats (MP4, AVI, MOV, etc.) with quality options"
              />
              <ToolCard 
                title="Convert Case Tool" 
                icon={<Type />}
                path="/tools/convert-case"
                tooltip="Transform text between different cases: uppercase, lowercase, title case, camelCase, and more"
              />
              <ToolCard 
                title="XML Editor" 
                icon={<Code />}
                path="/tools/xml-editor"
                tooltip="Edit, format, validate, and share XML data with syntax highlighting and real-time validation"
              />
              <ToolCard 
                title="PDF Editor" 
                icon={<FileText />}
                path="/tools/pdf-editor"
                tooltip="Merge multiple PDFs, split by pages or ranges, and add text annotations entirely client-side"
              />
            </div>
            </div>

            {/* Coming Soon Section */}
            <div>
              <h2 className="text-3xl font-bold text-blue-400 mb-8 text-center">
                ⏳ Coming Soon
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                <ToolCard 
                  title="PDF Compressor" 
                  icon={<FileText />}
                  comingSoon
                  tooltip="Reduce PDF file size while preserving document quality and readability"
                />
                <ToolCard 
                  title="Document Converter" 
                  icon={<FileCode />}
                  comingSoon
                  tooltip="Convert documents between formats like PDF, DOCX, TXT, and HTML"
                />
                <ToolCard 
                  title="Archive Extractor" 
                  icon={<FileArchive />}
                  comingSoon
                  tooltip="Extract files from compressed archives (ZIP, RAR, 7Z, TAR) in your browser"
                />
                <ToolCard 
                  title="Audio Converter" 
                  icon={<Music />}
                  comingSoon
                  tooltip="Convert audio files between different formats (MP3, WAV, FLAC, AAC) with quality options"
                />
              </div>
            </div>
          </AnimatedElement>
        </div>
      </div>
    </div>
  );
});

Tools.displayName = 'Tools';

export default Tools;
