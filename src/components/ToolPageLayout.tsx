import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useNavigationType } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, CloudOff, Infinity as InfinityIcon, ChevronRight, ChevronDown, MessageCircleQuestion, HelpCircle } from 'lucide-react';
import AnimatedElement from '@/components/AnimatedElement';
import ToolSwitcher from '@/components/tools/ToolSwitcher';
import Divider from '@/components/ui/divider';
import FooterLinks, { CopyrightNotice } from '@/components/common/FooterLinks';
import { canonicalFor } from '@/config/externalUrls';

interface FaqItem {
  question: string;
  answer: string;
}

interface ToolPageLayoutProps {
  title: string;
  description: string;
  keywords: string;
  /** App route of the page, e.g. "/tools/video-to-gif" (absolute URLs pass through) */
  canonicalUrl: string;
  pageTitle: string;
  pageDescription: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  headerGradient?: string;
  /** Short name used in the breadcrumb (defaults to title) */
  breadcrumbLabel?: string;
  /** Optional FAQ entries rendered as an accordion with FAQPage structured data */
  faq?: FaqItem[];
}

const TRUST_BADGES = [
  { icon: ShieldCheck, label: '100% client-side' },
  { icon: CloudOff, label: 'No uploads' },
  { icon: InfinityIcon, label: 'Free & unlimited' },
] as const;

const FaqSection = ({ items }: { items: FaqItem[] }) => (
  <section className="mt-16 max-w-2xl mx-auto w-full" aria-label="Frequently asked questions">
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

/**
 * Shared layout component for tool pages providing consistent structure:
 * breadcrumb, trust badges, SEO meta tags (incl. optional FAQ structured
 * data), animated header, content area, and a quiet footer.
 */
const ToolPageLayout = ({
  title,
  description,
  keywords,
  canonicalUrl,
  pageTitle,
  pageDescription,
  children,
  maxWidth = '4xl',
  headerGradient = 'from-sky-200 via-indigo-200 to-sky-100',
  breadcrumbLabel,
  faq
}: ToolPageLayoutProps) => {
  const maxWidthClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl'
  }[maxWidth];

  const contentRef = useRef<HTMLDivElement>(null);
  const navigationType = useNavigationType();

  // Defined start point: on in-site tool navigation the page opens AT the tool
  // content instead of animating a scroll. The layout effect sets the position
  // before the first paint; the passive effect re-asserts it after ScrollToTop's
  // reset-to-0 (same flush, so no intermediate frame). Fresh loads (POP) keep the
  // normal top-of-page start.
  useLayoutEffect(() => {
    if (navigationType === 'PUSH') {
      contentRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [navigationType]);

  useEffect(() => {
    if (navigationType === 'PUSH') {
      contentRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [navigationType]);

  const faqStructuredData = faq
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }
    : undefined;

  return (
    <div className="text-white relative min-h-0">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={canonicalFor(canonicalUrl)} />
        {faqStructuredData && (
          <script type="application/ld+json">{JSON.stringify(faqStructuredData)}</script>
        )}
      </Helmet>

      <div className="container mx-auto px-4 pt-0 pb-8 flex flex-col min-h-0">
        {/* Tool switcher carousel */}
        <ToolSwitcher />

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="max-w-3xl mx-auto w-full mt-2">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            <li>
              <Link to="/" className="hover:text-slate-300 transition-colors">
                Home
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <li>
              <Link to="/tools" className="hover:text-slate-300 transition-colors">
                Tools
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <li className="text-slate-400" aria-current="page">
              {breadcrumbLabel ?? title}
            </li>
          </ol>
        </nav>

        {/* Separator below breadcrumb */}
        <div
          role="separator"
          aria-hidden="true"
          className="max-w-3xl mx-auto w-full mt-2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mt-3">
          <AnimatedElement type="fadeIn" delay={0.1}>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-slate-400"
                >
                  <Icon className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </AnimatedElement>
          <AnimatedElement type="fadeIn" delay={0.15}>
            <h1
              className={`text-3xl md:text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r ${headerGradient} bg-clip-text text-transparent`}
            >
              {pageTitle}
            </h1>
          </AnimatedElement>
          <AnimatedElement type="slideUp" delay={0.25}>
            <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {pageDescription}
            </p>
          </AnimatedElement>
        </div>

        {/* Content Area */}
        <div ref={contentRef} className={`${maxWidthClass} mx-auto w-full scroll-mt-6`}>
          <Divider className="my-7" />
          {children}
        </div>

        {/* FAQ */}
        {faq && faq.length > 0 && <FaqSection items={faq} />}

        {/* Footer */}
        <div className="mt-16 text-center">
          <Divider className="mb-6" />
          <CopyrightNotice className="text-sm" />
          <FooterLinks className="mt-2" linkClassName="mx-2" />
        </div>
      </div>
    </div>
  );
};

export default ToolPageLayout;
