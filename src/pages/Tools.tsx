import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileVideo, FileImage, FileCode, FileArchive, Music, FileText, Scissors } from 'lucide-react';
import AnimatedElement from "@/components/AnimatedElement";
import ParticleBackground from '@/components/ParticleBackground';

interface ToolItemProps {
  title: string;
  description?: string; // Made optional since we're not using it
  icon: React.ReactNode;
  path?: string;
  comingSoon?: boolean;
}

const ToolCard: React.FC<ToolItemProps> = ({ title, icon, path, comingSoon }) => {
  const cardContent = (
    <div className={`flex flex-col items-center justify-between h-full p-6 rounded-2xl shadow-xl border border-gray-700/50 bg-gray-900/80 transition-transform duration-200 group ${comingSoon ? 'opacity-60 grayscale' : 'hover:-translate-y-1 hover:shadow-2xl'}`}>
      <div className={`flex items-center justify-center h-16 w-16 rounded-full mb-4 ${comingSoon ? 'bg-gray-800' : 'bg-gradient-to-br from-green-400/20 to-cyan-400/20'}`}>
        {React.cloneElement(icon as React.ReactElement, {
          className: `h-9 w-9 ${comingSoon ? 'text-gray-500' : 'text-green-400 group-hover:text-cyan-400 transition-colors'}`
        })}
      </div>
      <h3 className={`text-xl font-bold mb-2 ${comingSoon ? 'text-gray-400' : 'text-white'}`}>{title}</h3>
      {comingSoon ? (
        <span className="text-sm text-gray-500">Coming Soon</span>
      ) : (
        <Link to={path!} className="mt-4 w-full">
          <Button className="w-full bg-[#2AD587] hover:bg-[#25c27a] text-black font-bold py-2.5 px-4 rounded-lg transition-colors duration-200">
            Open Tool
          </Button>
        </Link>
      )}
    </div>
  );
  return (
    <AnimatedElement type="fadeIn">
      {cardContent}
    </AnimatedElement>
  );
};

const ToolItem: React.FC<ToolItemProps> = ({ title, icon, path, comingSoon }) => {
  const content = (
    <div className={`py-1 text-base group ${comingSoon ? 'opacity-60' : 'hover:text-[#42C574]'}`}>
      <div className="flex items-center space-x-2">
        <div className={`flex-shrink-0 ${comingSoon ? 'text-gray-400' : 'text-gray-400 group-hover:text-[#42C574]'}`}>{React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4 transition-colors' })}</div>
        <span className={`font-bold transition-colors ${comingSoon ? 'text-gray-400' : 'text-white group-hover:text-[#42C574]'}`} style={{ fontWeight: 600 }}>{title}</span>
        {comingSoon && <span className="text-xs text-gray-500">(soon)</span>}
      </div>
    </div>
  );
  if (comingSoon || !path) {
    return <div className="cursor-not-allowed">{content}</div>;
  }
  return <Link to={path} className="block">{content}</Link>;
};

const Tools: React.FC = () => {
  const tools = [
    {
      title: 'MP4 to GIF',
      icon: <FileVideo />,
      path: '/tools/video-to-gif',
      comingSoon: false
    },
    {
      title: 'GIF Compressor',
      icon: <Scissors />,
      path: '/tools/gif-compressor',
      comingSoon: false
    },
    {
      title: 'Image Compressor',
      icon: <FileImage />,
      path: '/tools/image-compressor',
      comingSoon: false
    },
    {
      title: 'Image Resizer',
      icon: <FileImage />,
      path: '/tools/image-resizer',
      comingSoon: false
    },
    {
      title: 'Image to PDF',
      icon: <FileText />,
      path: '/tools/image-to-pdf',
      comingSoon: false
    },
    {
      title: 'PDF to Image',
      icon: <FileImage />,
      path: '/tools/pdf-to-image',
      comingSoon: false
    },
    {
      title: 'Image Converter',
      icon: <FileImage />,
      comingSoon: true
    },
    {
      title: 'Video Converter',
      icon: <FileVideo />,
      comingSoon: true
    },
    {
      title: 'Audio Downloader',
      icon: <Music />,
      path: '/tools/audio-downloader',
      comingSoon: false
    },
    {
      title: 'Document Converter',
      icon: <FileCode />,
      comingSoon: true
    },
    {
      title: 'Archive Extractor',
      icon: <FileArchive />,
      comingSoon: true
    }
  ];

  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>All Tools - sLixTOOLS</title>
        <meta name="description" content="Explore all the free online tools available at sLixTOOLS for your file conversion needs." />
        <link rel="canonical" href="https://slixtools.io/tools" />
      </Helmet>
      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              All Tools
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 mb-6">
              Explore our collection of free online tools to help with all your file conversion and optimization needs.
              <br />
              <span className="text-green-400">All processing happens in your browser</span> – your files never leave your computer.
            </p>
          </AnimatedElement>
        </div>

        <div className="max-w-4xl mx-auto w-full">
          <AnimatedElement type="fadeIn" delay={0.6}>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-1">
              <div className="pl-6">
                <ToolItem 
                  title="MP4 to GIF" 
                  icon={<FileVideo />}
                  path="/tools/video-to-gif"
                />
                <ToolItem 
                  title="GIF Compressor" 
                  icon={<Scissors />}
                  path="/tools/gif-compressor"
                />
                <ToolItem 
                  title="Image Compressor" 
                  icon={<FileImage />}
                  path="/tools/image-compressor"
                />
                <ToolItem 
                  title="Image Resizer" 
                  icon={<FileImage />}
                  path="/tools/image-resizer"
                />
                <ToolItem 
                  title="Image to PDF" 
                  icon={<FileText />}
                  path="/tools/image-to-pdf"
                />
                <ToolItem 
                  title="PDF to Image" 
                  icon={<FileImage />}
                  path="/tools/pdf-to-image"
                />
              </div>
              <div className="pl-6">
                <ToolItem 
                  title="Audio Downloader" 
                  icon={<Music />}
                  path="/tools/audio-downloader"
                />
                <ToolItem 
                  title="Image Converter" 
                  icon={<FileImage />}
                  comingSoon
                />
                <ToolItem 
                  title="Video Converter" 
                  icon={<FileVideo />}
                  comingSoon
                />
                <ToolItem 
                  title="Document Converter" 
                  icon={<FileCode />}
                  comingSoon
                />
                <ToolItem 
                  title="Archive Extractor" 
                  icon={<FileArchive />}
                  comingSoon
                />
              </div>
            </div>
          </AnimatedElement>
        </div>

        <AnimatedElement type="fadeIn" delay={0.8} className="w-full text-center mt-12">
          <Link to="/">
            <button 
              className="bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg rainbow-hover flex items-center justify-center mx-auto"
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
    </div>
  );
};

export default Tools;
