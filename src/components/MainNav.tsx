
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, FileImage, FileVideo, Image as ImageIcon, Type, Zap } from 'lucide-react';
import { preloadRoute } from '@/utils/preloader';
import { EXTERNAL_URLS } from '@/config/externalUrls';

// Removed PERFORMANCE_CONFIG import - using simplified approach

// Add rainbow hover effect styles
const rainbowStyles = `
  @keyframes slidebg {
    to { background-position: 20vw; }
  }
  @keyframes shine {
    0% {
      background-position: -200% center;
    }
    50% {
      background-position: 200% center;
    }
    100% {
      background-position: -200% center;
    }
  }
  .rainbow-hover {
    transition: all 0.3s ease;
  }
  .rainbow-hover:hover {
    background-image: linear-gradient(90deg, #00C0FF 0%, #FFCF00 49%, #FC4F4F 80%, #00C0FF 100%) !important;
    background-size: 20vw auto !important;
    animation: slidebg 5s linear infinite !important;
    color: white !important;
    border-color: transparent !important;
    transform: none !important;
    box-shadow: none !important;
    outline: none !important;
    box-shadow: none !important;
  }
  .rainbow-hover:focus {
    outline: none !important;
    box-shadow: none !important;
    ring: 0 !important;
  }
  .shiny-text {
    background: linear-gradient(
      90deg,
      #3b82f6 0%,
      #22c55e 25%,
      #ffffff 50%,
      #22c55e 75%,
      #3b82f6 100%
    );
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shine 25s ease-in-out infinite;
  }
  .shiny-text-red {
    background: linear-gradient(
      90deg,
      #ec4899 0%,
      #22c55e 20%,
      #f472b6 40%,
      #ffffff 60%,
      #22c55e 80%,
      #ec4899 100%
    );
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shine 25s ease-in-out infinite;
  }
`;

// Add styles to document head
const styleElement = document.createElement('style');
styleElement.textContent = rainbowStyles;
document.head.appendChild(styleElement);

const MainNav: React.FC = React.memo(() => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  

  
  // Preload routes on hover with simple delay
  const handleRouteHover = useCallback((path: string) => {
    const delay = 100; // Simple 100ms delay
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      preloadRoute(path).catch(_error => {
          if (process.env.NODE_ENV === 'development') {
            // Route preloading errors logged to development system
          }
        });
    }, delay);
  }, []);

  const availableTools = useMemo(() => [
    { 
      name: "Video to GIF", 
      path: "/tools/video-to-gif",
      icon: <FileVideo className="h-5 w-5 flex-shrink-0" />
    },
    { 
      name: "GIF Compressor", 
      path: "/tools/gif-compressor",
      icon: <FileImage className="h-5 w-5 flex-shrink-0" />
    },
    { 
      name: "Image Compressor", 
      path: "/tools/image-compressor",
      icon: <ImageIcon className="h-5 w-5 flex-shrink-0" />
    },
    { 
      name: "Image Resizer", 
      path: "/tools/image-resizer",
      icon: <FileImage className="h-5 w-5 flex-shrink-0" />
    },
    { 
      name: "Image Converter", 
      path: "/tools/image-converter",
      icon: <FileImage className="h-5 w-5 flex-shrink-0" />
    },
    { 
      name: "Video Converter", 
      path: "/tools/video-converter",
      icon: <FileVideo className="h-5 w-5 flex-shrink-0" />
    },
    { 
      name: "Convert Case Tool", 
      path: "/tools/convert-case",
      icon: <Type className="h-5 w-5 flex-shrink-0" />
    }
  ], []);



  // Handle click outside to close dropdown
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setToolsOpen(false);
    }
  }, []);

  const toggleTools = useCallback(() => {
    setToolsOpen(prev => !prev);
  }, []);

  const closeTools = useCallback(() => {
    setToolsOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  return (
    <nav className="w-full">
      <div className="flex items-center justify-between h-16 w-full">
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center group">
            <img 
              src={EXTERNAL_URLS.DEMO_IMAGES.LOGO}
              alt="sLixTOOLS Logo"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
              style={{ 
                display: 'block',
                maxHeight: '40px'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgNDggNDgiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMDA3YmZjIi8+PHRleHQgeD0iMjQiIHk9IjI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+U1Q8L3RleHQ+PC9zdmc+';
              }}
            />
            <span className="ml-2 font-bold text-xl shiny-text">sLixTOOLS</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-4">
          <div className="relative" ref={menuRef}>
            <button 
              onClick={toggleTools} 
              className="flex items-center text-sm font-medium text-white hover:text-white transition-all bg-gray-800/80 hover:bg-gray-700/90 px-4 py-2.5 rounded-lg border border-gray-600/40 hover:border-gray-500/60"
            >
              <span>Tools</span>
              <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transform transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <div 
              className={`absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-full min-w-[320px] max-w-[380px] bg-black/40 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl overflow-hidden transition-all duration-200 ${
                toolsOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="py-2">
                {/* Available Tools */}
                <div className="px-3 py-1">
                  <div className="flex items-center space-x-3 px-2 py-1 mb-2">
                    <Zap className="h-8 w-8 text-blue-400" />
                    <h3 className="text-5xl font-bold text-white uppercase tracking-wide">Tools</h3>
                  </div>
                  <div className="space-y-0">
                    {availableTools.map((tool, index) => (
                      <Link 
                        key={index}
                        to={tool.path}
                        className="group flex items-center space-x-3 px-3 py-2 text-lg hover:bg-white/10 transition-colors duration-150 rounded-md"
                        onClick={closeTools}
                        onMouseEnter={() => handleRouteHover(tool.path)}
                      >
                        <span className="text-gray-300 group-hover:text-blue-400 transition-colors duration-150 flex-shrink-0">
                          {tool.icon}
                        </span>
                        <span className="font-bold text-lg truncate shiny-text-red">{tool.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                
                {/* View All Link */}
                <div className="border-t border-white/10 mt-1">
                  <Link 
                    to="/tools"
                    className="flex items-center justify-between px-5 py-3 text-base text-white hover:bg-white/10 hover:text-blue-400 transition-colors duration-150"
                    onClick={closeTools}
                    onMouseEnter={() => handleRouteHover('/tools')}
                  >
                    <span className="font-semibold">View All Tools</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <Link 
            to="/features" 
            className="text-sm font-medium text-gray-200 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-gray-800/50"
            onMouseEnter={() => handleRouteHover('/features')}
          >
            Features
          </Link>
        </nav>
        
        <div className="flex items-center space-x-3">
          <Button 
            className="bg-[#2AD587] text-black font-medium rainbow-hover" 
            asChild
          >
            <Link 
              to="/tools"
              onMouseEnter={() => handleRouteHover('/tools')}
            >
              All Tools
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
});

MainNav.displayName = 'MainNav';

export default MainNav;
