import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Container from '@/components/layout/Container';

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

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen text-white">
      <Container className="py-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-400/80 mb-3">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 mb-10">
            Last updated: 8 October 2026 · GDPR / DSGVO transparency notice
          </p>

          <div>
            <Section num={1} title="Overview and Data Controller">
              <P>
                sLixTOOLS is built privacy-first: the tools run entirely in your browser, and
                we do not require an account or collect personal data to let you use them.
                This Privacy Policy explains what limited data is involved when you visit
                this website and what rights you have under the General Data Protection
                Regulation (GDPR).
              </P>
              <P>
                The data controller is the person identified in the{' '}
                <Link
                  to="/impressum"
                  className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
                >
                  Impressum
                </Link>
                .
              </P>
            </Section>

            <Section num={2} title="Your Files Are Never Uploaded">
              <P>
                This is the core of how sLixTOOLS works: every tool — conversion,
                compression, resizing, splitting, editing — processes your files locally in
                your browser using client-side technologies (JavaScript, WebAssembly,
                Canvas). Your files are:
              </P>
              <List
                items={[
                  'never transmitted to a server of ours — we have no file-upload backend;',
                  'never stored by us — files live only in your browser memory for the session;',
                  'never read, analyzed, or tracked — no tool inspects the content of your files;',
                  'gone from memory when you close or refresh the page.',
                ]}
              />
              <P>
                You can verify this yourself: the browser’s network panel shows that no file
                data leaves your device during processing.
              </P>
            </Section>

            <Section num={3} title="Information Automatically Processed by Our Host">
              <P>
                The website is a static site hosted on GitHub Pages. When your browser
                requests a page, the hosting provider automatically receives standard server
                log data, which may include:
              </P>
              <List
                items={[
                  'your IP address;',
                  'the date and time of the request;',
                  'the URL of the page requested;',
                  'your browser’s user agent string;',
                  'the referring page, if any.',
                ]}
              />
              <P>
                This processing is necessary to deliver the website to you (Art. 6(1)(f)
                GDPR — legitimate interest in a functioning, secure website). Log retention
                is governed by the host’s policies; see GitHub’s privacy statement for
                details.
              </P>
            </Section>

            <Section num={4} title="Local Storage (No Tracking Cookies)">
              <P>
                sLixTOOLS does not set any tracking or advertising cookies. We use your
                browser’s local storage for two purposes:
              </P>
              <List
                items={[
                  'to remember your cookie-consent choice (essential or all), so the banner does not reappear;',
                  'to keep up to 10 recent client-side error reports (error message, page, timestamp) on your device, so you can copy diagnostic details if something breaks — these reports are never transmitted anywhere.',
                ]}
              />
              <P>
                This data stays on your device only, can be cleared at any time through your
                browser settings, and is not transmitted to us.
              </P>
            </Section>

            <Section num={5} title="Analytics">
              <P>
                We do not use any analytics, tracking, or advertising services. There is no
                Google Analytics, no heatmapping, no pixel, and no fingerprinting. Aggregate
                usage cannot be profiled because it is never collected.
              </P>
            </Section>

            <Section num={6} title="Third-Party Resources">
              <P>
                Two third-party resources are loaded when the site renders, which may reveal
                your IP address to the respective provider:
              </P>
              <List
                items={[
                  'Google Fonts (fonts.googleapis.com / fonts.gstatic.com) — used to display the site’s typography;',
                  'GitHub Pages (github.io) — our hosting provider, as described in section 3.',
                ]}
              />
              <P>
                Links to external sites (such as Ko-fi or community profiles) are ordinary
                hyperlinks — they only connect after you click them, and their operators’
                own privacy policies apply from that point on.
              </P>
            </Section>

            <Section num={7} title="How We Use Any Data">
              <P>
                We do not use, combine, or enrich any of the data described above for
                profiling, advertising, or automated decision-making. The limited technical
                data exists solely to deliver and secure the website.
              </P>
            </Section>

            <Section num={8} title="Your Rights">
              <P>
                Under the GDPR you have the right to request access to, rectification of, or
                erasure of personal data concerning you; the right to restriction of
                processing and to data portability; and the right to object to processing.
                Because we hold almost no data about you (see section 3), most requests can
                be answered immediately by clearing your own browser data.
              </P>
              <P>
                You also have the right to lodge a complaint with a supervisory authority —
                in Germany, the competent data protection authority of your federal state.
              </P>
            </Section>

            <Section num={9} title="Children’s Privacy">
              <P>
                The Service is not directed at children under 16, and we do not knowingly
                collect personal information from them. If you believe a child has provided
                us personal data, contact us and we will delete it.
              </P>
            </Section>

            <Section num={10} title="Changes to This Policy">
              <P>
                We may update this Privacy Policy from time to time. The “Last updated” date
                at the top reflects the current version; material changes will be announced
                on this page.
              </P>
            </Section>

            <Section num={11} title="Contact">
              <P>
                For questions about this Privacy Policy or your data, email{' '}
                <a
                  href="mailto:privacy@slixtools.io"
                  className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
                >
                  privacy@slixtools.io
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

export default PrivacyPolicy;
