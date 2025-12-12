import { Helmet } from 'react-helmet-async';
import { EXTERNAL_URLS } from '../config/externalUrls';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  noIndex?: boolean;
  noFollow?: boolean;
  canonical?: string;
  alternateLanguages?: Array<{ hrefLang: string; href: string }>;
  structuredData?: object;
}

export const SEO = ({
  title = 'sLixTOOLS - Free Online Tools for Developers',
  description = 'Free online tools for developers including GIF maker, image compressor, file converter, and more. Fast, secure, and easy to use.',
  keywords = 'online tools, gif maker, image compressor, file converter, developer tools, free tools',
  image = EXTERNAL_URLS.OG_IMAGE, // Using centralized URL
  url = 'https://slixtools.io',
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
  const fullTitle = title.includes('sLixTOOLS') ? title : `${title} - sLixTOOLS`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Robots Meta Tags */}
      {(noIndex || noFollow) && (
        <meta 
          name="robots" 
          content={`${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`} 
        />
      )}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {canonical && <meta property="og:url" content={canonical} />}
      {url && !canonical && <meta property="og:url" content={url} />}
      <meta property="og:image" content={image || EXTERNAL_URLS.OG_IMAGE} />
      <meta property="og:site_name" content="sLixTOOLS" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {section && <meta property="article:section" content={section} />}
      {tags.length > 0 && tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image || EXTERNAL_URLS.OG_IMAGE} />
      
      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content={author} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
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