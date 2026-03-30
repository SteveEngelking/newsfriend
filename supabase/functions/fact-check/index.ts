const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000;

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

function sanitizeArticles(articles: any[]): any[] {
  return articles.slice(0, 15).map((a: any) => ({
    sourceName: typeof a.sourceName === 'string' ? a.sourceName.slice(0, 100) : 'Unknown',
    title: typeof a.title === 'string' ? a.title.slice(0, 300) : '',
    url: typeof a.url === 'string' ? a.url.slice(0, 2000) : '',
    content: typeof a.content === 'string' ? a.content.slice(0, 1500) : '',
  }));
}

function sanitizeSourceNames(names: any): string[] {
  if (!Array.isArray(names)) return [];
  return names.slice(0, 20).filter((n: any) => typeof n === 'string').map((n: string) => n.slice(0, 100));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = getClientIP(req);
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { topic, articles, allSourceNames, language } = await req.json();
    const outputLang = language === 'de' ? 'German' : 'English';

    if (!topic || typeof topic !== 'string' || topic.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Topic is required and must be under 500 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(articles) || !articles.length) {
      return new Response(
        JSON.stringify({ error: 'Articles array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeArticles = sanitizeArticles(articles);
    const safeSourceNames = sanitizeSourceNames(allSourceNames);

    const articlesSummary = safeArticles.map((a, i) =>
      `[Article ${i + 1}] Source: ${a.sourceName}\nTitle: ${a.title}\nURL: ${a.url}\nContent:\n${a.content}`
    ).join('\n\n---\n\n');

    const systemPrompt = `You are an expert fact-checker and news analyst. You analyze news articles from multiple sources to identify key claims, cross-reference them, and assess their veracity.

LANGUAGE: You MUST write the ENTIRE report in ${outputLang}. All summaries, claim texts, explanations, perspectives, and key points must be in ${outputLang}. Source names and URLs remain as-is.

CRITICAL RULES:
- You MUST include a sourceComparison entry for EVERY source the user selected. No exceptions.
- Be critical and skeptical. Not everything is "verified". Look for contradictions, unsubstantiated claims, and differing narratives between sources.
- Use all three statuses: verified, disputed, AND unverified. A good report typically has a mix.
- You MUST respond with a valid JSON object using tool calling. Do NOT include any text outside the tool call.`;

    const sourceNamesFromArticles = [...new Set(safeArticles.map(a => a.sourceName))];
    const allNames = safeSourceNames.length ? [...new Set([...safeSourceNames, ...sourceNamesFromArticles])] : sourceNamesFromArticles;
    const minClaims = Math.max(10, allNames.length);

    const userPrompt = `Analyze the following articles about "${topic}" and produce a comprehensive fact-check report in ${outputLang}.

${articlesSummary}

Identify ${minClaims}-20 key claims made across these articles. For each claim, determine if it is verified, disputed, or unverified. Be critical — not all claims should be verified. Look for inconsistencies and unsubstantiated statements. Assign a confidence score 0-100.

The user selected these ${allNames.length} sources for analysis: ${allNames.join(', ')}.

MANDATORY: Your sourceComparison array MUST contain exactly ${allNames.length} entries — one for each of these sources: ${allNames.join(', ')}. If a source had no articles found, still include it and note the absence of coverage in its perspective. Do NOT return fewer than ${allNames.length} sourceComparison entries.

Write everything in ${outputLang}.`;

    const requestBody = JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'generate_factcheck_report',
          description: 'Generate a structured fact-check report from analyzed news articles',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: 'A comprehensive 2-4 sentence summary of the topic based on all sources' },
              claims: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'The claim text' },
                    status: { type: 'string', enum: ['verified', 'disputed', 'unverified'] },
                    confidence: { type: 'number', description: 'Confidence score 0-100' },
                    explanation: { type: 'string', description: 'Why this claim has this status' },
                    sources: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          sourceName: { type: 'string' },
                          excerpt: { type: 'string', description: 'Relevant excerpt from the source' },
                        },
                        required: ['sourceName', 'excerpt'],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ['text', 'status', 'confidence', 'explanation', 'sources'],
                  additionalProperties: false,
                },
              },
              sourceComparison: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sourceName: { type: 'string' },
                    perspective: { type: 'string', description: 'How this source framed the topic' },
                    keyPoints: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '2-4 key points unique to this source',
                    },
                  },
                  required: ['sourceName', 'perspective', 'keyPoints'],
                  additionalProperties: false,
                },
              },
            },
            required: ['summary', 'claims', 'sourceComparison'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'generate_factcheck_report' } },
    });

    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      if (response.status !== 503 && response.status !== 500) break;
      console.warn(`AI gateway returned ${response.status}, attempt ${attempt + 1}/3`);
      await response.text();
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }

    if (!response || !response.ok) {
      const status = response?.status ?? 500;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds in Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = response ? await response.text() : 'No response after retries';
      console.error('AI gateway error:', status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response:', JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: 'AI did not return structured data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    const report = {
      topic,
      summary: parsed.summary,
      claims: parsed.claims.map((c: any, i: number) => ({
        id: `claim-${i}`,
        ...c,
      })),
      sourceComparison: parsed.sourceComparison,
      generatedAt: new Date().toISOString(),
    };

    console.log('Fact-check report generated successfully');

    return new Response(
      JSON.stringify({ report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fact-check error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred during fact-checking' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
