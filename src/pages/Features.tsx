import React from 'react';
import { Zap, Lock, CircleDollarSign, Settings, FileImage, Video, FileCode, FileArchive, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';

const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="p-6 rounded-lg border border-gray-700/50 bg-gray-900/20 h-full">
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 text-green-400">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-100">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </div>
  </div>
);

const Features: React.FC = () => {
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
      <ParticleBackground />
      <Helmet>
        <title>Features - Free Online Video to GIF Converter & Media Tools | sLixTOOLS</title>
        <meta name="description" content="Discover powerful features of sLixTOOLS: free video to GIF converter, image compressor, audio converter, and more. Fast, secure, browser-based tools with no uploads required." />
        <meta name="keywords" content="video to gif converter, online gif maker, image compressor, audio converter, video converter, free media tools, browser-based converter, privacy-focused tools, no upload required, fast conversion" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Features - Free Online Video to GIF Converter & Media Tools | sLixTOOLS" />
        <meta property="og:description" content="Discover powerful features of sLixTOOLS: free video to GIF converter, image compressor, audio converter, and more. Fast, secure, browser-based tools." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://slixtools.io/features" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Features - Free Online Video to GIF Converter & Media Tools" />
        <meta name="twitter:description" content="Fast, secure, browser-based media conversion tools. Convert videos to GIFs, compress images, and more - all for free!" />
        <link rel="canonical" href="https://slixtools.io/features" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Free Online Video to GIF Converter & Media Tools Features
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 mb-6 text-lg leading-relaxed">
              Discover the powerful features of sLixTOOLS - your complete solution for video to GIF conversion, image compression, audio conversion, and more. All tools are free, secure, and work directly in your browser without uploads.
            </p>
          </AnimatedElement>
        </div>

        <div className="max-w-5xl mx-auto w-full">
          <AnimatedElement type="fadeIn" delay={0.6}>
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-100">Complete Media Conversion Toolkit</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toolFeatures.map((feature, index) => (
                <FeatureItem key={index} {...feature} />
              ))}
            </div>
          </AnimatedElement>
        </div>

        {/* Core Features Section */}
        <AnimatedElement type="fadeIn" delay={0.8}>
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-100">Why Choose sLixTOOLS?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coreFeatures.map((feature, index) => (
                <FeatureItem key={index} {...feature} />
              ))}
            </div>
          </div>
        </AnimatedElement>

        {/* SEO Content Section */}
        <AnimatedElement type="fadeIn" delay={1.0}>
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-gray-100">Professional Media Conversion Tools</h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                sLixTOOLS provides a comprehensive suite of free online media conversion tools designed for professionals, content creators, and everyday users. Our browser-based technology ensures your files remain private while delivering fast, high-quality results.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-green-400">Perfect for Content Creators</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Convert videos to GIFs for social media</li>
                  <li>• Compress images for faster website loading</li>
                  <li>• Convert audio files for different platforms</li>
                  <li>• Resize images for various social media formats</li>
                  <li>• Create animated GIFs from video clips</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-green-400">Technical Advantages</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Client-side processing for maximum privacy</li>
                  <li>• No file size limits or upload restrictions</li>
                  <li>• Support for multiple video and image formats</li>
                  <li>• Advanced compression algorithms</li>
                  <li>• Real-time preview and quality control</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-900/30 rounded-lg p-8 mb-12">
              <h3 className="text-2xl font-semibold mb-4 text-center text-gray-100">Supported File Formats</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-green-400">Video Formats</h4>
                  <p className="text-gray-300 text-sm">MP4, WEBM, AVI, MOV, MKV, FLV, WMV, and more</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-green-400">Image Formats</h4>
                  <p className="text-gray-300 text-sm">JPEG, PNG, GIF, WEBP, BMP, TIFF, SVG, and more</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-green-400">Audio Formats</h4>
                  <p className="text-gray-300 text-sm">MP3, WAV, OGG, AAC, FLAC, M4A, and more</p>
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold mb-4 text-gray-100">Start Converting Your Media Files Today</h3>
              <p className="text-gray-300 mb-6">
                Join thousands of users who trust sLixTOOLS for their daily media conversion needs. Our tools are completely free, require no registration, and work directly in your browser for maximum convenience and security.
              </p>
            </div>
          </div>
        </AnimatedElement>

        <AnimatedElement type="fadeIn" delay={1.2} className="w-full">
          <div className="mt-8 text-center">
            <Link to="/tools">
              <button 
                className="bg-[#2AD587] text-black font-bold py-2.5 px-6 rounded-lg rainbow-hover flex items-center justify-center mx-auto"
                style={{
                  outline: 'none',
                  border: 'none',
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: '200px'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.boxShadow = 'none';
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
