import { useEffect } from 'react';
import AnimatedElement from "@/components/AnimatedElement";
import CTAButton from "@/components/common/CTAButton";
import ToolListItem from "@/components/common/ToolListItem";
import ScrollIndicator from "@/components/common/ScrollIndicator";
import ToolsDescription from "@/components/common/ToolsDescription";
import FullPageSectionsWrapper from "@/components/layout/FullPageSectionsWrapper";
import { getAvailableTools, getComingSoonTools } from '@/config/toolsData';
import { useFullPageScroll } from '@/hooks/useFullPageScroll';
import SectionSeparator from '@/components/home/SectionSeparator';
import FooterLinks from '@/components/common/FooterLinks';
import { useIsMobile } from '@/hooks';
import { SEO } from '@/components/SEO';
import { cn } from '@/lib/utils';
import ParticleBackground from '@/components/ParticleBackground';

const Tools = () => {
  const isMobile = useIsMobile();
  const { currentSection, containerRef } = useFullPageScroll({
    totalSections: 2,
    enabled: !isMobile
  });

  useEffect(() => {
    if (isMobile) return;
    const elements = [document.body, document.documentElement];
    elements.forEach(el => el.classList.add('no-scrollbar'));
    return () => elements.forEach(el => el.classList.remove('no-scrollbar'));
  }, [isMobile]);

  return (
    <div className={cn("fullpage-container no-scrollbar", isMobile && 'h-auto overflow-auto')} ref={containerRef}>
      <ParticleBackground />
      <SEO
        title="All Tools"
        description="Explore all the free online tools available at sLixTOOLS for your file conversion needs."
        canonical="https://slixtools.io/tools"
      />

      <FullPageSectionsWrapper currentSection={currentSection} isMobile={isMobile}>
        <section className="fullpage-section pt-0">
          <div className="w-full h-full flex flex-col justify-start max-w-7xl mx-auto pb-2">
            <div className="text-center mb-2 shrink-0">
              <AnimatedElement type="fadeIn" delay={0.2} isVisible={currentSection === 0}>
                <h1 className="text-2xl md:text-4xl font-black mb-1 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  All Tools
                </h1>
              </AnimatedElement>
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar">
              <AnimatedElement type="fadeIn" delay={0.4} isVisible={currentSection === 0}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-3 p-2">
                  {getAvailableTools().map((tool) => (
                    <ToolListItem
                      key={tool.path || tool.title}
                      tool={tool}
                      variant="card"
                      showTooltip={true}
                    />
                  ))}
                </div>
              </AnimatedElement>
            </div>

            <ScrollIndicator isVisible={currentSection === 0} />
          </div>
        </section>

        <section className="fullpage-section pt-0">
          <div className="w-full h-full flex flex-col justify-center max-w-4xl mx-auto px-6 py-4 overflow-y-auto no-scrollbar">
            <AnimatedElement type="fadeIn" delay={0.2} isVisible={currentSection === 1}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-blue-400 mb-4 text-center">
                  ⏳ Coming Soon
                </h2>
                <div className="flex flex-wrap justify-center gap-4">
                  {getComingSoonTools().map((tool) => (
                    <div key={tool.path || tool.title} className="w-full max-w-[220px]">
                      <ToolListItem
                        tool={tool}
                        variant="card"
                        showTooltip={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedElement>

            <div className="text-center mb-6">
              <AnimatedElement type="slideUp" delay={0.4} isVisible={currentSection === 1}>
                <ToolsDescription />
              </AnimatedElement>

              <AnimatedElement type="fadeIn" delay={0.6} isVisible={currentSection === 1} className="w-full text-center">
                <div className="flex justify-center">
                  <CTAButton to="/" size="sm" variant="secondary">
                    Back to Home
                  </CTAButton>
                </div>
              </AnimatedElement>
            </div>

            <div className="mt-4">
              <SectionSeparator isVisible={currentSection === 1}>
                <FooterLinks
                  showCopyright
                  className="text-sm"
                  copyrightClassName="mb-1 leading-none"
                  linkClassName="text-xs"
                />
              </SectionSeparator>
            </div>
          </div>
        </section>
      </FullPageSectionsWrapper>
    </div>
  );
};

export default Tools;
