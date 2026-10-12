import Container from '@/components/layout/Container';
import { SEO } from '@/components/SEO';

/**
 * German statutory imprint (Impressum).
 * NOTE: name/address/phone/VAT below are PLACEHOLDER data — replace with the
 * real operator details before production use.
 */
const Impressum = () => {
  return (
    <div className="min-h-screen text-white">
      <SEO title="Impressum" description="Legal imprint (Impressum) for sLixTOOLS pursuant to § 5 DDG." />
      <Container className="py-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-400/80 mb-3">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">
            Impressum
          </h1>
          <p className="text-sm text-slate-500 mb-10">
            Information pursuant to § 5 DDG (German Digital Services Act) · Last updated: 8
            October 2026
          </p>

          <div className="max-w-none">
            {/* 1 */}
            <h2 className="text-xl font-semibold text-white mt-10 mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/10 text-sky-300 text-xs font-bold">
                1
              </span>
              Service Provider
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Godfather sLix
              <br />
              slixstreet 666
              <br />
              1337666 slixtown
              <br />
              Germany
            </p>

            {/* 2 */}
            <h2 className="text-xl font-semibold text-white mt-10 mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/10 text-sky-300 text-xs font-bold">
                2
              </span>
              Contact
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Phone: +49 30 1234567
              <br />
              Email: legal@slixtools.io
            </p>

            {/* 3 */}
            <h2 className="text-xl font-semibold text-white mt-10 mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/10 text-sky-300 text-xs font-bold">
                3
              </span>
              VAT Registration Number
            </h2>
            <p className="text-slate-400 leading-relaxed">
              VAT identification number pursuant to § 27a of the German VAT Act
              (Umsatzsteuergesetz):
              <br />
              DE 123 456 789
            </p>

            {/* 4 */}
            <h2 className="text-xl font-semibold text-white mt-10 mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/10 text-sky-300 text-xs font-bold">
                4
              </span>
              Responsible for Content pursuant to § 18(2) MStV
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Godfather sLix
              <br />
              slixstreet 666
              <br />
              1337666 slixtown
              <br />
              Germany
            </p>

            {/* 5 */}
            <h2 className="text-xl font-semibold text-white mt-10 mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/10 text-sky-300 text-xs font-bold">
                5
              </span>
              Dispute Resolution
            </h2>
            <p className="text-slate-400 leading-relaxed mb-3">
              We are neither willing nor obligated to participate in dispute resolution
              proceedings before a consumer arbitration board. The consumer arbitration
              platform of the European Commission (ec.europa.eu/consumers/odr) ceased
              operations in July 2025.
            </p>
            <p className="text-slate-400 leading-relaxed">
              We would, however, prefer to resolve any disagreements directly — please
              contact us at legal@slixtools.io.
            </p>

            {/* 6 */}
            <h2 className="text-xl font-semibold text-white mt-10 mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/10 text-sky-300 text-xs font-bold">
                6
              </span>
              Liability for Content
            </h2>
            <p className="text-slate-400 leading-relaxed mb-3">
              As a service provider, we are responsible for our own content on these pages
              pursuant to § 7(1) DDG. However, pursuant to §§ 8–10 DDG, we are not
              obligated to monitor transmitted or stored third-party information or to
              investigate circumstances that indicate illegal activity.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Obligations to remove or block the use of information under general law
              remain unaffected. Liability in this regard is only possible from the point
              in time at which a concrete infringement of the law becomes known. If we
              become aware of any such infringements, we will remove this content
              immediately.
            </p>

            {/* 7 */}
            <h2 className="text-xl font-semibold text-white mt-10 mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/10 text-sky-300 text-xs font-bold">
                7
              </span>
              Liability for Links
            </h2>
            <p className="text-slate-400 leading-relaxed mb-3">
              Our offering contains links to external third-party websites whose content we
              have no influence over. Therefore, we cannot assume any liability for this
              external content. The respective provider or operator of the linked pages is
              always responsible for their content. The linked pages were checked for
              possible legal violations at the time of linking; illegal content was not
              recognizable at that time.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Permanent control of the content of linked pages is not reasonable without
              concrete evidence of a violation of law. If we become aware of any
              infringements, we will remove such links immediately.
            </p>

            {/* 8 */}
            <h2 className="text-xl font-semibold text-white mt-10 mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/10 text-sky-300 text-xs font-bold">
                8
              </span>
              Copyright
            </h2>
            <p className="text-slate-400 leading-relaxed mb-3">
              The content and works created by the site operator on these pages are subject
              to German copyright law. Duplication, processing, distribution, and any kind
              of exploitation beyond the limits of copyright law require the written
              consent of the respective author or creator. Downloads and copies of this
              site are only permitted for private, non-commercial use.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Insofar as content on this site was not created by the operator, the
              copyrights of third parties are respected and third-party content is
              identified as such. Should you nevertheless become aware of a copyright
              infringement, please inform us. If we become aware of any infringements, we
              will remove such content immediately.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Impressum;
