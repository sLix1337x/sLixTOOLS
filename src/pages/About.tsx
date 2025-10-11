import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ParticleBackground from '@/components/ParticleBackground';
import AnimatedElement from '@/components/AnimatedElement';

const About = () => {
  return (
    <div className="text-white relative min-h-0">
      <ParticleBackground />
      <Helmet>
        <title>About | sLixTOOLS</title>
        <meta name="description" content="Learn about sLixTOOLS, a free, privacy-focused online tool for converting videos to GIFs directly in your browser." />
        <meta name="keywords" content="about sLixTOOLS, privacy-focused GIF maker, free video to GIF converter, sLix1337" />
        <link rel="canonical" href="https://slixtools.io/about" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.2}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              About sLixTOOLS
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.4}>
            <p className="text-gray-300 mb-6">
              Our mission is to provide simple, effective, and privacy-focused tools for everyone.
            </p>
          </AnimatedElement>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
              <AnimatedElement type="fadeIn" delay={0.6}>
                <div className="p-6 rounded-lg border border-gray-700/50 bg-gray-900/20">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-100">Our Story</h2>
                  <p className="text-gray-300">
                    sLixTOOLS was created in 2025 by sLix1337 as a simple, effective solution for converting videos to GIFs without requiring any upload to external servers. We believe that creating GIFs should be easy, fast, and not compromise your privacy.
                  </p>
                </div>
              </AnimatedElement>

              <AnimatedElement type="fadeIn" delay={0.7}>
                <div className="p-6 rounded-lg border border-gray-700/50 bg-gray-900/20">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-100">How It Works</h2>
                  <p className="text-gray-300">
                    sLixTOOLS uses modern web technologies to process your files directly in your browser. Your files never leave your device, ensuring complete privacy and security. The application uses HTML5 Canvas and JavaScript to extract frames from your video and then compile them into a GIF format that you can download instantly.
                  </p>
                </div>
              </AnimatedElement>

              <AnimatedElement type="fadeIn" delay={0.8}>
                <div className="p-6 rounded-lg border border-gray-700/50 bg-gray-900/20">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-100">Our Values</h2>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><span className="font-semibold text-green-400">Privacy-first:</span> Your files never leave your device.</li>
                    <li><span className="font-semibold text-green-400">Simplicity:</span> Easy to use with no technical knowledge required.</li>
                    <li><span className="font-semibold text-green-400">Free forever:</span> No hidden costs, subscriptions, or annoying ads.</li>
                    <li><span className="font-semibold text-green-400">Quality:</span> Produce high-quality GIFs with customizable settings.</li>
                  </ul>
                </div>
              </AnimatedElement>

              <AnimatedElement type="fadeIn" delay={0.9}>
                <div className="mt-12 text-center">
                  <p className="text-gray-400">
                    Have questions or suggestions? We'd love to hear from you! Visit our <Link to="/contact" className="text-green-400 hover:underline">Contact page</Link> or check out our <Link to="/features" className="text-green-400 hover:underline">Features</Link> to learn more about what sLixTOOLS can do.
                  </p>
                </div>
              </AnimatedElement>
            </div>
          </div>
        </div>
  );
};

export default About;
