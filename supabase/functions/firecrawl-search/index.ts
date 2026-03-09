const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: sanitizedLimit,
        lang: typeof options?.lang === 'string' ? options.lang.slice(0, 10) : undefined,
        country: typeof options?.country === 'string' ? options.country.slice(0, 10) : undefined,
        tbs: typeof options?.tbs === 'string' ? options.tbs.slice(0, 20) : undefined,
        scrapeOptions: sanitizedScrapeOptions,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Search successful');
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to search' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
