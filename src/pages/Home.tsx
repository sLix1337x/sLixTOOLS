import React from 'react';
import { Zap, Lock, CircleDollarSign } from 'lucide-react';
import AnimatedElement from '@/components/AnimatedElement';
import CTAButton from '@/components/common/CTAButton';
import ToolListItem from '@/components/common/ToolListItem';
import FeatureCard from '@/components/home/FeatureCard';
import SectionSeparator from '@/components/home/SectionSeparator';
import HomeDemoFeature from '@/components/home/HomeDemoFeature';
import SocialProof from '@/components/home/SocialProof';
import Container from '@/components/layout/Container';
import { getFeaturedTools } from '@/config/toolsData';
import { homeAnimations } from '@/styles/constants';
import { useFullPageScroll } from '@/hooks/useFullPageScroll';

import { SEO } from '@/components/SEO';
import { EXTERNAL_URLS } from '@/config/externalUrls';

const Home: React.FC = () => {
  const { currentSection, containerRef } = useFullPageScroll({ totalSections: 3 });

  return (
    <div className="fullpage-container" ref={containerRef}>
      <SEO
        title="sLixTOOLS - No Ads, No Privacy Risks - Free File Conversion Tools"
        description="Convert files instantly without ads, tracking, or uploads. 150+ clients trust our browser-based tools for video, image, and document conversion. Start converting now!"
        canonical="https://slixtools.io"
      />

      {/* Sections wrapper with transform */}
      <div
        className="sections-wrapper"
        style={{
          transform: `translateY(-${currentSection * 100}vh)`,
          transition: `transform ${homeAnimations.SCROLL_TRANSITION_DURATION} ${homeAnimations.SCROLL_TRANSITION_EASING}`
        }}
      >
        {/* Section 1: Hero + Features + First CTA */}
        <section className="fullpage-section" style={{ paddingTop: '5rem' }}>
          <div className="hero-container mb-0">
            <Container>
              {/* Animated Title Section */}
              <div className="text-center mb-6">
                <AnimatedElement type="fadeIn" delay={0.2} isVisible={currentSection === 0}>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-0">
                    <span className="bg-brand-text bg-clip-text text-transparent">
                      sLixTOOLS.
                    </span>
                  </h1>
                  <p className="text-lg md:text-xl text-gray-300 mb-2 -mt-1">
                    Free online tools for all your file conversion needs
                  </p>
                </AnimatedElement>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto items-stretch">
                <FeatureCard
                  icon={Zap}
                  title="Fast Processing"
                  description="All tools run in your browser — quick, private, local processing."
                  gradientFrom="from-green-400"
                  gradientTo="to-green-600"
                  delay={0.3}
                  isVisible={currentSection === 0}
                />

                <FeatureCard
                  icon={CircleDollarSign}
                  title="Free to Use"
                  description="All tools are completely free with no hidden fees or subscription required."
                  gradientFrom="from-blue-400"
                  gradientTo="to-blue-600"
                  delay={0.4}
                  isVisible={currentSection === 0}
                />

                <FeatureCard
                  icon={Lock}
                  title="Privacy First"
                  description="Your files never leave your device - everything is processed locally."
                  gradientFrom="from-purple-400"
                  gradientTo="to-purple-600"
                  delay={0.5}
                  isVisible={currentSection === 0}
                  decorativeImage={EXTERNAL_URLS.DEMO_IMAGES.FUNKY_KONG}
                  decorativeImageAlt="Funky Kong"
                />
              </div>

              {/* CTA Section */}
              <div className="text-center">
                <AnimatedElement type="slideUp" delay={0.6} isVisible={currentSection === 0}>
                  <CTAButton to="/tools">
                    Explore Tools
                  </CTAButton>
                </AnimatedElement>
              </div>
            </Container>
          </div>

          <SectionSeparator isVisible={currentSection === 0} />
        </section>

        {/* Section 2: Hero Content (No Ads, No Privacy Risks) */}
        <section className="fullpage-section" style={{ paddingTop: '5rem' }}>
          <Container>
            <div className="hero-content flex flex-col lg:flex-row items-center justify-between py-20">
              {/* Text Content - Left Column */}
              <div className="flex-1 lg:pr-12 text-center lg:text-left">
                <AnimatedElement type="fadeIn" delay={0.2} isVisible={currentSection === 1}>
                  <div className="hero-text flex flex-col mt-0 gap-0">
                    {/* Problem-focused headline */}
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-0">
                      <span className="text-white">No Ads,</span>{' '}
                      <span className="text-green-400">No Privacy Risks</span>
                      <span className="text-pink-400">.</span>
                    </h2>

                    {/* Subheadline */}
                    <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-6 -mt-2">
                      Convert files instantly in your browser. No uploads, no tracking, no hidden fees.
                      Your files stay private and secure on your device.
                    </p>

                    {/* Social Proof */}
                    <SocialProof />

                    {/* CTA Button */}
                    <div className="mt-1">
                      <CTAButton to="/tools">
                        View All Tools
                      </CTAButton>
                    </div>
                  </div>
                </AnimatedElement>
              </div>

              {/* Media Content - Right Column */}
              <div className="flex-1 lg:pl-12 mt-8 lg:mt-0">
                <HomeDemoFeature isVisible={currentSection === 1} />
              </div>
            </div>
          </Container>

          <SectionSeparator isVisible={currentSection === 1} />
        </section>

        {/* Section 3: All Tools */}
        <section className="fullpage-section-last">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedElement type="fadeIn" delay={0.2} isVisible={currentSection === 2}>
              <div className="max-w-3xl mx-auto text-center mb-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-brand-text bg-clip-text text-transparent">
                  All Tools
                </h1>
                <p className="text-gray-300 mb-6">
                  Explore our collection of free online tools to help with all your file conversion and optimization needs.
                  <br />
                  <span className="text-green-400">All processing happens in your browser</span> – your files never leave your computer.
                </p>
              </div>

              <div className="max-w-2xl mx-auto w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {getFeaturedTools().map((tool) => (
                    <ToolListItem
                      key={tool.path || tool.title}
                      tool={tool}
                      variant="simple"
                    />
                  ))}
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement type="fadeIn" delay={0.4} isVisible={currentSection === 2}>
              <div className="flex justify-center mt-8">
                <CTAButton to="/tools" size="md">
                  View All Tools
                </CTAButton>
              </div>
            </AnimatedElement>

            {/* Footer - only visible in section 3 */}
            <div className="mt-20">
              <SectionSeparator isVisible={currentSection === 2}>
                <div className="text-center mb-0 leading-none">
                  <p className="mb-0 leading-none">© {new Date().getFullYear()} sLixTOOLS. All rights reserved.</p>
                  <div className="mt-1 mb-0 leading-none">
                    <a href="#/privacy-policy" className="mx-2 hover:text-pink-400 transition-colors">Privacy Policy</a>
                    <span>•</span>
                    <a href="#/terms-of-service" className="mx-2 hover:text-pink-400 transition-colors">Terms of Service</a>
                    <span>•</span>
                    <a href="#/impressum" className="mx-2 hover:text-pink-400 transition-colors">Impressum</a>
                    <span>•</span>
                    <a href="#/contact" className="mx-2 hover:text-pink-400 transition-colors">Contact</a>
                    <span>•</span>
                    <a href="https://github.com/sLix1337x/sLixTOOLS" target="_blank" rel="noopener noreferrer" className="mx-2 hover:text-pink-400 transition-colors">GitHub</a>
                  </div>
                </div>
              </SectionSeparator>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
