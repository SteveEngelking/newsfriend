const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function sanitizeArticles(articles: any[]): any[] {
  return articles.slice(0, 20).map((a: any) => ({
    sourceName: typeof a.sourceName === 'string' ? a.sourceName.slice(0, 100) : 'Unknown',
    title: typeof a.title === 'string' ? a.title.slice(0, 300) : '',
    url: typeof a.url === 'string' ? a.url.slice(0, 2000) : '',
    content: typeof a.content === 'string' ? a.content.slice(0, 3000) : '',
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

  try {
    const { articles, allSourceNames } = await req.json();

    if (!Array.isArray(articles) || !articles.length) {
      return new Response(
        JSON.stringify({ error: 'Articles are required' }),
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

    // Sanitize inputs server-side
    const safeArticles = sanitizeArticles(articles);
    const safeSourceNames = sanitizeSourceNames(allSourceNames);

    const articlesSummary = safeArticles.map((a, i) =>
      `[Article ${i + 1}] Source: ${a.sourceName}\nTitle: ${a.title}\nURL: ${a.url}\nContent:\n${a.content}`
    ).join('\n\n---\n\n');

    // Build a map of source to article URLs for reference
    const sourceUrlMap: Record<string, string> = {};
    for (const a of safeArticles) {
      if (!sourceUrlMap[a.sourceName]) {
        sourceUrlMap[a.sourceName] = a.url;
      }
    }

    const systemPrompt = `You are a senior investigative journalist and media critic writing a daily news briefing. Your role is to provide sharp, critical analysis of the day's news across multiple sources.

STYLE GUIDELINES:
- Write in authoritative, journalistic prose — not bullet points
- Be critical and analytical, not neutral — identify biases, omissions, and framing choices
- Compare how different sources cover the same story
- Highlight what's NOT being reported as much as what is
- Use direct quotes sparingly but effectively
- Each theme section should read like a mini-editorial
- ALWAYS include the direct article URL for each source analysis

CRITICAL RULES:
- Identify exactly 12 major themes from the articles provided
- For each theme, analyze coverage from ALL provided sources
- Be skeptical — note contradictions, sensationalism, and potential spin
- Include the articleUrl from the provided articles for each source
- You MUST respond with a valid JSON object using tool calling`;

    const userPrompt = `Analyze the following news articles from the last 24 hours and produce a critical daily news briefing.

${articlesSummary}

Sources to analyze: ${safeSourceNames.join(', ')}

Create a comprehensive report with exactly 12 major themes/stories. For each theme:
1. Write a compelling headline
2. Summarize the story in 2-3 sentences
3. Analyze how each source covered it (stance, quotes, bias indicators)
4. Provide critical commentary on the overall media coverage
5. Rate significance (high/medium/low)

Be critical and insightful. This is investigative journalism, not stenography.`;

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
            name: 'generate_daily_news_report',
            description: 'Generate a critical daily news briefing analyzing themes across sources',
            parameters: {
              type: 'object',
              properties: {
                introduction: { 
                  type: 'string', 
                  description: 'A 2-3 paragraph introduction setting the stage for today\'s news landscape. Journalistic, engaging prose.' 
                },
                themes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      headline: { type: 'string', description: 'Punchy, journalistic headline for this theme' },
                      summary: { type: 'string', description: '2-3 sentence summary of the story' },
                      sourceAnalysis: {
                        type: 'array',
                        items: {
                        type: 'object',
                        properties: {
                          sourceName: { type: 'string' },
                          stance: { type: 'string', description: 'How this source framed/covered the story (1-2 sentences)' },
                          keyQuotes: {
                            type: 'array',
                            items: { type: 'string' },
                            description: '1-2 notable quotes or phrases from this source',
                          },
                          biasIndicators: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Specific examples of bias, framing choices, or omissions',
                          },
                          articleUrl: { type: 'string', description: 'Direct URL to the article from this source' },
                        },
                        required: ['sourceName', 'stance', 'keyQuotes', 'biasIndicators', 'articleUrl'],
                        additionalProperties: false,
                      },
                      },
                      criticalCommentary: { 
                        type: 'string', 
                        description: '2-3 sentences of critical analysis on how this story is being covered overall' 
                      },
                      significance: { 
                        type: 'string', 
                        enum: ['high', 'medium', 'low'],
                        description: 'How significant is this story?' 
                      },
                    },
                    required: ['headline', 'summary', 'sourceAnalysis', 'criticalCommentary', 'significance'],
                    additionalProperties: false,
                  },
                },
                conclusion: { 
                  type: 'string', 
                  description: '1-2 paragraphs summarizing key takeaways and what to watch for' 
                },
              },
              required: ['introduction', 'themes', 'conclusion'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_daily_news_report' } },
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
      title: `News of the Day — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      generatedAt: new Date().toISOString(),
      introduction: parsed.introduction,
      themes: parsed.themes.map((t: any, i: number) => ({
        id: `theme-${i}`,
        ...t,
      })),
      conclusion: parsed.conclusion,
      sourcesAnalyzed: safeSourceNames,
    };

    console.log('Daily news report generated successfully');

    return new Response(
      JSON.stringify({ report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Daily news error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred generating the daily news report' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
