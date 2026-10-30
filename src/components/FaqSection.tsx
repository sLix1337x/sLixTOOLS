import { Helmet } from 'react-helmet-async';
import { ChevronDown, HelpCircle, MessageCircleQuestion } from 'lucide-react';
import AnimatedElement from '@/components/AnimatedElement';
import Divider from '@/components/ui/divider';

export interface FaqItem {
  question: string;
  answer: string;
}

const FaqSection = ({ items }: { items: FaqItem[] }) => (
  <section className="mt-16 max-w-2xl mx-auto w-full" aria-label="Frequently asked questions">
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        })}
      </script>
    </Helmet>
    <AnimatedElement type="fadeIn" delay={0.1}>
      <Divider className="mb-8" />
      <h2 className="text-xl font-semibold text-white mb-4 text-center flex items-center justify-center gap-2">
        <MessageCircleQuestion className="h-5 w-5 text-sky-400" aria-hidden="true" />
        Frequently asked questions
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <details key={item.question} className="faq-item">
            <summary>
              <span className="flex items-center gap-2.5 min-w-0">
                <HelpCircle className="h-4 w-4 flex-shrink-0 text-sky-400/80" aria-hidden="true" />
                <span>{item.question}</span>
              </span>
              <ChevronDown className="faq-chevron h-4 w-4" aria-hidden="true" />
            </summary>
            <p className="faq-answer">{item.answer}</p>
          </details>
        ))}
      </div>
    </AnimatedElement>
  </section>
);

export default FaqSection;
