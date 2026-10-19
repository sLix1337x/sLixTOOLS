import { useEffect } from 'react';
import { Zap, Lock, CircleDollarSign, Scissors, Sparkles } from 'lucide-react';
import AnimatedElement from '@/components/AnimatedElement';
import CTAButton from '@/components/common/CTAButton';
import ToolListItem from '@/components/common/ToolListItem';
import FeatureCard from '@/components/home/FeatureCard';
import SectionSeparator from '@/components/home/SectionSeparator';
import SocialProof from '@/components/home/SocialProof';
import Container from '@/components/layout/Container';
import FullPageSectionsWrapper from '@/components/layout/FullPageSectionsWrapper';
import ScrollIndicator from '@/components/common/ScrollIndicator';
import ToolsDescription from '@/components/common/ToolsDescription';
import { getFeaturedTools } from '@/config/toolsData';
import { useFullPageScroll } from '@/hooks/useFullPageScroll';
import { useIsMobile } from '@/hooks';
import { SEO } from '@/components/SEO';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import FooterLinks, { CopyrightNotice } from '@/components/common/FooterLinks';

/** Hero feature cards configuration */
const HERO_FEATURES = [
  {
    icon: Zap,
    title: 'Fast Processing',
    description: 'All tools run in your browser — quick, private, local processing.',
    gradientFrom: 'from-sky-400',
    gradientTo: 'to-sky-600',
    delay: 0.3,
  },
  {
    icon: CircleDollarSign,
    title: 'Free to Use',
    description: 'All tools are completely free with no hidden fees or subscription required.',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-blue-600',
    delay: 0.4,
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'Your files never leave your device - everything is processed locally.',
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-purple-600',
    delay: 0.5,
    decorativeImage: EXTERNAL_URLS.DEMO_IMAGES.FUNKY_KONG,
    decorativeImageAlt: 'Funky Kong',
  },
] as const;

