import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Zap, Lock, CircleDollarSign, Shield, Sparkles, FileVideo, FileImage } from 'lucide-react';
import AnimatedElement from '@/components/AnimatedElement';
import CTAButton from '@/components/common/CTAButton';
import ToolListItem from '@/components/common/ToolListItem';
import FeatureCard from '@/components/home/FeatureCard';
import Container from '@/components/layout/Container';
import { getFeaturedTools } from '@/config/toolsData';

import { SEO } from '@/components/SEO';
import { EXTERNAL_URLS } from '@/config/externalUrls';

const Home: React.FC = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const isScrolling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Setup native wheel event listener with {passive: false}
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent scrolling if already transitioning
      if (isScrolling.current) {
        e.preventDefault();
        return;
      }

      e.preventDefault();

      if (e.deltaY > 0 && currentSection < 2) {
        // Scroll down
        isScrolling.current = true;
        setCurrentSection(currentSection + 1);
        window.dispatchEvent(new CustomEvent('header-animation-trigger', { detail: 'reset' }));

        // Reset after animation completes
        setTimeout(() => {
          isScrolling.current = false;
        }, 1600); // Slightly longer than 1.5s animation

      } else if (e.deltaY < 0 && currentSection > 0) {
        // Scroll up
        isScrolling.current = true;
        setCurrentSection(currentSection - 1);
        window.dispatchEvent(new CustomEvent('header-animation-trigger', { detail: 'reset' }));

        // Reset after animation completes
        setTimeout(() => {
          isScrolling.current = false;
        }, 1600);
      }
    };

    // Add event listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [currentSection]); // Re-attach when currentSection changes

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
          transition: 'transform 1.5s cubic-bezier(0.65, 0, 0.35, 1)'
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

          {/* Animated bottom separator & Copyright */}
          <div className="w-full flex flex-col items-center mt-0">
            <div
              className="border-b border-dashed border-green-400 h-px"
              style={{
                width: '100%',
                clipPath: (currentSection === 0 && mounted) ? 'inset(0 0 0 0)' : 'inset(0 50% 0 50%)',
                maxWidth: '42rem', // max-w-2xl equivalent
                transitionProperty: 'clip-path',
                transitionDuration: currentSection === 0 ? '1.5s' : '0.4s',
                transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
                transitionDelay: currentSection === 0 ? '0.4s' : '0s'
              }}
            />
            <p
              className="text-xs mt-2 leading-none"
              style={{
                opacity: (currentSection === 0 && mounted) ? 1 : 0,
                transition: `opacity ${currentSection === 0 ? '1.5s' : '0.4s'} cubic-bezier(0.65, 0, 0.35, 1)`,
                transitionDelay: currentSection === 0 ? '0.7s' : '0s'
              }}
            >
              © {new Date().getFullYear()} sLixTOOLS. All rights reserved.
            </p>
          </div>
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
                    <div className="social-proof flex flex-col sm:flex-row items-center justify-center lg:justify-start">
                      <div className="flex items-center gap-2 text-green-400 font-semibold">
                        <Zap className="h-5 w-5" />
                        <span>150+ BPM</span>
                      </div>
                      <div className="hidden sm:block w-px h-4 bg-gray-600 mx-4"></div>
                      <div className="flex items-center gap-2 text-blue-400 font-semibold">
                        <Lock className="h-5 w-5" />
                        <span>100% Private Processing</span>
                      </div>
                    </div>

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
                <AnimatedElement type="scale" delay={0.3} isVisible={currentSection === 1}>
                  <div className="relative">
                    {/* Main demo image/video placeholder */}
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-green-400/20 shadow-2xl">
                      <div className="text-center">
                        <div className="mb-6">
                          <FileVideo className="h-16 w-16 mx-auto text-green-400 mb-4" />
                          <h3 className="text-xl font-bold text-white mb-2">Instant File Conversion</h3>
                          <p className="text-gray-300 text-sm">Drag, drop, convert. It's that simple.</p>
                        </div>

                        {/* Feature highlights */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-green-400">
                            <Zap className="h-4 w-4" />
                            <span>Lightning Fast</span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-400">
                            <Shield className="h-4 w-4" />
                            <span>Secure</span>
                          </div>
                          <div className="flex items-center gap-2 text-purple-400">
                            <FileImage className="h-4 w-4" />
                            <span>Multiple Formats</span>
                          </div>
                          <div className="flex items-center gap-2 text-pink-400">
                            <CircleDollarSign className="h-4 w-4" />
                            <span>Always Free</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating elements for visual interest */}
                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-3 shadow-lg floating">
                      <Scissors className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -left-2 bg-blue-500 rounded-full p-3 shadow-lg floating-delayed">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </AnimatedElement>
              </div>
            </div>
          </Container>

          {/* Animated bottom separator & Copyright */}
          <div className="w-full flex flex-col items-center mt-0">
            <div
              className="border-b border-dashed border-green-400 h-px"
              style={{
                width: '100%',
                clipPath: (currentSection === 1 && mounted) ? 'inset(0 0 0 0)' : 'inset(0 50% 0 50%)',
                maxWidth: '42rem', // max-w-2xl equivalent
                transitionProperty: 'clip-path',
                transitionDuration: currentSection === 1 ? '1.5s' : '0.4s',
                transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
                transitionDelay: currentSection === 1 ? '0.4s' : '0s'
              }}
            />
            <p
              className="text-xs mt-2 leading-none"
              style={{
                opacity: (currentSection === 1 && mounted) ? 1 : 0,
                transition: `opacity ${currentSection === 1 ? '1.5s' : '0.4s'} cubic-bezier(0.65, 0, 0.35, 1)`,
                transitionDelay: currentSection === 1 ? '0.7s' : '0s'
              }}
            >
              © {new Date().getFullYear()} sLixTOOLS. All rights reserved.
            </p>
          </div>
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
            <div className="w-full flex flex-col items-center mt-20">
              <div
                className="border-b border-dashed border-green-400 h-px"
                style={{
                  width: '100%',
                  clipPath: (currentSection === 2 && mounted) ? 'inset(0 0 0 0)' : 'inset(0 50% 0 50%)',
                  maxWidth: '42rem', // max-w-2xl equivalent
                  transitionProperty: 'clip-path',
                  transitionDuration: currentSection === 2 ? '1.5s' : '0.4s',
                  transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
                  transitionDelay: currentSection === 2 ? '0.4s' : '0s'
                }}
              />
              <div
                className="text-xs px-4 leading-none pt-4 pb-0"
                style={{
                  opacity: (currentSection === 2 && mounted) ? 1 : 0,
                  transition: `opacity ${currentSection === 2 ? '1.5s' : '0.4s'} cubic-bezier(0.65, 0, 0.35, 1)`,
                  transitionDelay: currentSection === 2 ? '0.7s' : '0s'
                }}
              >
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
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
