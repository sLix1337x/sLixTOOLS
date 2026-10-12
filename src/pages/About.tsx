import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { BookOpen, Cpu, Heart, Check } from 'lucide-react';
import AnimatedElement from '@/components/AnimatedElement';
import Container from '@/components/layout/Container';

const About = () => {
  return (
    <div className="text-white relative min-h-0">
      <SEO
        title="About"
        description="Learn about sLixTOOLS: free, privacy-focused file tools for video, images, PDFs and text that run entirely in your browser."
        keywords="about sLixTOOLS, privacy-focused GIF maker, free video to GIF converter, sLix1337"
      />

      <Container className="py-8 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedElement type="fadeIn" delay={0.1}>
            <p className="text-xs font-medium uppercase tracking-widest text-sky-400/80 mb-3">
              About
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
              Simple, private tools that run in your browser
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.2}>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Our mission is to provide simple, effective, and privacy-focused tools for everyone.
            </p>
          </AnimatedElement>
        </div>

        <div className="max-w-3xl mx-auto space-y-5">
          <AnimatedElement type="fadeIn" delay={0.3}>
            <div className="p-6 rounded-xl border border-slate-400/10 bg-white/[0.03]">
              <h2 className="text-xl font-semibold mb-3 text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-400/10 text-sky-300">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                </span>
                Our Story
              </h2>
              <p className="text-slate-300 leading-relaxed">
                sLixTOOLS was created in 2025 by sLix1337 as a simple, effective solution for converting videos to GIFs without requiring any upload to external servers. We believe that creating GIFs should be easy, fast, and not compromise your privacy.
              </p>
            </div>
          </AnimatedElement>

          <AnimatedElement type="fadeIn" delay={0.35}>
            <div className="p-6 rounded-xl border border-slate-400/10 bg-white/[0.03]">
              <h2 className="text-xl font-semibold mb-3 text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-400/10 text-sky-300">
                  <Cpu className="h-4 w-4" aria-hidden="true" />
                </span>
                How It Works
              </h2>
              <p className="text-slate-300 leading-relaxed">
                sLixTOOLS uses modern web technologies to process your files directly in your browser. Your files never leave your device, ensuring complete privacy and security. The application uses HTML5 Canvas and JavaScript to extract frames from your video and then compile them into a GIF format that you can download instantly.
              </p>
            </div>
          </AnimatedElement>

          <AnimatedElement type="fadeIn" delay={0.4}>
            <div className="p-6 rounded-xl border border-slate-400/10 bg-white/[0.03]">
              <h2 className="text-xl font-semibold mb-3 text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-400/10 text-sky-300">
                  <Heart className="h-4 w-4" aria-hidden="true" />
                </span>
                Our Values
              </h2>
              <ul className="space-y-2.5 text-slate-300">
                <li className="flex gap-2.5"><Check className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" /><span><span className="font-semibold text-white">Privacy-first:</span> Your files never leave your device.</span></li>
                <li className="flex gap-2.5"><Check className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" /><span><span className="font-semibold text-white">Simplicity:</span> Easy to use with no technical knowledge required.</span></li>
                <li className="flex gap-2.5"><Check className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" /><span><span className="font-semibold text-white">Free forever:</span> No hidden costs, subscriptions, or annoying ads.</span></li>
                <li className="flex gap-2.5"><Check className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" /><span><span className="font-semibold text-white">Quality:</span> Produce high-quality GIFs with customizable settings.</span></li>
              </ul>
            </div>
          </AnimatedElement>

          <AnimatedElement type="fadeIn" delay={0.45}>
            <div className="mt-10 text-center">
              <p className="text-slate-400">
                Have questions or suggestions? We'd love to hear from you! Visit our <Link to="/contact" className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors">Contact page</Link> or check out our <Link to="/features" className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors">Features</Link> to learn more about what sLixTOOLS can do.
              </p>
            </div>
          </AnimatedElement>
        </div>
      </Container>
    </div>
  );
};

export default About;
