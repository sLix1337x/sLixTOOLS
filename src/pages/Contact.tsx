import { Helmet } from 'react-helmet-async';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';
import { ExternalLink } from 'lucide-react';
import Container from '@/components/layout/Container';

const Contact = () => {
  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>Support Us | sLixTOOLS</title>
        <meta name="description" content="Support our work and get in touch with us. We appreciate your feedback and questions." />
        <link rel="canonical" href="https://slixtools.io/contact" />
      </Helmet>

      <Container className="py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Support My Work
            </h1>
            <p className="text-gray-300 mb-6">
              Enjoying my free tools? Help me keep them running by buying me a coffee!
            </p>
            <div className="flex justify-center mb-8">
              <a
                href="https://ko-fi.com/slix1337"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:opacity-90 transition-opacity transform hover:scale-105"
              >
                <img
                  src="/sLixTOOLS/images/kofi.png"
                  alt="Buy Me a Coffee at ko-fi.com"
                  className="h-20 w-auto filter brightness-0 invert"
                />
              </a>
            </div>
          </AnimatedElement>

          <AnimatedElement type="fadeIn" delay={0.4}>
            <div className="text-center text-gray-300">
              <h3 className="text-xl font-semibold text-gray-100 mb-2">Other Ways to Reach Me</h3>
              <div className="flex justify-center items-center space-x-3">
                <a href="https://steamcommunity.com/id/sLix7" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 hover:text-green-400 transition-colors">
                  <ExternalLink className="h-5 w-5" />
                  <span>steamcommunity.com/id/sLix7</span>
                </a>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </Container>
    </div>
  );
};

export default Contact;
