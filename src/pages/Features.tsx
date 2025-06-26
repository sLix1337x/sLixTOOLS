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
        <title>Features | sLixTOOLS</title>
        <meta name="description" content="Explore the powerful features of our free online media tools. Convert, compress, and edit your files with ease." />
        <meta name="keywords" content="sLixTOOLS features, video converter features, GIF maker, video editing tools, online converter" />
        <link rel="canonical" href="https://slixtools.io/features" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Features of sLixTOOLS
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 mb-6">
              A powerful suite of free, fast, and privacy-focused online tools to make your work easier.
            </p>
          </AnimatedElement>
        </div>

        <div className="max-w-5xl mx-auto w-full">
          <AnimatedElement type="fadeIn" delay={0.6}>
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-100">Our Toolkit</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toolFeatures.map((feature, index) => (
                <FeatureItem key={index} {...feature} />
              ))}
            </div>
          </AnimatedElement>
        </div>

        <AnimatedElement type="fadeIn" delay={1.0} className="w-full">
          <div className="mt-12 text-center">
            <Link to="/tools/video-to-gif">
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
