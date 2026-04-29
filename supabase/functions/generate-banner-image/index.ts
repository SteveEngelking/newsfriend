// Generates a guaranteed-wordless 16:9 editorial illustration banner as SVG
// and uploads it to the public 'report-banners' storage bucket.
// Returns { url, path } on success.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildWordlessSvg(themeText: string): string {
  const seed = hashString(String(themeText || 'NewsFriend'));
  const palettes = [
    ['#e7f5ee', '#b9e6d1', '#2f8f6b', '#f2c94c', '#1f4f46'],
    ['#edf3f8', '#b7d1e8', '#356d92', '#f4a261', '#23395b'],
    ['#f5f1ea', '#d9c8a9', '#607d3b', '#d66f49', '#30362f'],
    ['#eef4ed', '#c7d9b7', '#4b8063', '#d8a548', '#263d42'],
  ];
  const palette = palettes[seed % palettes.length];
  const blobs = Array.from({ length: 9 }, (_, index) => {
    const local = hashString(`${seed}-${index}`);
    const cx = 80 + (local % 1120);
    const cy = 70 + ((local >>> 7) % 540);
    const rx = 70 + ((local >>> 13) % 190);
    const ry = 45 + ((local >>> 19) % 145);
    const rotate = (local >>> 5) % 180;
    const color = palette[2 + (index % 3)];
    const opacity = index % 2 === 0 ? 0.22 : 0.34;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${opacity}" transform="rotate(${rotate} ${cx} ${cy})"/>`;
  }).join('');
  const columns = Array.from({ length: 11 }, (_, index) => {
    const local = hashString(`${seed}-bar-${index}`);
    const x = 88 + index * 104;
    const h = 110 + (local % 260);
    const y = 610 - h;
    const color = palette[index % palette.length];
    return `<rect x="${x}" y="${y}" width="56" height="${h}" rx="28" fill="${color}" opacity="0.32"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette[0]}"/><stop offset="0.55" stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[0]}"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="1090" cy="130" r="210" fill="${palette[3]}" opacity="0.18"/><circle cx="190" cy="600" r="260" fill="${palette[2]}" opacity="0.16"/>${blobs}${columns}<path d="M0 560 C220 500 350 630 560 560 C780 486 930 520 1280 450 L1280 720 L0 720 Z" fill="${palette[4]}" opacity="0.12"/></svg>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = await req.json().catch(() => ({} as any));
    const themeText: string = String(body?.themeText || '').trim();
    const reportId: string = String(body?.reportId || crypto.randomUUID());
    const kind: 'daily' | 'special' = body?.kind === 'special' ? 'special' : 'daily';

    if (!themeText) {
      return new Response(JSON.stringify({ error: 'themeText required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const svg = buildWordlessSvg(themeText);
    const bytes = new TextEncoder().encode(svg);
    const contentType = 'image/svg+xml; charset=utf-8';
    const filename = `${kind}/${reportId}-${Date.now()}.svg`;
    console.log(`[banner] generated deterministic wordless svg kind=${kind} reportId=${reportId}`);

    const { error: uploadErr } = await supabase.storage
      .from('report-banners')
      .upload(filename, bytes, { contentType, upsert: true, cacheControl: '31536000' });

    if (uploadErr) {
      console.error('[banner] upload error', uploadErr);
      return new Response(JSON.stringify({ error: 'Upload failed', details: uploadErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: pub } = supabase.storage.from('report-banners').getPublicUrl(filename);
    const url = pub.publicUrl;

    return new Response(JSON.stringify({ url, path: filename, model: 'wordless-svg' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[banner] unexpected', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
