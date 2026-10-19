import { Link } from 'react-router-dom';
import { EXTERNAL_URLS } from '@/config/externalUrls';

const CURRENT_YEAR = new Date().getFullYear();

/** Copyright line with a sky→violet gradient brand name */
export const CopyrightNotice = ({ className = '' }: { className?: string }) => (
  <p className={className}>
    © {CURRENT_YEAR}{' '}
    <span className="font-semibold bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
      sLixTOOLS
    </span>
    . All rights reserved.
  </p>
);

const FOOTER_LINKS = [
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-of-service', label: 'Terms of Service' },
  { to: '/impressum', label: 'Impressum' },
  { to: '/contact', label: 'Contact' },
] as const;

const GITHUB_URL = EXTERNAL_URLS.GITHUB.REPO;

export interface FooterLinksProps {
  className?: string;
  linkClassName?: string;
  showCopyright?: boolean;
  copyrightClassName?: string;
}

export const FooterLinks = ({
  className = '',
  linkClassName = '',
  showCopyright = false,
  copyrightClassName = 'mb-1',
}: FooterLinksProps) => {
  const linkStyles = `mx-2 hover:text-sky-400 transition-colors ${linkClassName}`;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {showCopyright && <CopyrightNotice className={copyrightClassName} />}
      <div className="flex flex-wrap items-center justify-center gap-1">
        {FOOTER_LINKS.map((link) => (
          <span key={link.to} className="contents">
            <Link to={link.to} className={linkStyles}>
              {link.label}
            </Link>
            <span>•</span>
          </span>
        ))}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkStyles}
        >
          GitHub
        </a>
      </div>
    </div>
  );
};

export default FooterLinks;
