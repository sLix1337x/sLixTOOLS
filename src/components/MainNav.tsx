import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, FileImage, FileVideo, Image as ImageIcon, Type, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { preloadRoute } from '@/utils/preloader';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import { cn } from '@/lib/utils';

const AVAILABLE_TOOLS = [
  { name: "Video to GIF", path: "/tools/video-to-gif", icon: FileVideo },
  { name: "GIF Compressor", path: "/tools/gif-compressor", icon: FileImage },
  { name: "Image Compressor", path: "/tools/image-compressor", icon: ImageIcon },
  { name: "Image Resizer", path: "/tools/image-resizer", icon: FileImage },
  { name: "Image Converter", path: "/tools/image-converter", icon: FileImage },
  { name: "Video Converter", path: "/tools/video-converter", icon: FileVideo },
  { name: "Convert Case Tool", path: "/tools/convert-case", icon: Type },
] as const;

const NAV_ITEM_VARIANTS = {
  visible: { opacity: 1, x: 0 },
  hidden: { opacity: 0, x: -30 }
} as const;

const FALLBACK_LOGO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgNDggNDgiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMDA3YmZjIi8+PHRleHQgeD0iMjQiIHk9IjI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+U1Q8L3RleHQ+PC9zdmc+';

const MainNav = () => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const handleRouteHover = useCallback((path: string) => {
    setTimeout(() => preloadRoute(path).catch(() => {}), 100);
  }, []);

  useEffect(() => {
    if (!isHomePage) return;
    const handleSectionChange = () => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1500);
    };
    window.addEventListener('section-change', handleSectionChange);
    return () => window.removeEventListener('section-change', handleSectionChange);
  }, [isHomePage]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current?.contains(event.target as Node)) return;
    setToolsOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const navTransition = isAnimating
    ? { duration: 0.35, ease: "easeIn" as const }
    : { duration: 0.5, ease: "easeOut" as const };

  return (
    <nav className="w-full">
      <div className="flex items-center justify-between h-16 w-full">
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center group">
            <motion.div
              className="flex items-center"
              initial="visible"
              animate={isAnimating ? "hidden" : "visible"}
              variants={NAV_ITEM_VARIANTS}
              transition={{ ...navTransition, delay: 0 }}
            >
              <img
                src={EXTERNAL_URLS.DEMO_IMAGES.LOGO}
                alt="sLixTOOLS Logo"
                className="h-10 w-auto max-h-[40px] object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_LOGO;
                }}
              />
              <span className="ml-2 font-bold text-xl shiny-text">sLixTOOLS</span>
            </motion.div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-4">
          <motion.div
            className="relative"
            ref={menuRef}
            initial="visible"
            animate={isAnimating ? "hidden" : "visible"}
            variants={NAV_ITEM_VARIANTS}
            transition={{ ...navTransition, delay: 0.05 }}
          >
            <button
              onClick={() => setToolsOpen(prev => !prev)}
              className="flex items-center text-sm font-medium text-white hover:text-white transition-all bg-gray-800/80 hover:bg-gray-700/90 px-4 py-2.5 rounded-lg border border-gray-600/40 hover:border-gray-500/60"
            >
              <span>Tools</span>
              <ChevronDown className={cn("ml-1.5 h-3.5 w-3.5 transform transition-transform", toolsOpen && 'rotate-180')} />
            </button>

            <div
              className={cn(
                "absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-full min-w-[320px] max-w-[380px] bg-black/40 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl overflow-hidden transition-all duration-200 nav-dropdown-shadow",
                toolsOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
              )}
            >
              <div className="py-2">
                {/* Available Tools */}
                <div className="px-3 py-1">
                  <div className="flex items-center space-x-3 px-2 py-1 mb-2">
                    <Zap className="h-8 w-8 text-blue-400" />
                    <h3 className="text-5xl font-bold text-white uppercase tracking-wide">Tools</h3>
                  </div>
                  <div className="space-y-0">
                    {AVAILABLE_TOOLS.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.path}
                          to={tool.path}
                          className="group flex items-center space-x-3 px-3 py-2 text-lg hover:bg-white/10 transition-colors duration-150 rounded-md"
                          onClick={() => setToolsOpen(false)}
                          onMouseEnter={() => handleRouteHover(tool.path)}
                        >
                          <span className="text-gray-300 group-hover:text-blue-400 transition-colors duration-150 flex-shrink-0">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="font-bold text-lg truncate shiny-text-red">{tool.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* View All Link */}
                <div className="border-t border-white/10 mt-1">
                  <Link
                    to="/tools"
                    className="flex items-center justify-between px-5 py-3 text-base text-white hover:bg-white/10 hover:text-blue-400 transition-colors duration-150"
                    onClick={() => setToolsOpen(false)}
                    onMouseEnter={() => handleRouteHover('/tools')}
                  >
                    <span className="font-semibold">View All Tools</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial="visible"
            animate={isAnimating ? "hidden" : "visible"}
            variants={NAV_ITEM_VARIANTS}
            transition={{ ...navTransition, delay: 0.1 }}
          >
            <Link
              to="/features"
              className="text-sm font-medium text-gray-200 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-gray-800/50"
              onMouseEnter={() => handleRouteHover('/features')}
            >
              Features
            </Link>
          </motion.div>
        </nav>

        <motion.div
          className="flex items-center space-x-3"
          initial="visible"
          animate={isAnimating ? "hidden" : "visible"}
          variants={NAV_ITEM_VARIANTS}
          transition={{ ...navTransition, delay: 0.15 }}
        >
          <Button
            className="bg-primary-action text-white font-medium rainbow-hover shadow-[0_0_15px_rgba(42,213,135,0.5)] hover:shadow-[0_0_25px_rgba(42,213,135,0.7)] transition-shadow duration-300"
            asChild
          >
            <Link
              to="/tools"
              onMouseEnter={() => handleRouteHover('/tools')}
            >
              All Tools
            </Link>
          </Button>
        </motion.div>
      </div>
    </nav>
  );
};

export default MainNav;

