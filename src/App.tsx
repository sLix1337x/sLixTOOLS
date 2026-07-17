import { Toaster as Sonner } from '@/components/ui/sonner';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
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
const ConvertCaseTool = lazy(() => import('./pages/tools/ConvertCaseTool'));
const XmlEditor = lazy(() => import('./pages/tools/XmlEditor'));
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
  { path: '/tools/video-to-gif', Component: VideoToGif, fallbackText: 'Loading Video to GIF converter...' },
  { path: '/tools/gif-compressor', Component: GifCompressor, fallbackText: 'Loading GIF compressor...' },
  { path: '/tools/image-compressor', Component: ImageCompressor, fallbackText: 'Loading Image compressor...' },
  { path: '/tools/image-resizer', Component: ImageResizer, fallbackText: 'Loading Image resizer...' },
  { path: '/tools/video-converter', Component: VideoConverter, fallbackText: 'Loading Video converter...' },
  { path: '/tools/image-converter', Component: ImageConverter, fallbackText: 'Loading Image converter...' },
  { path: '/tools/convert-case', Component: ConvertCaseTool, fallbackText: 'Loading Convert Case Tool...' },
  { path: '/tools/xml-editor', Component: XmlEditor, fallbackText: 'Loading XML Editor...' },
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
import './App.css';

// Components
import MainNav from '@/components/MainNav';
const SmoothScroll = lazy(() => import('@/components/SmoothScroll'));
import CookieConsent from '@/components/common/CookieConsent';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AppBackground from '@/components/AppBackground';
import FooterLinks, { CURRENT_YEAR } from '@/components/common/FooterLinks';

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
      className="border-b border-dashed border-green-400 h-px w-full"
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
  const showHeader = !location.pathname.endsWith('/tools') && !isPdfEditor;

  return (
    <ErrorBoundary>
      {showHeader && (
        <header className={`flex-shrink-0 ${isHomePage ? 'home-page-header' : ''}`}>
          <div className="container mx-auto max-w-2xl flex flex-col items-center">
            <div className="h-20 flex items-center w-full">
              <MainNav />
            </div>
            <AnimatedHeaderLine />
          </div>
        </header>
      )}

      <main
        className={
          !isHomePage && location.pathname !== '/contact' && !isPdfEditor
            ? 'container mx-auto px-4 py-6'
            : 'flex flex-col min-h-0'
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
                <Suspense fallback={<LoadingSpinner {...(fallbackText ? { text: fallbackText } : {})} />}>
                  <Component />
                </Suspense>
              }
            />
          ))}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isHomePage &&
        location.pathname !== '/tools' &&
        !location.pathname.startsWith('/tools/') && (
          <footer
            className={`border-t border-dashed border-green-400 py-4 ${location.pathname === '/contact' ? 'mt-0' : 'mt-8'}`}
          >
            <div className="container mx-auto px-4 text-sm text-center">
              <p>© {CURRENT_YEAR} sLixTOOLS. All rights reserved.</p>
              <FooterLinks className="mt-2" />
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
        <HashRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppBackground />
          <AppWrapper />
        </HashRouter>

        <Sonner className="toaster" position="bottom-right" />
      </HelmetProvider>
    </ErrorBoundary>
  );
};

const AppWrapper = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const layout = (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      <div className="flex-grow flex flex-col relative z-10">
        <AppContent />
      </div>
      <CookieConsent />
    </div>
  );

  if (isHomePage) return layout;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SmoothScroll>{layout}</SmoothScroll>
    </Suspense>
  );
};

export default App;
