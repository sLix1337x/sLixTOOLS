
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Clock, FileAudio, FileImage, FileText, FileVideo, Image as ImageIcon, Zap } from 'lucide-react';
import { preloadRoute } from '@/utils/preloader';
import { useComponentOptimization } from '@/hooks/usePerformanceOptimization';
import { PERFORMANCE_CONFIG } from '@/config/performance';

// Add rainbow hover effect styles
const rainbowStyles = `
  @keyframes slidebg {
    to { background-position: 20vw; }
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
`;

// Add styles to document head
const styleElement = document.createElement('style');
styleElement.textContent = rainbowStyles;
document.head.appendChild(styleElement);

type ToolsCategory = {
  title: string;
  icon: React.ReactNode;
  items: { name: string; path: string }[];
};

const MainNav: React.FC = React.memo(() => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Performance optimization for navigation component
  const { measureRenderTime, optimizeComponent } = useComponentOptimization('MainNav');
  
  // Preload routes on hover with performance-aware delays
  const handleRouteHover = useCallback((path: string) => {
    const delay = PERFORMANCE_CONFIG.lazyLoading.preloadDelay;
    setTimeout(() => {
      preloadRoute(path).catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.warn(error);
          }
        });
    }, delay);
  }, []);

  const availableTools = useMemo(() => [
    { 
      name: "MP4 to GIF", 
      path: "/tools/video-to-gif",
      icon: <FileVideo className="h-4 w-4 flex-shrink-0" />
    },
    { 
      name: "GIF Compressor", 
      path: "/tools/gif-compressor",
      icon: <FileImage className="h-4 w-4 flex-shrink-0" />
    },
    { 
      name: "Image Compressor", 
      path: "/tools/image-compressor",
      icon: <ImageIcon className="h-4 w-4 flex-shrink-0" />
    }
  ], []);

  const comingSoonTools = useMemo(() => [
    { 
      name: "Video Converter", 
      path: "#",
      icon: <FileVideo className="h-4 w-4 flex-shrink-0 opacity-50" />
    },
    { 
      name: "PDF & JPG Converter", 
      path: "/tools/pdf-jpg-converter",
      icon: <FileImage className="h-4 w-4 flex-shrink-0" />
    },
    { 
      name: "Document Converter", 
      path: "#",
      icon: <FileText className="h-4 w-4 flex-shrink-0 opacity-50" />
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
              src="https://i.ibb.co/s8Cz1nC/vorncrash2.gif"
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
            <span className="ml-2 font-bold text-xl bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">sLixTOOLS</span>
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
              className={`absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-full min-w-[480px] bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ${
                toolsOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
              style={{
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Available Tools */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-green-400" />
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Available Tools</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {availableTools.map((tool, index) => (
                        <li key={index}>
                          <Link 
                            to={tool.path}
                            className="flex items-center space-x-2.5 px-3 py-0.5 text-sm rounded-lg transition-all duration-200 text-white hover:bg-gray-800/80 hover:text-green-400 group"
                            onClick={closeTools}
                            onMouseEnter={() => handleRouteHover(tool.path)}
                          >
                            <span className="text-green-400 group-hover:scale-110 transition-transform">
                              {tool.icon}
                            </span>
                            <span className="font-medium">{tool.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Coming Soon */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Coming Soon</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {comingSoonTools.map((tool, index) => (
                        <li key={index}>
                          <span 
                            className="flex items-center space-x-2.5 px-3 py-0.5 text-sm rounded-lg transition-colors duration-200 text-gray-400 cursor-not-allowed"
                          >
                            <span className="opacity-50">
                              {tool.icon}
                            </span>
                            <span className="font-medium">{tool.name}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* View All Button */}
                <div className="mt-2 pt-2 border-t border-gray-800">
                  <Link 
                    to="/tools"
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700/70 rounded-lg text-sm font-medium text-white transition-colors duration-200"
                    onClick={closeTools}
                    onMouseEnter={() => handleRouteHover('/tools')}
                  >
                    <span>View All Tools</span>
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
