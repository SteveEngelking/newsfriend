// Generates a 16:9 editorial illustration banner using Lovable AI (Nano Banana)
// and uploads it to the public 'report-banners' storage bucket.
// Returns { url, path } on success.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function buildPrompt(themeText: string): string {
  // Use the theme only as loose inspiration; strip quotes so model is less tempted to render them as letters.
  const safe = String(themeText || '').slice(0, 200).replace(/["'`]/g, '').replace(/\s+/g, ' ').trim();
  return [
    'A purely visual, wordless editorial illustration in 16:9 aspect ratio.',
    'Style: flat, semi-abstract, muted colour palette, soft lighting, modern editorial illustration.',
    'Use only shapes, colour, composition and visual symbolism — never text — to evoke this concept:',
    `${safe}.`,
    'STRICT NEGATIVE CONSTRAINTS (do not render any of the following under any circumstances):',
    'no text, no letters, no words, no numbers, no digits, no captions, no headlines, no titles,',
    'no labels, no signage, no signs, no banners with writing, no posters with writing,',
    'no newspapers with readable text, no books with readable text, no screens with text,',
    'no typography, no fonts, no glyphs, no characters, no scripts of any language (Latin, Cyrillic, Arabic, Chinese, Japanese, Korean, Hebrew, Devanagari, etc.),',
    'no calligraphy, no graffiti, no handwriting, no symbols resembling letters,',
    'no logos, no brand names, no trademarks, no watermarks, no signatures, no UI elements,',
    'no human faces, no recognisable real people.',
    'If a surface would normally contain text (sign, paper, screen, book), leave it completely blank or replace it with abstract shapes.',
  ].join(' ');
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) throw new Error('Invalid data URL from image model');
  const contentType = m[1];
  const base64 = m[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({} as any));
    const themeText: string = String(body?.themeText || '').trim();
    const reportId: string = String(body?.reportId || crypto.randomUUID());
    const kind: 'daily' | 'special' = body?.kind === 'special' ? 'special' : 'daily';
    const requestedModel: string | undefined = body?.model;

    if (!themeText) {
      return new Response(JSON.stringify({ error: 'themeText required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read global model setting; allow caller override
    const { data: settings } = await supabase
      .from('app_settings')
      .select('banner_image_model, banner_images_enabled')
      .eq('id', 1)
      .maybeSingle();

    const primaryModel = requestedModel
      || (settings as any)?.banner_image_model
      || 'google/gemini-2.5-flash-image';
    const fallbackModel = 'google/gemini-2.5-flash-image';

    const prompt = buildPrompt(themeText);

    async function tryGenerate(model: string): Promise<{ ok: true; imageUrl: string } | { ok: false; status: number; body: string }> {
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          modalities: ['image', 'text'],
        }),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        return { ok: false, status: resp.status, body };
      }
      const data = await resp.json();
      const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!url || !url.startsWith('data:')) {
        return { ok: false, status: 502, body: 'no image in response' };
      }
      return { ok: true, imageUrl: url };
    }

    const isTransient = (s: number) => s === 429 || s >= 500;

    console.log(`[banner] generating with model=${primaryModel} kind=${kind} reportId=${reportId}`);
    let attempt = await tryGenerate(primaryModel);
    let usedModel = primaryModel;

    // Retry primary once after 30s on transient errors
    if (!attempt.ok && isTransient(attempt.status)) {
      console.warn(`[banner] primary ${primaryModel} failed (${attempt.status}). Retrying in 30s. body=${attempt.body.slice(0, 200)}`);
      await new Promise(r => setTimeout(r, 30000));
      attempt = await tryGenerate(primaryModel);
    }

    // Fallback to alternate model on transient errors
    if (!attempt.ok && isTransient(attempt.status) && fallbackModel !== primaryModel) {
      console.warn(`[banner] primary still failing (${attempt.status}). Falling back to ${fallbackModel}`);
      const fb = await tryGenerate(fallbackModel);
      if (fb.ok) {
        attempt = fb;
        usedModel = fallbackModel;
      } else if (isTransient(fb.status)) {
        console.warn(`[banner] fallback ${fallbackModel} transient (${fb.status}). Retrying in 30s.`);
        await new Promise(r => setTimeout(r, 30000));
        const fb2 = await tryGenerate(fallbackModel);
        if (fb2.ok) {
          attempt = fb2;
          usedModel = fallbackModel;
        } else {
          attempt = fb2;
          usedModel = fallbackModel;
        }
      } else {
        attempt = fb;
        usedModel = fallbackModel;
      }
    }

    if (!attempt.ok) {
      console.error(`[banner] all attempts failed status=${attempt.status} body=${attempt.body.slice(0, 300)}`);
      const status = attempt.status === 429 || attempt.status === 402 ? attempt.status : 502;
      return new Response(JSON.stringify({
        error: attempt.status === 429 ? 'Rate limited, try again shortly.'
          : attempt.status === 402 ? 'AI credits exhausted.'
          : 'Banner generation failed',
      }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const imageUrl = attempt.imageUrl;
    console.log(`[banner] success usedModel=${usedModel}`);

    const { bytes, contentType } = dataUrlToBytes(imageUrl);
    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
      : contentType.includes('webp') ? 'webp' : 'png';
    const filename = `${kind}/${reportId}-${Date.now()}.${ext}`;

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

    return new Response(JSON.stringify({ url, path: filename, model }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[banner] unexpected', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
