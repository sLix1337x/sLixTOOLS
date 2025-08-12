import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileVideo, FileImage, FileText, Music, Scissors, Zap, Lock, CircleDollarSign, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedElement from '@/components/AnimatedElement';
import ParticleBackground from '@/components/ParticleBackground';
import { Helmet } from 'react-helmet-async';

interface ToolItemProps {
  title: string;
  icon: React.ReactNode;
  path?: string;
  comingSoon?: boolean;
}

const ToolItem: React.FC<ToolItemProps> = ({ title, icon, path, comingSoon }) => {
  const content = (
    <div className={`py-0.5 text-base group ${comingSoon ? 'opacity-60' : 'hover:text-[#42C574]'}`}>
      <div className="flex items-center space-x-2">
        <div className={`flex-shrink-0 ${comingSoon ? 'text-gray-400' : 'text-gray-400 group-hover:text-[#42C574]'}`}>
          {icon}
        </div>
        <span className={`${comingSoon ? 'text-gray-400' : 'text-gray-300 group-hover:text-[#42C574]'} transition-colors duration-200`}>
          {title}
        </span>
        {comingSoon && (
          <span className="text-xs text-gray-500 ml-auto">
            Coming Soon
          </span>
        )}
      </div>
    </div>
  );

  if (comingSoon || !path) {
    return content;
  }

  return (
    <Link to={path} className="block">
      {content}
    </Link>
  );
};

