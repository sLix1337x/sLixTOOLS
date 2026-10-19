import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { preloadRoute } from '@/utils/preloader';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import { getAvailableTools } from '@/config/toolsData';
import { cn } from '@/lib/utils';

// Single source of truth: new tools in toolsData show up in the menu automatically
const AVAILABLE_TOOLS = getAvailableTools().filter((tool) => tool.path);

const NAV_ITEM_VARIANTS = {
  visible: { opacity: 1, x: 0 },
  hidden: { opacity: 0, x: -30 }
} as const;

const FALLBACK_LOGO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgNDggNDgiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMDA3YmZjIi8+PHRleHQgeD0iMjQiIHk9IjI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+U1Q8L3RleHQ+PC9zdmc+';

const MainNav = () => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const handleRouteHover = useCallback((path: string) => {
    setTimeout(() => preloadRoute(path).catch(() => {}), 100);
  }, []);

  useEffect(() => {
    if (!isHomePage) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleSectionChange = () => {
      setIsAnimating(true);
      clearTimeout(timer);
      timer = setTimeout(() => setIsAnimating(false), 1500);
    };
    window.addEventListener('section-change', handleSectionChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('section-change', handleSectionChange);
    };
  }, [isHomePage]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current?.contains(event.target as Node)) return;
    setToolsOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Escape closes the menu and returns focus to its toggle
  useEffect(() => {
    if (!toolsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setToolsOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toolsOpen]);

  const navTransition = isAnimating
    ? { duration: 0.35, ease: "easeIn" as const }
    : { duration: 0.5, ease: "easeOut" as const };

  return (
    <nav className="w-full" aria-label="Main">
      <div className="flex items-center justify-between h-16 w-full">
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center group rounded-md" aria-label="sLixTOOLS home">
            <motion.div
              className="flex items-center"
              initial="visible"
              animate={isAnimating ? "hidden" : "visible"}
              variants={NAV_ITEM_VARIANTS}
              transition={{ ...navTransition, delay: 0 }}
            >
              <img
                src={EXTERNAL_URLS.DEMO_IMAGES.LOGO}
                alt=""
                className="h-10 w-auto max-h-[40px] object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_LOGO;
                }}
              />
              <span className="ml-2 font-bold text-xl shiny-text">sLixTOOLS</span>
            </motion.div>
          </Link>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <motion.div
            className="relative"
            ref={menuRef}
            onBlur={(e) => {
              // Tabbing out of the open menu closes it
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setToolsOpen(false);
            }}
            initial="visible"
            animate={isAnimating ? "hidden" : "visible"}
            variants={NAV_ITEM_VARIANTS}
            transition={{ ...navTransition, delay: 0.05 }}
          >
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={toolsOpen}
              aria-controls="nav-tools-menu"
              onClick={() => setToolsOpen(prev => !prev)}
              className="flex items-center text-sm font-medium text-white hover:text-white transition-all bg-gray-800/80 hover:bg-gray-700/90 px-4 py-2.5 rounded-lg border border-gray-600/40 hover:border-gray-500/60"
            >
              <span>Tools</span>
              <ChevronDown className={cn("ml-1.5 h-3.5 w-3.5 transform transition-transform", toolsOpen && 'rotate-180')} aria-hidden="true" />
            </button>

            {/* `invisible` when closed keeps the hidden links out of the tab order */}
            <div
              id="nav-tools-menu"
              className={cn(
                "absolute z-50 left-1/2 -translate-x-1/2 top-full pt-3 w-[min(560px,90vw)] transition-all duration-200",
                toolsOpen ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 -translate-y-1 pointer-events-none'
              )}
            >
              <div className="rounded-xl border border-white/10 bg-[#0d0f13]/95 backdrop-blur-xl shadow-2xl overflow-hidden nav-dropdown-shadow">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    All tools
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {AVAILABLE_TOOLS.length} tools · free forever
                  </span>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 p-2">
                  {AVAILABLE_TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const path = tool.path as string;
                    return (
                      <li key={path}>
                      <Link
                        to={path}
                        className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] focus-visible:bg-white/[0.06] transition-colors duration-150"
                        onClick={() => setToolsOpen(false)}
                        onMouseEnter={() => handleRouteHover(path)}
                        onFocus={() => handleRouteHover(path)}
                      >
                        <span className="flex-shrink-0 mt-0.5 text-slate-400 group-hover:text-sky-400 transition-colors duration-150">
                          {tool.iconImage ? (
                            <img
                              src={tool.iconImage}
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              width={20}
                              height={20}
                              className="h-5 w-5 object-contain"
                            />
                          ) : (
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                            {tool.title}
                          </span>
                          <span className="block text-[11px] text-slate-400 truncate">
                            {tool.description}
                          </span>
                        </span>
                      </Link>
                      </li>
                    );
                  })}
                </ul>

                <Link
                  to="/tools"
                  className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-sky-300 transition-colors duration-150"
                  onClick={() => setToolsOpen(false)}
                  onMouseEnter={() => handleRouteHover('/tools')}
                >
                  <span className="font-medium">View all tools</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
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
        </div>

        <motion.div
          className="flex items-center space-x-3"
          initial="visible"
          animate={isAnimating ? "hidden" : "visible"}
          variants={NAV_ITEM_VARIANTS}
          transition={{ ...navTransition, delay: 0.15 }}
        >
          <Button
            className="bg-primary-action text-white font-medium rainbow-hover shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:shadow-[0_0_25px_rgba(56,189,248,0.7)] transition-shadow duration-300"
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

