import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://newsfriend.org';
const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.jpg`;

interface SEOProps {
  /** Page title (will be appended with " | NewsFriend" if no brand provided) */
  title: string;
  /** Meta description, 140-160 chars recommended */
  description: string;
  /** Path beginning with "/" — used for canonical URL */
  path?: string;
  /** Override the og:image URL */
  image?: string;
  /** Page type for Open Graph */
  type?: 'website' | 'article';
  /** Set to true to discourage indexing (login/account/admin pages) */
  noindex?: boolean;
  /** Optional JSON-LD structured data (object or array) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Language override (default 'en') */
  lang?: 'en' | 'de';
}

/**
 * Reusable SEO component that injects per-route meta tags, canonical URL,
 * OpenGraph / Twitter cards, and optional JSON-LD structured data.
 */
export function SEO({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd,
  lang = 'en',
}: SEOProps) {
  const canonical = `${SITE_URL}${path === '/' ? '' : path}`;
  const fullTitle = title.includes('NewsFriend') ? title : `${title} | NewsFriend`;
  const truncatedTitle = fullTitle.length > 60 ? fullTitle.slice(0, 57) + '...' : fullTitle;
  const truncatedDesc = description.length > 160 ? description.slice(0, 157) + '...' : description;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{truncatedTitle}</title>
      <meta name="description" content={truncatedDesc} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={truncatedTitle} />
      <meta property="og:description" content={truncatedDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="NewsFriend" />
      <meta property="og:locale" content={lang === 'de' ? 'de_DE' : 'en_GB'} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={truncatedTitle} />
      <meta name="twitter:description" content={truncatedDesc} />
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

export const SITE_BASE_URL = SITE_URL;
