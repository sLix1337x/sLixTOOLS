import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileVideo, FileImage, FileText, Music, Scissors, Zap, Lock, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedElement from '@/components/AnimatedElement';
import ParticleBackground from '@/components/ParticleBackground';
import { Helmet } from 'react-helmet-async';

interface ToolItemProps {
  title: string;
  icon: React.ReactNode;
  path?: string;
  comingSoon?: boolean;
}

const ToolItem: React.FC<ToolItemProps> = ({ title, icon, path, comingSoon }) => {
  const content = (
    <div className={`py-0.5 text-base group ${comingSoon ? 'opacity-60' : 'hover:text-[#42C574]'}`}>
      <div className="flex items-center space-x-2">
        <div className={`flex-shrink-0 ${comingSoon ? 'text-gray-400' : 'text-gray-400 group-hover:text-[#42C574]'}`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4 transition-colors' })}
        </div>
        <span className={`font-bold transition-colors ${comingSoon ? 'text-gray-400' : 'text-white group-hover:text-[#42C574]'}`} style={{ fontWeight: 600 }}>
          {title}
        </span>
        {comingSoon && <span className="text-xs text-gray-500">(soon)</span>}
      </div>
    </div>
  );
  if (comingSoon || !path) {
    return <div className="cursor-not-allowed">{content}</div>;
  }
  return <Link to={path} className="block">{content}</Link>;
};

const Home: React.FC = () => {
  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>sLixTOOLS - Free Online File Conversion Tools</title>
        <meta name="description" content="Free online tools for all your file conversion needs. Convert videos to GIFs, compress images, resize pictures, and more - all in your browser." />
        <link rel="canonical" href="https://slixtools.io" />
      </Helmet>
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 py-12 relative">
          <div className="flex-1 space-y-6">
            <AnimatedElement type="fadeIn" delay={0.2}>
              <h1 className="text-5xl md:text-6xl font-bold text-green-400 leading-tight">
                sLixTOOLS<span className="text-pink-400">.</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mt-4">
                Free online tools for all your file conversion needs
              </p>
            </AnimatedElement>
            
            <AnimatedElement type="slideUp" delay={0.4}>
              <div className="mt-8">
                <Link 
                  to="/tools" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all duration-300 rainbow-hover"
                >
                  Explore Tools
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </AnimatedElement>
          </div>
          
          <AnimatedElement type="scale" delay={0.3} className="absolute right-0 bottom-0 z-10 w-full">
            <img 
              src="https://i.ibb.co/MkhkkNG6/funkykong.gif" 
              alt="Funky Kong Dancing" 
              className="max-w-[80px] sm:max-w-[100px] md:max-w-[120px] lg:max-w-[150px] absolute
                       right-[20%] sm:right-[15%] md:right-[10%] lg:right-[5%] bottom-[110px]
                       transition-all duration-300" 
            />
          </AnimatedElement>
        </div>
        
        <AnimatedElement type="fadeIn" delay={0.6}>
          <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-800/50 rounded-lg border border-green-400/20">
              <h3 className="text-xl font-bold text-green-400 mb-3">Fast Processing</h3>
              <p className="text-gray-300">All our tools run directly in your browser for quick results and maximum privacy.</p>
            </div>
            <div className="p-6 bg-gray-800/50 rounded-lg border border-green-400/20">
              <h3 className="text-xl font-bold text-green-400 mb-3">Free to Use</h3>
              <p className="text-gray-300">All tools are completely free with no hidden fees or subscription required.</p>
            </div>
            <div className="p-6 bg-gray-800/50 rounded-lg border border-green-400/20">
              <h3 className="text-xl font-bold text-green-400 mb-3">Privacy First</h3>
              <p className="text-gray-300">Your files never leave your device - everything is processed locally.</p>
            </div>
          </div>
        </AnimatedElement>
        
        <AnimatedElement type="fadeIn" delay={0.6}>
          <div className="max-w-3xl mx-auto text-center mt-12 mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              All Tools
            </h1>
            <p className="text-gray-300 mb-6">
              Explore our collection of free online tools to help with all your file conversion and optimization needs.
              <br />
              <span className="text-green-400">All processing happens in your browser</span> – your files never leave your computer.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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

              <ToolItem 
                title="Audio Downloader"
                icon={<Music />}
                path="/tools/audio-downloader"
              />
              
              <ToolItem 
                title="Image Converter"
                icon={<FileImage />}
                comingSoon={true}
              />
              
              <ToolItem 
                title="Video Converter"
                icon={<FileVideo />}
                comingSoon={true}
              />
            </div>
          </div>
        </AnimatedElement>
        
        <AnimatedElement type="fadeIn" delay={0.8} className="w-full text-center mt-12 mb-8">
          <Link to="/tools">
            <button 
              className="bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg rainbow-hover flex items-center justify-center mx-auto"
              style={{
                outline: 'none',
                border: 'none',
                WebkitAppearance: 'none',
                WebkitTapHighlightColor: 'transparent',
                minWidth: '200px'
              }}
            >
              <span className="relative z-10">View All Tools</span>
              <ArrowRight className="ml-2 h-4 w-4 relative z-10" />
            </button>
          </Link>
        </AnimatedElement>
      </div>
    </div>
  );
};

export default Home;
