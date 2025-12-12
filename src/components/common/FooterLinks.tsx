import { Link } from 'react-router-dom';

export const CURRENT_YEAR = new Date().getFullYear();
export const COPYRIGHT_TEXT = `© ${CURRENT_YEAR} sLixTOOLS. All rights reserved.`;

const FOOTER_LINKS = [
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-of-service', label: 'Terms of Service' },
  { to: '/impressum', label: 'Impressum' },
  { to: '/contact', label: 'Contact' },
] as const;

const GITHUB_URL = 'https://github.com/sLix1337x/sLixTOOLS';

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
  const linkStyles = `mx-2 hover:text-pink-400 transition-colors ${linkClassName}`;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {showCopyright && <p className={copyrightClassName}>{COPYRIGHT_TEXT}</p>}
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
