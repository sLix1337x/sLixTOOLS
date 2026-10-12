import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Container from '@/components/layout/Container';
import { SEO } from '@/components/SEO';

interface SectionProps {
  num: number;
  title: string;
  children: ReactNode;
}

const Section = ({ num, title, children }: SectionProps) => (
  <section className="mt-10">
    <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/10 text-sky-300 text-xs font-bold">
        {num}
      </span>
      {title}
    </h2>
    {children}
  </section>
);

const P = ({ children }: { children: ReactNode }) => (
  <p className="text-slate-400 leading-relaxed mb-3">{children}</p>
);

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-slate-400 leading-relaxed marker:text-sky-500/60">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const TermsOfService = () => {
  return (
    <div className="min-h-screen text-white">
      <SEO
        title="Terms of Service"
        description="Terms of service for using the free, browser-based sLixTOOLS file conversion and editing tools."
      />
      <Container className="py-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-400/80 mb-3">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500 mb-10">
            Last updated: 8 October 2026 · Effective immediately upon publication
          </p>

          <div>
            <Section num={1} title="Scope and Provider">
              <P>
                These Terms of Service (“Terms”) govern your use of the sLixTOOLS website
                and its browser-based file and media tools (the “Service”). The Service is
                provided by the operator identified in the{' '}
                <Link
                  to="/impressum"
                  className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
                >
                  Impressum
                </Link>
                . By accessing or using the Service, you agree to be bound by these Terms;
                if you do not agree, do not use the Service.
              </P>
            </Section>

            <Section num={2} title="Description of the Service">
              <P>
                sLixTOOLS offers free online utilities — including video, GIF, image, and
                document tools such as conversion, compression, resizing, splitting, and
                editing. All processing takes place locally in your browser; no account
                registration is required.
              </P>
              <P>
                The Service is provided free of charge for personal and commercial use.
                Optional features, limits, or individual tools may be added, changed, or
                discontinued at any time.
              </P>
            </Section>

            <Section num={3} title="Permitted Use">
              <P>You agree to use the Service only in accordance with these Terms and to:</P>
            <List
              items={[
                'use the Service for lawful purposes only and in compliance with all applicable laws and regulations;',
                'not upload, process, or distribute content that infringes third-party intellectual property, privacy, publicity, or other rights;',
                'not attempt to disrupt, overload, reverse engineer, or compromise the security or integrity of the Service;',
                'not distribute malware, or use the Service to transmit harmful code;',
                'not use automated means (scraping, crawling, or bots) to access the Service without our prior written consent;',
                'not misrepresent your affiliation with, or endorsement by, the operator of the Service.',
              ]}
            />
          </Section>

          <Section num={4} title="User Content">
            <P>
              You retain all rights to the files and content you process with the Service
              (“User Content”). Because processing happens entirely in your browser, your
              User Content is not transmitted to or stored on our servers.
            </P>
            <P>
              You are solely responsible for User Content, including ensuring that you have
              all rights necessary to process it. You grant us no rights to your User
              Content beyond the technically necessary, local processing performed by your
              own browser while you use the Service.
            </P>
          </Section>

          <Section num={5} title="Intellectual Property">
            <P>
              The Service — including its design, branding, text, and code — is protected by
              copyright and other intellectual property laws and is owned by the operator of
              sLixTOOLS. Except as expressly permitted, you may not copy, modify,
              distribute, or create derivative works from the Service. The source code is
              made available under the MIT license published in the project repository.
            </P>
          </Section>

          <Section num={6} title="Availability">
            <P>
              The Service is provided free of charge on an “as available” basis. We do not
              guarantee uninterrupted, error-free, or secure availability and may suspend
              or withdraw any part of the Service at any time, without notice, including for
              maintenance, updates, or if we discontinue the Service entirely.
            </P>
          </Section>

          <Section num={7} title="Disclaimer of Warranties">
            <P>
              To the fullest extent permitted by applicable law, the Service is provided
              “as is” and “as available”, without warranties of any kind, whether express or
              implied, including implied warranties of merchantability, fitness for a
              particular purpose, and non-infringement. We do not warrant that the Service
              will meet your requirements or that it will be free of defects, or that defects
              will be corrected.
            </P>
          </Section>

          <Section num={8} title="Limitation of Liability">
            <P>
              To the fullest extent permitted by applicable law, the operator of sLixTOOLS
              shall not be liable for any indirect, incidental, special, consequential, or
              punitive damages, or any loss of data, profits, or business opportunities,
              arising out of or in connection with your use of the Service — including
              damage caused by data loss, incorrect conversion results, or tool
              unavailability. Back up your original files; always keep them.
            </P>
            <P>
              Nothing in these Terms limits or excludes liability for intent, gross
              negligence, injury to life, body or health, or any other liability that cannot
              be limited or excluded under applicable law. Any statutory consumer
              protections of your country of residence remain unaffected.
            </P>
          </Section>

          <Section num={9} title="Third-Party Services and Links">
            <P>
              The Service may contain links to third-party websites or services (such as
              payment or community platforms) that are not operated by us. We assume no
              responsibility for their content, policies, or practices, and your interactions
              with them are governed solely by their respective terms.
            </P>
          </Section>

          <Section num={10} title="Privacy">
            <P>
              Our handling of personal data is described in the{' '}
              <Link
                to="/privacy-policy"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              , which forms part of these Terms.
            </P>
          </Section>

          <Section num={11} title="Changes to These Terms">
            <P>
              We may update these Terms from time to time. The “Last updated” date at the top
              of this page reflects the most recent revision. Material changes will be
              announced on the website where feasible. Your continued use of the Service
              after changes take effect constitutes acceptance of the revised Terms.
            </P>
          </Section>

          <Section num={12} title="Governing Law">
            <P>
              These Terms are governed by the laws of Germany, without regard to its
              conflict-of-law provisions. If you are a consumer, the mandatory consumer
              protection rules of your country of residence remain unaffected, and legal
              proceedings may only be brought in the courts of your habitual residence.
            </P>
          </Section>

          <Section num={13} title="Contact">
            <P>
              Questions about these Terms? Email{' '}
              <a
                href="mailto:legal@slixtools.io"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
              >
                legal@slixtools.io
              </a>{' '}
              or use the{' '}
              <Link
                to="/contact"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
              >
                contact page
              </Link>
              .
            </P>
          </Section>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default TermsOfService;