const ToolsCTA = ({
  size = 'md',
  label = 'View All Tools',
}: {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) => (
  <CTAButton to="/tools" size={size} bounce blinkText>
    {label}
  </CTAButton>
);

const Home = () => {
  const isMobile = useIsMobile();
  const { currentSection, containerRef } = useFullPageScroll({
    totalSections: 3,
    enabled: !isMobile,
  });

  useEffect(() => {
    if (isMobile) return;
    const elements = [document.body, document.documentElement];
    elements.forEach((el) => el.classList.add('no-scrollbar'));
    return () => elements.forEach((el) => el.classList.remove('no-scrollbar'));
  }, [isMobile]);

  return (
    <div
      className="fullpage-container"
      ref={containerRef}
    >
      <SEO
        title="sLixTOOLS - No Ads, No Privacy Risks - Free File Conversion Tools"
        description="Convert files instantly without ads, tracking, or uploads. 150+ clients trust our browser-based tools for video, image, and document conversion. Start converting now!"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'sLixTOOLS',
          description:
            'Free online tools for file conversion: video, image, GIF, PDF, and text tools. No ads, no uploads required.',
          url: EXTERNAL_URLS.SITE,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        }}
      />

      <FullPageSectionsWrapper currentSection={currentSection} isMobile={isMobile}>
        <section className="fullpage-section">
          <div className="hero-container mb-0 flex-1 min-h-0">
            <Container>
              {/* Animated Title Section */}
              <div className="text-center mb-6">
                <AnimatedElement type="slideIn" delay={0.2} isVisible={currentSection === 0}>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-0">
                    <span className="bg-brand-text bg-clip-text text-transparent">sLixTOOLS.</span>
                  </h1>
                  <p className="text-lg md:text-xl text-gray-300 mb-2 -mt-1">
                    Free online tools for all your file conversion needs
                  </p>
                </AnimatedElement>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto items-stretch">
                {HERO_FEATURES.map((feature) => (
                  <FeatureCard key={feature.title} {...feature} isVisible={currentSection === 0} />
                ))}
              </div>

              {/* CTA Section */}
              <div className="text-center mt-4">
                <AnimatedElement type="slideUp" delay={0.6} isVisible={currentSection === 0}>
                  <ToolsCTA label="Explore Tools" />
                </AnimatedElement>
              </div>
            </Container>
          </div>

          <div className="flex-shrink-0 pb-6 flex flex-col items-center gap-2">
            <SectionSeparator isVisible={currentSection === 0} />
            <ScrollIndicator
              isVisible={currentSection === 0}
              className="relative bottom-auto left-auto translate-x-0"
            />
          </div>
        </section>

        <section className="fullpage-section">
          <Container className="flex-1 min-h-0 flex flex-col relative">
            <div className="flex-1 flex flex-col justify-center">
              <div className="hero-content flex flex-col items-center justify-center">
                {/* Text Content - Left Column */}
                <div className="flex-1 w-full max-w-4xl mx-auto text-center px-4">
                  <AnimatedElement type="slideIn" delay={0.2} isVisible={currentSection === 1}>
                    <div className="hero-text flex flex-col mt-0 gap-0">
                      {/* Problem-focused headline */}
                      <div className="flex items-center justify-center gap-4 mb-0">
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight sm:whitespace-nowrap">
                          <span className="text-white">No Ads,</span>{' '}
                          <span className="text-violet-400">No Privacy Risks</span>
                          <span className="text-pink-400">.</span>
                        </h2>
                      </div>

                      {/* Subheadline and Floating Icon */}
                      <div className="flex flex-col mb-6 -mt-2">
                        <div className="relative w-full max-w-2xl mx-auto">
                          <p className="text-base md:text-lg text-gray-300 leading-relaxed relative z-10">
                            Convert files instantly in your browser. No uploads, no tracking, no
                            hidden fees. Your files stay private and secure on your device.
                          </p>
                          {/* Decorative; hidden on small screens where they would overflow the viewport */}
                          <div className="hidden md:block absolute -top-16 -left-12 z-20" aria-hidden="true">
                            <div className="bg-violet-500 rounded-full p-3 shadow-lg floating-delayed">
                              <Sparkles className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="hidden md:block absolute top-14 -right-16 z-20" aria-hidden="true">
                            <div className="bg-sky-500 rounded-full p-3 shadow-lg floating">
                              <Scissors className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Social Proof */}
                      <SocialProof />

                      {/* CTA Button */}
                      <div className="mt-6 mb-6">
                        <ToolsCTA />
                      </div>
                    </div>
                  </AnimatedElement>
                </div>

                {/* Media Content - Right Column Removed */}
              </div>
            </div>
          </Container>

          <div className="flex-shrink-0 pb-6 flex flex-col items-center gap-2">
            <SectionSeparator isVisible={currentSection === 1} />
            <ScrollIndicator
              isVisible={currentSection === 1}
              className="relative bottom-auto left-auto translate-x-0"
            />
          </div>
        </section>

        {/* Section 3: All Tools */}
        <section className="fullpage-section-last">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedElement type="slideIn" delay={0.2} isVisible={currentSection === 2}>
              <div className="max-w-3xl mx-auto text-center mb-8">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-brand-text bg-clip-text text-transparent">
                  All Tools
                </h2>
              </div>
            </AnimatedElement>
            <AnimatedElement type="slideIn" delay={0.3} isVisible={currentSection === 2}>
              <div className="max-w-3xl mx-auto text-center mb-8">
                <ToolsDescription />
              </div>

              <div className="max-w-2xl mx-auto w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 justify-items-center">
                  {getFeaturedTools().map((tool, index) => (
                    <AnimatedElement
                      key={tool.path || tool.title}
                      type="slideIn"
                      delay={0.3 + index * 0.1}
                      isVisible={currentSection === 2}
                    >
                      <ToolListItem tool={tool} variant="simple" />
                    </AnimatedElement>
                  ))}
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement type="fadeIn" delay={0.4} isVisible={currentSection === 2}>
              <div className="flex justify-center mt-12">
                <ToolsCTA size="sm" />
              </div>
            </AnimatedElement>

            {/* Footer - only visible in section 3 */}
            <div className="mt-20">
              <SectionSeparator isVisible={currentSection === 2}>
                <div className="text-center mb-0 leading-none">
                  <CopyrightNotice className="mb-0 leading-none" />
                  <FooterLinks className="mt-1 mb-0 leading-none gap-2" linkClassName="mx-1" />
                </div>
              </SectionSeparator>
            </div>
          </div>
        </section>
      </FullPageSectionsWrapper>
    </div>
  );
};

export default Home;
