import React from 'react';
import { Helmet } from 'react-helmet-async';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';

interface ToolPageLayoutProps {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  pageTitle: string;
  pageDescription: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  headerGradient?: string;
}

/**
 * Shared layout component for tool pages providing consistent structure
 * Includes ParticleBackground, SEO meta tags, animated header, and content area
 */
const ToolPageLayout: React.FC<ToolPageLayoutProps> = ({
  title,
  description,
  keywords,
  canonicalUrl,
  pageTitle,
  pageDescription,
  children,
  maxWidth = '4xl',
  headerGradient = 'from-green-400 to-blue-400'
}) => {
  const maxWidthClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  }[maxWidth];

  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        {/* Header Section */}
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className={`text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r ${headerGradient} bg-clip-text text-transparent`}>
              {pageTitle}
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
              {pageDescription}
            </p>
          </AnimatedElement>
        </div>

        {/* Content Area */}
        <div className={`${maxWidthClass} mx-auto w-full`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ToolPageLayout;