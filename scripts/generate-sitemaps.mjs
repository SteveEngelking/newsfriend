import { writeFile } from 'fs/promises';

const SUPABASE_PROJECT_REF = 'kitduddwitnsaqfwdpxd';
const FUNCTIONS_BASE = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1`;
const SITE_URL = 'https://newsfriend.org';

async function fetchSitemap(path) {
  const url = `${FUNCTIONS_BASE}/${path}`;
  console.log(`Fetching ${url}...`);
  const res = await fetch(url, {
    headers: { Accept: 'application/xml' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: HTTP ${res.status}`);
  }
  const xml = await res.text();
  console.log(`Fetched ${path} (${xml.length} bytes)`);
  return xml;
}

async function main() {
  let articlesXml = '';
  let newsXml = '';
  let articlesSuccess = false;
  let newsSuccess = false;

  try {
    articlesXml = await fetchSitemap('articles-sitemap');
    articlesSuccess = true;
  } catch (err) {
    console.error(`Warning: ${err.message}`);
  }

  try {
    newsXml = await fetchSitemap('news-sitemap');
    newsSuccess = true;
  } catch (err) {
    console.error(`Warning: ${err.message}`);
  }

  if (!articlesSuccess && !newsSuccess) {
    console.error('Error: Could not fetch any sitemaps. Build continuing with fallback empty sitemaps.');
    articlesXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
    newsXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>';
  }

  await writeFile('public/sitemap-articles.xml', articlesXml);
  console.log('Wrote public/sitemap-articles.xml');

  await writeFile('public/sitemap-news.xml', newsXml);
  console.log('Wrote public/sitemap-news.xml');

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-static.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-articles.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-news.xml</loc>
  </sitemap>
</sitemapindex>
`;

  await writeFile('public/sitemap.xml', sitemapIndex);
  console.log('Wrote public/sitemap.xml');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
