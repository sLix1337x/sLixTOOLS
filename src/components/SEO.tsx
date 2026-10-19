import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { EXTERNAL_URLS, siteUrl } from '../config/externalUrls';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  noIndex?: boolean;
  noFollow?: boolean;
  /** Override the canonical URL (defaults to the current route on the public site) */
  canonical?: string;
  alternateLanguages?: Array<{ hrefLang: string; href: string }>;
  structuredData?: object | undefined;
}

export const SEO = ({
  title = 'sLixTOOLS - Free Online Tools for Developers',
  description = 'Free online tools for developers including GIF maker, image compressor, file converter, and more. Fast, secure, and easy to use.',
  keywords = 'online tools, gif maker, image compressor, file converter, developer tools, free tools',
  image = EXTERNAL_URLS.OG_IMAGE,
  type = 'website',
  author = 'sLix1337x',
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  noIndex = false,
  noFollow = false,
  canonical,
  alternateLanguages = [],
  structuredData
}: SEOProps) => {
  const { pathname } = useLocation();
  const fullTitle = title.toLowerCase().includes('slixtools') ? title : `${title} - sLixTOOLS`;
  const url = canonical ?? siteUrl(pathname);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {!noIndex && <link rel="canonical" href={url} />}
      <meta
        name="robots"
        content={`${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`}
      />

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="sLixTOOLS" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {section && <meta property="article:section" content={section} />}
      {tags.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <meta name="author" content={author} />

      {/* Alternate Languages */}
      {alternateLanguages.map((lang) => (
        <link
          key={lang.hrefLang}
          rel="alternate"
          hrefLang={lang.hrefLang}
          href={lang.href}
        />
      ))}

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
