import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { ShieldCheck, CloudOff, Infinity as InfinityIcon, ChevronRight } from 'lucide-react';
import AnimatedElement from '@/components/AnimatedElement';
import FaqSection, { type FaqItem } from '@/components/FaqSection';
import ToolBar from '@/components/tools/ToolBar';
import ToolSwitcher from '@/components/tools/ToolSwitcher';
import Divider from '@/components/ui/divider';
import FooterLinks, { CopyrightNotice } from '@/components/common/FooterLinks';
import { getToolByPath } from '@/config/toolsData';

interface ToolPageLayoutProps {
  title: string;
  description: string;
  keywords: string;
  /** @deprecated Ignored — the canonical URL is derived from the current route (see SEO) */
  canonicalUrl?: string;
  pageTitle: string;
  pageDescription: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  /** Short name used in the breadcrumb (defaults to title) */
  breadcrumbLabel?: string;
  /** Optional FAQ entries rendered as an accordion with FAQPage structured data */
  faq?: FaqItem[];
  /** Explanatory content below the tool; full-width tools only, others keep it in children */
  belowTool?: React.ReactNode;
}

const TRUST_BADGES = [
  { icon: ShieldCheck, label: '100% client-side' },
  { icon: CloudOff, label: 'No uploads' },
  { icon: InfinityIcon, label: 'Free & unlimited' },
] as const;

const TrustBadges = () => (
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
);

const PageFooter = () => (
  <div className="mt-16 text-center">
    <Divider className="mb-6" />
    <CopyrightNotice className="text-sm" />
    <FooterLinks className="mt-2" linkClassName="mx-2" />
  </div>
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
  pageTitle,
  pageDescription,
  children,
  maxWidth = '4xl',
  breadcrumbLabel,
  faq,
  belowTool
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
  const { pathname } = useLocation();

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

  const seo = (
    <SEO
      title={title}
      description={description}
      keywords={keywords}
    />
  );

  if (getToolByPath(pathname)?.fullWidth) {
    return (
      <div className="text-white relative min-h-0">
        {seo}
        <h1 className="sr-only">{pageTitle}</h1>
        <ToolBar title={breadcrumbLabel ?? title} />
        {children}
        <div className="container mx-auto px-4 pb-8 flex flex-col min-h-0">
          <Divider className="mb-8" />
          <div className="max-w-3xl mx-auto text-center mb-10">
            <TrustBadges />
            <p className="mt-0 text-base md:text-lg text-slate-400 leading-relaxed">{pageDescription}</p>
          </div>
          {belowTool}
          {faq && faq.length > 0 && <FaqSection items={faq} />}
          <PageFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="text-white relative min-h-0">
      {seo}

      <div className="container mx-auto px-4 pt-0 pb-8 flex flex-col min-h-0">
        {/* Tool switcher carousel */}
        <ToolSwitcher />

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="max-w-3xl mx-auto w-full mt-2">
          <ol className="flex items-center gap-1.5 text-xs text-slate-400">
            <li>
              <Link to="/" className="hover:text-slate-200 transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
            <li>
              <Link to="/tools" className="hover:text-slate-200 transition-colors">
                Tools
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
            <li className="text-slate-300 truncate" aria-current="page">
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
            <TrustBadges />
          </AnimatedElement>
          <AnimatedElement type="fadeIn" delay={0.15}>
            {/* The visible tool name now lives in the site header (App); keep an h1 for semantics/SEO */}
            <h1 className="sr-only">{pageTitle}</h1>
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

        <PageFooter />
      </div>
    </div>
  );
};

export default ToolPageLayout;
