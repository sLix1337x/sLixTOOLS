import { Toaster as Sonner } from '@/components/ui/sonner';
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { MotionConfig } from 'framer-motion';
import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';

// Immediate load components (critical path)
import Home from './pages/Home';
import Tools from './pages/Tools';
import NotFound from './pages/NotFound';

// Lazy load heavy tool components
const VideoToGif = lazy(() => import('./pages/tools/VideoToGif'));
const GifCompressor = lazy(() => import('./pages/tools/GifCompressor'));
const ImageCompressor = lazy(() => import('./pages/tools/ImageCompressor'));
const ImageResizer = lazy(() => import('./pages/tools/ImageResizer'));
const VideoConverter = lazy(() => import('./pages/tools/VideoConverter'));
const ImageConverter = lazy(() => import('./pages/tools/ImageConverter'));

const ImageSplitter = lazy(() => import('./pages/tools/ImageSplitter'));
const ConvertCaseTool = lazy(() => import('./pages/tools/ConvertCaseTool'));
const XmlEditor = lazy(() => import('./pages/tools/XmlEditor'));
const JsonValidator = lazy(() => import('./pages/tools/JsonValidator'));
const PdfEditor = lazy(() => import('./pages/tools/PdfEditor'));

// Lazy load info pages
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Features = lazy(() => import('./pages/Features'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Impressum = lazy(() => import('./pages/Impressum'));

interface LazyRouteConfig {
  path: string;
  Component: React.LazyExoticComponent<() => JSX.Element>;
  fallbackText?: string;
}

const lazyRoutes: LazyRouteConfig[] = [
  {
    path: '/tools/video-to-gif',
    Component: VideoToGif,
    fallbackText: 'Loading Video to GIF converter...',
  },
  {
    path: '/tools/gif-compressor',
    Component: GifCompressor,
    fallbackText: 'Loading GIF compressor...',
  },
  {
    path: '/tools/image-compressor',
    Component: ImageCompressor,
    fallbackText: 'Loading Image compressor...',
  },
  {
    path: '/tools/image-resizer',
    Component: ImageResizer,
    fallbackText: 'Loading Image resizer...',
  },
  {
    path: '/tools/video-converter',
    Component: VideoConverter,
    fallbackText: 'Loading Video converter...',
  },
  {
    path: '/tools/image-converter',
    Component: ImageConverter,
    fallbackText: 'Loading Image converter...',
  },
  {
    path: '/tools/image-splitter',
    Component: ImageSplitter,
    fallbackText: 'Loading Image splitter...',
  },
  {
    path: '/tools/convert-case',
    Component: ConvertCaseTool,
    fallbackText: 'Loading Convert Case Tool...',
  },
  { path: '/tools/xml-editor', Component: XmlEditor, fallbackText: 'Loading XML Editor...' },
  { path: '/tools/json-validator', Component: JsonValidator, fallbackText: 'Loading JSON Validator...' },
  { path: '/tools/pdf-editor', Component: PdfEditor, fallbackText: 'Loading PDF Editor...' },
  { path: '/about', Component: About },
  { path: '/contact', Component: Contact },
  { path: '/features', Component: Features },
  { path: '/privacy-policy', Component: PrivacyPolicy },
  { path: '/terms-of-service', Component: TermsOfService },
  { path: '/impressum', Component: Impressum },
];

// Styles
import './styles/indie-theme.css';
import './styles/professional-theme.css';
import './App.css';

// Components
import MainNav from '@/components/MainNav';
import ScrollToTop from '@/components/ScrollToTop';
import CookieConsent from '@/components/common/CookieConsent';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AppBackground from '@/components/AppBackground';
import FooterLinks, { CopyrightNotice } from '@/components/common/FooterLinks';
import { getAvailableTools } from '@/config/toolsData';

const AnimatedHeaderLine = () => {
  const [visible, setVisible] = useState(false);
  const [duration, setDuration] = useState('1.5s');
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });

    const handleReset = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setDuration('0.3s');
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setDuration('1.5s');
        setVisible(true);
      }, 350);
    };

    window.addEventListener('header-animation-trigger', handleReset);
    return () => {
      window.removeEventListener('header-animation-trigger', handleReset);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="header-divider border-b border-dashed border-sky-400 h-px w-full"
      style={{
        clipPath: visible ? 'inset(0)' : 'inset(0 50%)',
        transition: `clip-path ${duration} cubic-bezier(0.65, 0, 0.35, 1)`,
      }}
    />
  );
};

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isPdfEditor = location.pathname === '/tools/pdf-editor';
  const showHeader = !isPdfEditor;

  // The site header steps out of the way once the page is scrolled
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <ErrorBoundary>
      {/* Skip link: a plain #anchor would be read as a route by HashRouter, so focus manually */}
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-sky-400 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-950"
      >
        Skip to content
      </a>

      {showHeader && (
        <header
          className={`flex-shrink-0 ${isHomePage ? 'home-page-header' : `site-header${scrolled ? ' header-hidden' : ''}`}`}
        >
          <div className="container mx-auto max-w-2xl flex flex-col items-center">
            <div className="h-20 flex items-center w-full">
              <MainNav />
            </div>
            <AnimatedHeaderLine />
          </div>
        </header>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className={
          !isHomePage && location.pathname !== '/contact' && !isPdfEditor
            ? 'container mx-auto px-4 py-6 focus:outline-none'
            : 'flex flex-col min-h-0 focus:outline-none'
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          {lazyRoutes.map(({ path, Component, fallbackText }) => (
            <Route
              key={path}
              path={path}
              element={
                <Suspense
                  fallback={<LoadingSpinner {...(fallbackText ? { text: fallbackText } : {})} />}
                >
                  <Component />
                </Suspense>
              }
            />
          ))}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isHomePage && !location.pathname.startsWith('/tools/') && (
          <footer className="mt-16 border-t border-white/10">
            <div className="container mx-auto px-4 py-12">
              <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] max-w-5xl mx-auto">
                <div>
                  <p className="text-lg font-semibold text-white tracking-tight">sLixTOOLS</p>
                  <p className="mt-2 text-sm leading-relaxed max-w-xs">
                    Free, private, browser-based tools. Your files never leave your device.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider mb-3">Tools</p>
                  <ul className="space-y-2 text-sm">
                    {getAvailableTools().slice(0, 6).map((tool) => (
                      <li key={tool.path}>
                        <Link to={tool.path ?? '#'} className="hover:text-white transition-colors">
                          {tool.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider mb-3">Company</p>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link to="/about" className="hover:text-white transition-colors">
                        About
                      </Link>
                    </li>
                    <li>
                      <Link to="/features" className="hover:text-white transition-colors">
                        Features
                      </Link>
                    </li>
                    <li>
                      <Link to="/contact" className="hover:text-white transition-colors">
                        Contact
                      </Link>
                    </li>
                    <li>
                      <a
                        href="https://github.com/sLix1337x/sLixTOOLS"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors"
                      >
                        GitHub
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-10 pt-6 border-t border-white/5 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <CopyrightNotice />
                <FooterLinks linkClassName="mx-2" />
              </div>
            </div>
          </footer>
        )}
    </ErrorBoundary>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        {/* Honour the OS "reduce motion" setting for every framer-motion animation */}
        <MotionConfig reducedMotion="user">
        <HashRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppBackground />
          <ScrollToTop />
          <AppWrapper />
        </HashRouter>
        </MotionConfig>

        <Sonner className="toaster" position="bottom-right" />
      </HelmetProvider>
    </ErrorBoundary>
  );
};

const AppWrapper = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    document.body.classList.toggle('pro-mode', !isHomePage);
    return () => document.body.classList.remove('pro-mode');
  }, [isHomePage]);

  const layout = (
    <div className={`flex flex-col min-h-[calc(100vh-5rem)] ${isHomePage ? 'home-page' : 'app-pro'}`}>
      <div className="flex-grow flex flex-col relative z-10">
        <AppContent />
      </div>
      <CookieConsent />
    </div>
  );

  return layout;
};

export default App;
