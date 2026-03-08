const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, articles, allSourceNames } = await req.json();

    if (!topic || !articles?.length) {
      return new Response(
        JSON.stringify({ error: 'Topic and articles are required' }),
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

    const articlesSummary = articles.map((a: any, i: number) =>
      `[Article ${i + 1}] Source: ${a.sourceName}\nTitle: ${a.title}\nURL: ${a.url}\nContent:\n${a.content}`
    ).join('\n\n---\n\n');

    const systemPrompt = `You are an expert fact-checker and news analyst. You analyze news articles from multiple sources to identify key claims, cross-reference them, and assess their veracity.

CRITICAL RULES:
- You MUST include a sourceComparison entry for EVERY source the user selected. No exceptions.
- Be critical and skeptical. Not everything is "verified". Look for contradictions, unsubstantiated claims, and differing narratives between sources.
- Use all three statuses: verified, disputed, AND unverified. A good report typically has a mix.
- You MUST respond with a valid JSON object using tool calling. Do NOT include any text outside the tool call.`;

    const sourceNamesFromArticles = [...new Set(articles.map((a: any) => a.sourceName))];
    const allNames = allSourceNames?.length ? [...new Set([...allSourceNames, ...sourceNamesFromArticles])] : sourceNamesFromArticles;
    const minClaims = Math.max(10, allNames.length);

    const userPrompt = `Analyze the following articles about "${topic}" and produce a comprehensive fact-check report.

${articlesSummary}

Identify ${minClaims}-20 key claims made across these articles. For each claim, determine if it is verified, disputed, or unverified. Be critical — not all claims should be verified. Look for inconsistencies and unsubstantiated statements. Assign a confidence score 0-100.

The user selected these ${allNames.length} sources for analysis: ${allNames.join(', ')}.

MANDATORY: Your sourceComparison array MUST contain exactly ${allNames.length} entries — one for each of these sources: ${allNames.join(', ')}. If a source had no articles found, still include it and note the absence of coverage in its perspective. Do NOT return fewer than ${allNames.length} sourceComparison entries.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds in Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
