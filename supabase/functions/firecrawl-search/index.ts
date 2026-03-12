const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiter per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max requests
const RATE_WINDOW = 60_000; // per 60 seconds

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = getClientIP(req);
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { query, options } = await req.json();

    if (!query || typeof query !== 'string' || query.length > 500) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required and must be under 500 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side validation: cap limit, whitelist scrapeOptions
    const sanitizedLimit = Math.min(Math.max(Number(options?.limit) || 3, 1), 10);
    const allowedFormats = ['markdown', 'html'];
    const sanitizedScrapeOptions = options?.scrapeOptions?.formats
      ? { formats: options.scrapeOptions.formats.filter((f: string) => allowedFormats.includes(f)) }
      : undefined;

    console.log('Searching:', query);

    const requestBody = JSON.stringify({
      query,
      limit: sanitizedLimit,
      lang: typeof options?.lang === 'string' ? options.lang.slice(0, 10) : undefined,
      country: typeof options?.country === 'string' ? options.country.slice(0, 10) : undefined,
      tbs: typeof options?.tbs === 'string' ? options.tbs.slice(0, 20) : undefined,
      scrapeOptions: sanitizedScrapeOptions,
    });

    const maxRetries = 2;
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`Firecrawl API error (attempt ${attempt + 1}):`, data);
          lastError = data.error || `Request failed with status ${response.status}`;
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          return new Response(
            JSON.stringify({ success: false, error: lastError }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Search successful');
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.warn(`Fetch error (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}`);
        lastError = msg;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: `Search failed after retries: ${lastError}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error searching:', msg);
    return new Response(
      JSON.stringify({ success: false, error: `Search failed: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
