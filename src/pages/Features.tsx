import React from 'react';
import { Zap, Lock, CircleDollarSign, Settings, FileImage, Video, FileCode, FileArchive, ArrowRight, LayoutGrid, Star, Rocket, Files, Check, Headphones, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import AnimatedElement from '@/components/AnimatedElement';

const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="group p-4 rounded-xl border border-white/10 bg-white/[0.03] h-full transition-all duration-300 hover:border-sky-400/40 hover:shadow-[0_12px_40px_-16px_rgba(56,189,248,0.3)] hover:-translate-y-1">
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 text-sky-400 group-hover:text-sky-300 transition-colors duration-300">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold mb-1.5 text-gray-100 group-hover:text-white transition-colors duration-300">{title}</h3>
        <p className="text-gray-400 text-xs leading-relaxed group-hover:text-gray-300 transition-colors duration-300">{description}</p>
      </div>
    </div>
  </div>
);

const Features = () => {
  const coreFeatures = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Lightning Fast',
      description: 'Convert videos to GIFs in seconds with our optimized client-side processing technology.',
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: 'Privacy Focused',
      description: 'All processing happens in your browser. Your files never leave your device, ensuring 100% privacy.',
    },
    {
      icon: <CircleDollarSign className="h-6 w-6" />,
      title: 'Completely Free',
      description: 'No hidden costs, no watermarks, and no sign-up required. Ever.',
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: 'Advanced Controls',
      description: 'Fine-tune your GIFs with settings for FPS, quality, dimensions, and trimming.',
    },
  ];

  const toolFeatures = [
    {
      icon: <Video className="h-6 w-6" />,
      title: 'Video to GIF',
      description: 'The core of our toolkit. Convert MP4, WEBM, AVI, and more into high-quality animated GIFs.',
    },
    {
      icon: <FileImage className="h-6 w-6" />,
      title: 'GIF Compressor',
      description: 'Reduce the file size of your GIFs without significant quality loss, perfect for web use.',
    },
    {
      icon: <FileCode className="h-6 w-6" />,
      title: 'Image & Video Converters',
      description: 'A suite of tools to convert between various image and video formats. (Coming Soon)',
    },
    {
      icon: <FileArchive className="h-6 w-6" />,
      title: 'And Many More',
      description: 'We are constantly developing new tools to meet all your file conversion needs.',
    },
  ];

  return (
    <div className="text-white relative min-h-0">
      <SEO
        title="Features - Free Online Video to GIF Converter & Media Tools | sLixTOOLS"
        description="Discover powerful features of sLixTOOLS: free video to GIF converter, image compressor, PDF editor, and more. Fast, secure, browser-based tools with no uploads required."
        keywords="video to gif converter, online gif maker, image compressor, video converter, pdf editor, free media tools, browser-based converter, privacy-focused tools, no upload required, fast conversion"
      />

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.1}>
            <p className="text-xs font-medium uppercase tracking-widest text-sky-400/80 mb-3">
              Features
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
              Everything you need to convert media
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.2}>
            <p className="text-slate-400 mb-6 text-base leading-relaxed">
              Discover the powerful features of sLixTOOLS — your complete solution for video to GIF conversion, image compression, and more. All tools are free, secure, and work directly in your browser without uploads.
            </p>
          </AnimatedElement>
        </div>

        <div className="max-w-6xl mx-auto w-full">
          <AnimatedElement type="fadeIn" delay={0.3}>
            <h2 className="text-xl font-semibold mb-4 text-center text-white flex items-center justify-center gap-2">
              <LayoutGrid className="h-5 w-5 text-sky-400" aria-hidden="true" />
              Complete Media Conversion Toolkit
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {toolFeatures.map((feature, index) => (
                <FeatureItem key={index} {...feature} />
              ))}
            </div>
          </AnimatedElement>
        </div>

        {/* Core Features Section */}
        <AnimatedElement type="fadeIn" delay={0.35}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-center text-white flex items-center justify-center gap-2">
              <Star className="h-5 w-5 text-sky-400" aria-hidden="true" />
              Why Choose sLixTOOLS?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {coreFeatures.map((feature, index) => (
                <FeatureItem key={index} {...feature} />
              ))}
            </div>
          </div>
        </AnimatedElement>

        {/* SEO Content Section */}
        <AnimatedElement type="fadeIn" delay={0.4}>
          <div className="mt-8 max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-3 text-white flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-sky-400" aria-hidden="true" />
                Professional Media Conversion Tools
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">
                sLixTOOLS provides a comprehensive suite of free online media conversion tools designed for professionals, content creators, and everyday users. Our browser-based technology ensures your files remain private while delivering fast, high-quality results.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl border border-slate-400/10 bg-white/[0.03] p-5">
                <h3 className="text-base font-semibold mb-3 text-sky-300 flex items-center gap-2">
                  <Rocket className="h-4 w-4" aria-hidden="true" />
                  Perfect for Content Creators
                </h3>
                <ul className="text-slate-300 space-y-2 text-sm">
                  {[
                    'Convert videos to GIFs for social media',
                    'Compress images for faster website loading',
                    'Convert audio files for different platforms',
                    'Resize images for various social media formats',
                    'Create animated GIFs from video clips',
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Check className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-400/10 bg-white/[0.03] p-5">
                <h3 className="text-base font-semibold mb-3 text-sky-300 flex items-center gap-2">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Technical Advantages
                </h3>
                <ul className="text-slate-300 space-y-2 text-sm">
                  {[
                    'Client-side processing for maximum privacy',
                    'No file size limits or upload restrictions',
                    'Support for multiple video and image formats',
                    'Advanced compression algorithms',
                    'Real-time preview and quality control',
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Check className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.02] p-6 mb-8 border border-slate-400/10">
              <h3 className="text-lg font-semibold mb-4 text-center text-white flex items-center justify-center gap-2">
                <Files className="h-5 w-5 text-sky-400" aria-hidden="true" />
                Supported File Formats
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="rounded-lg border border-slate-400/10 bg-white/[0.03] p-4">
                  <Video className="h-5 w-5 mx-auto mb-2 text-sky-400" aria-hidden="true" />
                  <h4 className="text-sm font-semibold mb-2 text-sky-300">Video Formats</h4>
                  <p className="text-slate-400 text-xs">MP4, WEBM, AVI, MOV, MKV, FLV, WMV, and more</p>
                </div>
                <div className="rounded-lg border border-slate-400/10 bg-white/[0.03] p-4">
                  <FileImage className="h-5 w-5 mx-auto mb-2 text-sky-400" aria-hidden="true" />
                  <h4 className="text-sm font-semibold mb-2 text-sky-300">Image Formats</h4>
                  <p className="text-slate-400 text-xs">JPEG, PNG, GIF, WEBP, BMP, TIFF, SVG, and more</p>
                </div>
                <div className="rounded-lg border border-slate-400/10 bg-white/[0.03] p-4">
                  <Headphones className="h-5 w-5 mx-auto mb-2 text-sky-400" aria-hidden="true" />
                  <h4 className="text-sm font-semibold mb-2 text-sky-300">Audio Formats</h4>
                  <p className="text-slate-400 text-xs">MP3, WAV, OGG, AAC, FLAC, M4A, and more</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-3 text-white flex items-center justify-center gap-2">
                <Rocket className="h-5 w-5 text-sky-400" aria-hidden="true" />
                Start Converting Your Media Files Today
              </h3>
              <p className="text-slate-400 mb-4 text-sm">
                Join thousands of users who trust sLixTOOLS for their daily media conversion needs. Our tools are completely free, require no registration, and work directly in your browser for maximum convenience and security.
              </p>
            </div>
          </div>
        </AnimatedElement>

        <AnimatedElement type="fadeIn" delay={0.45} className="w-full">
          <div className="mt-6 text-center">
            <Link to="/tools">
              <button
                className="bg-white text-slate-950 font-semibold py-3 px-8 rounded-xl flex items-center justify-center mx-auto transition-all duration-200 hover:bg-slate-200 shadow-lg shadow-black/40 hover:shadow-black/50"
                style={{
                  outline: 'none',
                  border: 'none',
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: '200px'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                <span className="relative z-10">Get Started Now</span>
                <ArrowRight className="ml-2 h-4 w-4 relative z-10" />
              </button>
            </Link>
          </div>
        </AnimatedElement>
      </div>
    </div>
  );
};

export default Features;
