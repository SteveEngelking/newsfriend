import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://newsfriend.org';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch in parallel
    const [reportsRes, specialRes] = await Promise.all([
      supabase
        .from('generated_reports')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(50000),
      supabase
        .from('special_editions')
        .select('id, approved_at, updated_at, created_at')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(50000),
    ]);

    if (reportsRes.error) console.error('articles-sitemap reports error', reportsRes.error);
    if (specialRes.error) console.error('articles-sitemap specials error', specialRes.error);

    const reportUrls = (reportsRes.data || []).map((r: any) => {
      const lastmod = new Date(r.created_at).toISOString();
      return `  <url>
    <loc>${escapeXml(`${SITE_URL}/report/${r.id}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    const specialUrls = (specialRes.data || []).map((r: any) => {
      const lastmod = new Date(r.approved_at || r.updated_at || r.created_at).toISOString();
      return `  <url>
    <loc>${escapeXml(`${SITE_URL}/report/${r.id}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...reportUrls, ...specialUrls].join('\n')}
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    console.error('articles-sitemap error', err);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' },
      status: 200,
    });
  }
});
