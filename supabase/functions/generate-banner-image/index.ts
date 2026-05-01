// Generates a 16:9 editorial illustration banner using Lovable AI image models
// and uploads it to the public 'report-banners' storage bucket.
//
// Strategy: try the configured/primary model. On 429/5xx, wait 30s and retry once.
// If that still fails, fall back to google/gemini-2.5-flash-image with one more
// 30s retry on 429/5xx. If both models give up, return an error (no SVG fallback).
// Returns { url, path, model } on success.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FALLBACK_MODEL = 'google/gemini-2.5-flash-image';
const RETRY_DELAY_MS = 30_000;

function buildPrompt(themeText: string): string {
  const safe = String(themeText || '').slice(0, 400).replace(/\s+/g, ' ').trim();
  return [
    'Editorial illustration banner inspired by this news theme:',
    `"${safe}".`,
    'Flat, semi-abstract, muted colours, soft lighting, modern illustration style,',
    'suitable for a clean news-style layout, 16:9 aspect ratio.',
    'CRITICAL: Do NOT include any text, letters, words, numbers, captions, headlines, labels, signage, watermarks, signatures, logos, or writing of any kind.',
    'Convey the theme purely through shapes, colour, and composition. No human faces, no brand names.',
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface AttemptResult {
  ok: boolean;
  status: number;
  imageUrl?: string;
  errorText?: string;
}

async function attemptOnce(model: string, prompt: string, apiKey: string): Promise<AttemptResult> {
  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return { ok: false, status: resp.status, errorText: txt.slice(0, 400) };
    }
    const data = await resp.json();
    const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl || !imageUrl.startsWith('data:')) {
      return { ok: false, status: 502, errorText: 'No image in response' };
    }
    return { ok: true, status: 200, imageUrl };
  } catch (e) {
    return { ok: false, status: 599, errorText: e instanceof Error ? e.message : String(e) };
  }
}

async function generateWithRetry(model: string, prompt: string, apiKey: string): Promise<AttemptResult> {
  const first = await attemptOnce(model, prompt, apiKey);
  if (first.ok) return first;
  const isTransient = first.status === 429 || (first.status >= 500 && first.status < 600);
  if (!isTransient) return first;
  console.warn(`[banner] model=${model} failed (${first.status}): ${first.errorText}. Retrying in ${RETRY_DELAY_MS}ms…`);
  await sleep(RETRY_DELAY_MS);
  const second = await attemptOnce(model, prompt, apiKey);
  if (!second.ok) {
    console.warn(`[banner] model=${model} retry also failed (${second.status}): ${second.errorText}`);
  }
  return second;
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

    const { data: settings } = await supabase
      .from('app_settings')
      .select('banner_image_model')
      .eq('id', 1)
      .maybeSingle();

    const primaryModel = requestedModel
      || (settings as any)?.banner_image_model
      || FALLBACK_MODEL;

    const prompt = buildPrompt(themeText);
    console.log(`[banner] generating primary=${primaryModel} kind=${kind} reportId=${reportId}`);

    let result = await generateWithRetry(primaryModel, prompt, LOVABLE_API_KEY);
    let usedModel = primaryModel;

    if (!result.ok && primaryModel !== FALLBACK_MODEL) {
      console.warn(`[banner] primary model exhausted, falling back to ${FALLBACK_MODEL}`);
      result = await generateWithRetry(FALLBACK_MODEL, prompt, LOVABLE_API_KEY);
      usedModel = FALLBACK_MODEL;
    }

    if (!result.ok || !result.imageUrl) {
      console.error(`[banner] all attempts failed for reportId=${reportId}: ${result.status} ${result.errorText}`);
      const status = result.status === 429 || result.status === 402 ? result.status : 502;
      return new Response(JSON.stringify({
        error: result.status === 429 ? 'Rate limited.'
          : result.status === 402 ? 'AI credits exhausted.'
          : 'Banner generation failed',
        details: result.errorText,
      }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { bytes, contentType } = dataUrlToBytes(result.imageUrl);
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
    return new Response(JSON.stringify({ url: pub.publicUrl, path: filename, model: usedModel }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[banner] unexpected', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
