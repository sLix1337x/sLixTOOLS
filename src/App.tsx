
// Core imports
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation, Link } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Suspense, lazy, useState, useEffect, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";


// Immediate load components (critical path)
import Home from "./pages/Home";
import Tools from "./pages/Tools";
import NotFound from "./pages/NotFound";

// Lazy load heavy tool components
const VideoToGif = lazy(() => import("./pages/tools/VideoToGif"));
const GifCompressor = lazy(() => import("./pages/tools/GifCompressor"));
const ImageCompressor = lazy(() => import("./pages/tools/ImageCompressor"));
const ImageResizer = lazy(() => import("./pages/tools/ImageResizer"));
const VideoConverter = lazy(() => import("./pages/tools/VideoConverter") as any);
const ImageConverter = lazy(() => import("./pages/tools/ImageConverter"));
const ConvertCaseTool = lazy(() => import("./pages/tools/ConvertCaseTool"));
const XmlEditor = lazy(() => import("./pages/tools/XmlEditor"));
const PdfEditor = lazy(() => import("./pages/tools/PdfEditor"));

// Lazy load info pages
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Features = lazy(() => import("./pages/Features"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Impressum = lazy(() => import("./pages/Impressum"));

// Styles
import "./styles/indie-theme.css";
import "./App.css";

// Components
import MainNav from "@/components/MainNav";
const SmoothScroll = lazy(() => import("@/components/SmoothScroll"));
import CookieConsent from "@/components/common/CookieConsent";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import AppBackground from "@/components/AppBackground";

const queryClient = new QueryClient();

const AnimatedHeaderLine = () => {
  const [visible, setVisible] = useState(false);
  const [duration, setDuration] = useState('1.5s');
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Initial mount animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });

    const handleReset = (e: any) => {
      if (e.detail === 'reset') {
        // Clear any pending expansion
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Retract fast
        setDuration('0.3s');
        setVisible(false);

        // Expand slow after retraction
        timeoutRef.current = setTimeout(() => {
          setDuration('1.5s');
          setVisible(true);
        }, 350);
      }
    };

    window.addEventListener('header-animation-trigger', handleReset);
    return () => {
      window.removeEventListener('header-animation-trigger', handleReset);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="border-b border-dashed border-green-400 h-px"
      style={{
        width: '100%',
        clipPath: visible ? 'inset(0 0 0 0)' : 'inset(0 50% 0 50%)',
        transitionProperty: 'clip-path',
        transitionDuration: duration,
        transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
        transitionDelay: '0s'
      }}
    />
  );
};

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <ErrorBoundary>

      {!location.pathname.endsWith('/tools') && (
        <header className={`flex-shrink-0 ${isHomePage ? 'home-page-header' : ''}`}>
          <div className="container mx-auto max-w-2xl flex flex-col items-center">
            <div className="h-20 flex items-center w-full">
              <MainNav />
            </div>
            <AnimatedHeaderLine />
          </div>
        </header>
      )}

      <main className={`${!isHomePage && location.pathname !== '/contact' ? 'container mx-auto px-4 py-6' : 'flex flex-col min-h-0'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/video-to-gif" element={
            <Suspense fallback={<LoadingSpinner text="Loading Video to GIF converter..." />}>
              <VideoToGif />
            </Suspense>
          } />
          <Route path="/tools/gif-compressor" element={
            <Suspense fallback={<LoadingSpinner text="Loading GIF compressor..." />}>
              <GifCompressor />
            </Suspense>
          } />
          <Route path="/tools/image-compressor" element={
            <Suspense fallback={<LoadingSpinner text="Loading Image compressor..." />}>
              <ImageCompressor />
            </Suspense>
          } />
          <Route path="/tools/image-resizer" element={
            <Suspense fallback={<LoadingSpinner text="Loading Image resizer..." />}>
              <ImageResizer />
            </Suspense>
          } />


          <Route path="/tools/video-converter" element={
            <Suspense fallback={<LoadingSpinner text="Loading Video converter..." />}>
              <VideoConverter />
            </Suspense>
          } />
          <Route path="/tools/image-converter" element={
            <Suspense fallback={<LoadingSpinner text="Loading Image converter..." />}>
              <ImageConverter />
            </Suspense>
          } />
          <Route path="/tools/convert-case" element={
            <Suspense fallback={<LoadingSpinner text="Loading Convert Case Tool..." />}>
              <ConvertCaseTool />
            </Suspense>
          } />
          <Route path="/tools/xml-editor" element={
            <Suspense fallback={<LoadingSpinner text="Loading XML Editor..." />}>
              <XmlEditor />
            </Suspense>
          } />
          <Route path="/tools/pdf-editor" element={
            <Suspense fallback={<LoadingSpinner text="Loading PDF Editor..." />}>
              <PdfEditor />
            </Suspense>
          } />
          <Route path="/about" element={
            <Suspense fallback={<LoadingSpinner />}>
              <About />
            </Suspense>
          } />
          <Route path="/contact" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Contact />
            </Suspense>
          } />
          <Route path="/features" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Features />
            </Suspense>
          } />
          <Route path="/privacy-policy" element={
            <Suspense fallback={<LoadingSpinner />}>
              <PrivacyPolicy />
            </Suspense>
          } />
          <Route path="/terms-of-service" element={
            <Suspense fallback={<LoadingSpinner />}>
              <TermsOfService />
            </Suspense>
          } />
          <Route path="/impressum" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Impressum />
            </Suspense>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isHomePage && (
        <footer className={`border-t border-dashed border-green-400 py-4 ${location.pathname === '/contact' ? 'mt-0' : 'mt-8'}`}>
          <div className="container mx-auto px-4 text-sm">
            <div className="text-center">
              <p>© {new Date().getFullYear()} sLixTOOLS. All rights reserved.</p>
              <div className="mt-2">
                <Link to="/privacy-policy" className="mx-2 hover:text-pink-400 transition-colors" data-tool-name="privacy-policy">Privacy Policy</Link>
                <span>•</span>
                <Link to="/terms-of-service" className="mx-2 hover:text-pink-400 transition-colors" data-tool-name="terms-of-service">Terms of Service</Link>
                <span>•</span>
                <Link to="/impressum" className="mx-2 hover:text-pink-400 transition-colors" data-tool-name="impressum">Impressum</Link>
                <span>•</span>
                <Link to="/contact" className="mx-2 hover:text-pink-400 transition-colors" data-tool-name="contact">Contact</Link>
                <span>•</span>
                <a href="https://github.com/sLix1337x/sLixTOOLS" target="_blank" rel="noopener noreferrer" className="mx-2 hover:text-pink-400 transition-colors" data-tool-name="github">GitHub</a>
              </div>
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
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <HashRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <AppBackground />
            <AppWrapper />
          </HashRouter>

          <Sonner className="toaster" position="bottom-right" />
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

const AppWrapper = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (isHomePage) {
    // Home page WITHOUT SmoothScroll wrapper
    return (
      <div className="flex flex-col min-h-[calc(100vh-5rem)]">
        <div className="flex-grow flex flex-col relative z-10">
          <AppContent />
        </div>
        <CookieConsent />
      </div>
    );
  }

  // All other pages WITH SmoothScroll wrapper
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SmoothScroll>
        <div className="flex flex-col min-h-[calc(100vh-5rem)]">
          <div className="flex-grow flex flex-col relative z-10">
            <AppContent />
          </div>
          <CookieConsent />
        </div>
      </SmoothScroll>
    </Suspense>
  );
};

export default App;
