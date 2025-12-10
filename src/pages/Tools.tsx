import React from 'react';
import { Helmet } from 'react-helmet-async';
import AnimatedElement from "@/components/AnimatedElement";
import CTAButton from "@/components/common/CTAButton";
import ToolListItem from "@/components/common/ToolListItem";
import { getAvailableTools, getComingSoonTools } from '@/config/toolsData';

const Tools: React.FC = React.memo(() => {

  return (
    <div className="text-white relative min-h-0">
      <Helmet>
        <title>All Tools - sLixTOOLS</title>
        <meta name="description" content="Explore all the free online tools available at sLixTOOLS for your file conversion needs." />
        <link rel="canonical" href="https://slixtools.io/tools" />
      </Helmet>
      <div className="container mx-auto px-6 pt-8 pb-12 flex flex-col min-h-0">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">All Tools</h1>
          </AnimatedElement>
        </div>


        <div className="w-[98%] mx-auto mb-16">
          <AnimatedElement type="fadeIn" delay={0.4}>
            {/* Available Tools Section */}
            <div className="mb-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {getAvailableTools().map((tool) => (
                  <ToolListItem
                    key={tool.path || tool.title}
                    tool={tool}
                    variant="card"
                    showTooltip={true}
                  />
                ))}
              </div>
            </div>

            {/* Coming Soon Section */}
            <div>
              <h2 className="text-3xl font-bold text-blue-400 mb-8 text-center">
                ⏳ Coming Soon
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {getComingSoonTools().map((tool) => (
                  <ToolListItem
                    key={tool.title}
                    tool={tool}
                    variant="card"
                    showTooltip={true}
                  />
                ))}
              </div>
            </div>
          </AnimatedElement>
        </div>

        <div className="max-w-4xl mx-auto text-center mb-16">
          <AnimatedElement type="slideUp" delay={0.6}>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Explore our collection of free online tools to help with all your file conversion and optimization needs.
              <br />
              <span className="text-green-400">All processing happens in your browser</span> – your files never leave your computer.
            </p>
          </AnimatedElement>

          <AnimatedElement type="fadeIn" delay={0.8} className="w-full text-center">
            <div className="flex justify-center">
              <CTAButton to="/" size="md" variant="secondary">
                Back to Home
              </CTAButton>
            </div>
          </AnimatedElement>
        </div>
      </div>
    </div >
  );
});

Tools.displayName = 'Tools';

export default Tools;