const Home: React.FC = () => {
  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>sLixTOOLS - No Ads, No Privacy Risks - Free File Conversion Tools</title>
        <meta name="description" content="Convert files instantly without ads, tracking, or uploads. 150+ clients trust our browser-based tools for video, image, and document conversion. Start converting now!" />
        <link rel="canonical" href="https://slixtools.io" />
      </Helmet>
      
      {/* Hero Section */}
      <div className="hero-container mb-2">
        <div className="container mx-auto px-4">
          {/* Animated Title Section */}
          <div className="text-center mb-16">
            <AnimatedElement type="fadeIn" delay={0.2}>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-0">
                 <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                   sLixTOOLS.
                 </span>
               </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-2 -mt-2">
                Free online tools for all your file conversion needs
              </p>
            </AnimatedElement>
          </div>

          {/* Features Grid */}
           <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto items-stretch">
             <AnimatedElement type="slideUp" delay={0.3}>
               <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 group h-full min-h-[200px] flex flex-col">
                 <div className="text-center flex-1 flex flex-col justify-center">
                   <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                     <Zap className="w-6 h-6 text-white" />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-0 h-8 text-center leading-8 -mt-2">Fast Processing</h3>
                   <p className="text-gray-300 text-sm leading-relaxed mt-1">
                      All tools run in your browser — quick, private, local processing.
                    </p>
                 </div>
               </div>
             </AnimatedElement>
             
             <AnimatedElement type="slideUp" delay={0.4}>
               <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 group h-full min-h-[200px] flex flex-col">
                 <div className="text-center flex-1 flex flex-col justify-center">
                   <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                     <CircleDollarSign className="w-6 h-6 text-white" />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-0 h-8 text-center leading-8 -mt-1">Free to Use</h3>
                   <p className="text-gray-300 text-sm leading-relaxed mt-1">
                      All tools are completely free with no hidden fees or subscription required.
                    </p>
                 </div>
               </div>
             </AnimatedElement>
             
             <AnimatedElement type="slideUp" delay={0.5}>
               <div className="relative h-full min-h-[200px] flex flex-col">
                 <img 
                   src="https://i.ibb.co/MkhkkNG6/funkykong.gif" 
                   alt="Funky Kong" 
                   className="absolute -top-16 -right-8 w-32 h-32 z-10"
                 />
                 <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 group flex-1 flex flex-col">
                   <div className="text-center flex-1 flex flex-col justify-center">
                     <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                       <Lock className="w-6 h-6 text-white" />
                     </div>
                     <h3 className="text-lg font-bold text-white mb-0 h-8 text-center leading-8 -mt-1">Privacy First</h3>
                     <p className="text-gray-300 text-sm leading-relaxed mt-1">
                        Your files never leave your device - everything is processed locally.
                      </p>
                   </div>
                 </div>
               </div>
             </AnimatedElement>
           </div>

          {/* CTA Section */}
          <div className="text-center">
            <AnimatedElement type="slideUp" delay={0.6}>
              <Link 
                to="/tools" 
                className="bg-[#2AD587] text-black font-bold rainbow-hover inline-flex items-center gap-3 px-8 py-4 text-lg rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Explore Tools
                <ArrowRight className="w-5 h-5" />
              </Link>
            </AnimatedElement>
          </div>

          <div className="hero-content flex flex-col lg:flex-row items-center justify-between mt-16">
            {/* Text Content - Left Column */}
            <div className="flex-1 lg:pr-12 text-center lg:text-left">
              <AnimatedElement type="fadeIn" delay={0.7}>
                <div className="hero-text flex flex-col">
                  {/* Problem-focused headline */}
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                    <span className="text-white">No Ads,</span>{' '}
                    <span className="text-green-400">No Privacy Risks</span>
                    <span className="text-pink-400">.</span>
                  </h2>
                  
                  {/* Subheadline */}
                  <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                    Convert files instantly in your browser. No uploads, no tracking, no hidden fees. 
                    Your files stay private and secure on your device.
                  </p>
                  
                  {/* Social Proof */}
                  <div className="social-proof flex flex-col sm:flex-row items-center justify-center lg:justify-start">
                    <div className="flex items-center gap-2 text-green-400 font-semibold">
                      <Zap className="h-5 w-5" />
                      <span>150+ Clients Helped</span>
                    </div>
                    <div className="hidden sm:block w-px h-4 bg-gray-600 mx-4"></div>
                    <div className="flex items-center gap-2 text-blue-400 font-semibold">
                      <Lock className="h-5 w-5" />
                      <span>100% Private Processing</span>
                    </div>
                  </div>
                  
                  {/* CTA Button */}
                   <div className="mt-8">
                     <Link 
                       to="/tools" 
                       className="bg-[#2AD587] text-black font-bold rainbow-hover inline-flex items-center gap-3 px-8 py-4 text-lg rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                     >
                       View All Tools
                       <ArrowRight className="w-5 h-5" />
                     </Link>
                   </div>
                </div>
              </AnimatedElement>
            </div>
            
            {/* Media Content - Right Column */}
            <div className="flex-1 lg:pl-12 mt-8 lg:mt-0">
              <AnimatedElement type="scale" delay={0.3}>
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
                  <div className="absolute -bottom-2 -left-2 bg-blue-500 rounded-full p-3 shadow-lg floating" style={{animationDelay: '1s'}}>
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                </div>
              </AnimatedElement>
            </div>
          </div>
        </div>
      </div>
       

    {/* All Tools Section - Moved out of main container */}
    <section className="pb-16">
      <div className="container mx-auto px-4">
        <AnimatedElement type="fadeIn" delay={0.6}>
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
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
              <ToolItem 
                title="MP4 to GIF"
                icon={<FileVideo />}
                path="/tools/video-to-gif"
              />
              
              <ToolItem 
                title="Image Resizer"
                icon={<FileImage />}
                path="/tools/image-resizer"
              />
              
              <ToolItem 
                title="Image Compressor"
                icon={<FileImage />}
                path="/tools/image-compressor"
              />
              
              <ToolItem 
                title="GIF Compressor"
                icon={<FileVideo />}
                path="/tools/gif-compressor"
              />
              
              <ToolItem 
                title="PDF Compressor"
                icon={<FileText />}
                path="/tools/pdf-compressor"
              />
              
              <ToolItem 
                title="Audio Converter"
                icon={<Music />}
                comingSoon={true}
              />
              
              <ToolItem 
                title="Video Converter"
                icon={<FileVideo />}
                path="/tools/video-converter"
                comingSoon={false}
              />
              
              <ToolItem 
                title="Image Converter"
                icon={<FileImage />}
                path="/tools/image-converter"
                comingSoon={false}
              />
            </div>
          </div>
        </AnimatedElement>
        
        <AnimatedElement type="fadeIn" delay={0.8}>
          <Link to="/tools" className="block mt-8">
            <button 
              className="bg-[#2AD587] text-black font-bold rainbow-hover mx-auto flex items-center justify-center px-6 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              style={{
                border: 'none',
                WebkitAppearance: 'none',
                WebkitTapHighlightColor: 'transparent',
                minWidth: '200px'
              }}
            >
              <span className="relative z-10">View All Tools</span>
              <ArrowRight className="ml-2 h-4 w-4 relative z-10" />
            </button>
          </Link>
        </AnimatedElement>
      </div>
    </section>
    </div>
  );
};

export default Home;
