
// Core imports
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

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

// Styles
import "./styles/indie-theme.css";
import "./App.css";

// Components
import MainNav from "@/components/MainNav";
import SmoothScroll from "@/components/SmoothScroll";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL \"*\" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      <footer className={`border-t border-dashed border-green-400 py-4 ${location.pathname === '/contact' ? 'mt-0' : 'mt-8'}`}>

        <div className="container mx-auto px-4 text-center text-sm">
          <p>© {new Date().getFullYear()} sLixTOOLS - Free online tools for all your file conversion needs</p>
          <div className="mt-2">
            <a href="/privacy-policy" className="mx-2 hover:text-pink-400 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="/terms-of-service" className="mx-2 hover:text-pink-400 transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="/contact" className="mx-2 hover:text-pink-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HelmetProvider>
        <Sonner />
        <BrowserRouter>
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
            </div>
          </SmoothScroll>
        </BrowserRouter>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
