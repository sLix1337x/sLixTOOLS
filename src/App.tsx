
// Core imports
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, HashRouter, Link } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "./contexts/LanguageContext";
import { useTranslation } from "./utils/i18n";

// Page imports
import Home from "./pages/Home";
import Tools from "./pages/Tools";
import VideoToGif from "./pages/tools/VideoToGif";
import GifCompressor from "./pages/tools/GifCompressor";
import ImageCompressor from "./pages/tools/ImageCompressor";
import ImageResizer from "./pages/tools/ImageResizer";
import AudioDownloader from "./pages/tools/AudioDownloader";
import ImageToPdf from "./pages/tools/ImageToPdf";
import PdfToImage from "./pages/tools/PdfToImage";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Features from "./pages/Features";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Impressum from "./pages/Impressum";

// Styles
import "./styles/indie-theme.css";
import "./App.css";

// Components
import MainNav from "@/components/MainNav";
import SmoothScroll from "@/components/SmoothScroll";
import CookieConsent from "@/components/common/CookieConsent";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { t } = useTranslation();

  return (
    <>
      <main className={`${!isHomePage && location.pathname !== '/contact' ? 'container mx-auto px-4 py-6' : 'flex flex-col min-h-0'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/video-to-gif" element={<VideoToGif />} />
          <Route path="/tools/gif-compressor" element={<GifCompressor />} />
          <Route path="/tools/image-compressor" element={<ImageCompressor />} />
          <Route path="/tools/image-resizer" element={<ImageResizer />} />
          <Route path="/tools/audio-downloader" element={<AudioDownloader />} />
          <Route path="/tools/image-to-pdf" element={<ImageToPdf />} />
          <Route path="/tools/pdf-to-image" element={<PdfToImage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/features" element={<Features />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/impressum" element={<Impressum />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL \"*\" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      <footer className={`border-t border-dashed border-green-400 py-4 ${location.pathname === '/contact' ? 'mt-0' : 'mt-8'}`}>

        <div className="container mx-auto px-4 text-sm">
          <div className="text-center">
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
            <div className="mt-2">
              <Link to="/privacy-policy" className="mx-2 hover:text-pink-400 transition-colors">{t('footer.privacyPolicy')}</Link>
              <span>•</span>
              <Link to="/terms-of-service" className="mx-2 hover:text-pink-400 transition-colors">{t('footer.termsOfService')}</Link>
              <span>•</span>
              <Link to="/impressum" className="mx-2 hover:text-pink-400 transition-colors">{t('footer.impressum')}</Link>
              <span>•</span>
              <Link to="/contact" className="mx-2 hover:text-pink-400 transition-colors">{t('footer.contact')}</Link>
              <span>•</span>
              <a href="https://github.com/sLix1337x/sLixTOOLS" target="_blank" rel="noopener noreferrer" className="mx-2 hover:text-pink-400 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-6 pb-2">
          <LanguageSwitcher />
        </div>
      </footer>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <LanguageProvider>
          <HashRouter>
            <SmoothScroll>
              <div className="flex flex-col min-h-[calc(100vh-5rem)]">
                <header className="flex-shrink-0">
                  <div className="container mx-auto h-20 flex items-center border-b border-dashed border-green-400">
                    <MainNav />
                  </div>
                </header>
                <div className="flex-grow flex flex-col">
                  <AppContent />
                </div>
                <CookieConsent />
              </div>
            </SmoothScroll>
          </HashRouter>
        </LanguageProvider>
      </TooltipProvider>
      <Sonner className="toaster" position="bottom-right" />
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
