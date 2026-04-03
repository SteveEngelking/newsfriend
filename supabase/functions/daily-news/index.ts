const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiter per IP
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

function sanitizeArticles(articles: any[], maxTotal = 150): any[] {
  const shuffled = [...articles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const bySource: Record<string, any[]> = {};
  for (const a of shuffled) {
    const src = typeof a.sourceName === 'string' ? a.sourceName : 'Unknown';
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(a);
  }

  const sourceNames = Object.keys(bySource);
  const perSource = Math.max(1, Math.floor(maxTotal / sourceNames.length));
  const balanced: any[] = [];

  for (const src of sourceNames) {
    balanced.push(...bySource[src].slice(0, perSource));
  }

  if (balanced.length < maxTotal) {
    for (const src of sourceNames) {
      const remaining = bySource[src].slice(perSource);
      for (const a of remaining) {
        if (balanced.length >= maxTotal) break;
        balanced.push(a);
      }
      if (balanced.length >= maxTotal) break;
    }
  }

  return balanced.map((a: any) => ({
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

  const ip = getClientIP(req);
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { articles, allSourceNames, totalArticlesRequested, language, mondcivitanEnabled, schweitzerEnabled } = await req.json();
    const normalizedLanguage = typeof language === 'string' && language.toLowerCase().startsWith('de') ? 'de' : 'en';
    const themeCount = Math.min(20, Math.max(5, Math.round((totalArticlesRequested || articles.length) / 4)));
    const outputLang = normalizedLanguage === 'de' ? 'German' : 'English';

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

    const safeArticles = sanitizeArticles(articles);
    const safeSourceNames = sanitizeSourceNames(allSourceNames);

    const articlesSummary = safeArticles.map((a, i) =>
      `[Article ${i + 1}] Source: ${a.sourceName}\nTitle: ${a.title}\nURL: ${a.url}\nContent:\n${a.content}`
    ).join('\n\n---\n\n');

    const mondcivitanInstruction = mondcivitanEnabled ? `

MONDCIVITAN REFLECTION: For EACH theme, you MUST also write a "mondcivitanReflection" — a thoughtful paragraph reflecting on the news story through the lens of the Mondcivitan Republic principles. The Mondcivitan Republic was constituted in 1953 without territory on the initiative of Hugh J. Schonfield and others, later embodying the International Arbitration League founded by Nobel Peace Prize winner Sir William Randal Cremer. Its aim was to create an international servant nation as spokesman for mankind. It was a considerable influence on John Lennon, and its ideas are embodied in his song "Imagine".

The seven principles are: No-one is an Enemy, No-one is a Foreigner, Service to All, Complete Impartiality, Work for Peace, True Democracy, Equity and Justice.

Apply these principles to analyse how each news story could be approached differently if nations and leaders followed these ideals. Be specific about which principles are relevant to each story.` : '';

    const ethicalInstruction = schweitzerEnabled ? `

ETHICAL CONSIDERATIONS: At the END of the report, write SEPARATE ethical consideration fields for EACH of the following thinkers/traditions. Each should be 2-3 substantive paragraphs examining the day's news through that ethical lens. Write ALL in ${outputLang}.

1. "schweitzerEthical" — Albert Schweitzer's "Reverence for Life" philosophy: every living being has intrinsic worth, personal responsibility, compassion over ideology, service to others, ethical consistency.

2. "ethicalJesus" — Jesus of Nazareth: love thy neighbour, the Golden Rule, forgiveness, care for the poor and marginalised, peace-making, speaking truth to power, mercy over judgement.

3. "ethicalCovey" — Stephen R. Covey (The 7 Habits of Highly Effective People): be proactive, begin with the end in mind, put first things first, think win-win, seek first to understand then to be understood, synergise, sharpen the saw. Apply these principles to global events and leadership.

4. "ethicalGandhi" — Mahatma Gandhi: non-violence (ahimsa), truth (satya), self-discipline, service to others, civil disobedience against injustice, be the change you wish to see, strength through moral courage.

5. "ethicalBuddha" — Buddha: the Four Noble Truths, the Eightfold Path, compassion (karuna), loving-kindness (metta), non-attachment, mindfulness, the interdependence of all beings, the Middle Way.

6. "ethicalMohammed" — Prophet Mohammed: justice and equity, mercy and compassion, care for the vulnerable, seeking knowledge, community solidarity (ummah), moderation, stewardship of the earth.

7. "ethicalTorah" — Torah: justice (tzedek), loving-kindness (chesed), repair of the world (tikkun olam), sanctity of life, obligation to the stranger, truthfulness, communal responsibility.

8. "ethicalOshi" — Oshi (Shinto traditions): reverence for nature and kami, purity of heart and action, harmony with the natural world, gratitude, communal bonds, sincerity, respect for ancestors and tradition.

9. "ethicalRajneesh" — Bhagwan Shree Rajneesh (Osho): awareness and consciousness, living in the present moment, freedom from conditioning, celebrating life, meditation as transformation, courage to be authentic, love without attachment.

10. "ethicalGita" — Bhagavad Gita: dharma (righteous duty), selfless action (nishkama karma), equanimity in success and failure, devotion and surrender, the eternal soul beyond material concerns, courage in the face of moral dilemmas, unity of all existence.` : '';

    const systemPrompt = `You are a senior investigative journalist and media critic writing a daily news briefing. Your role is to provide sharp, critical analysis of the day's news across multiple sources.

LANGUAGE: You MUST write the ENTIRE report in ${outputLang}. All headlines, summaries, commentary, and analysis must be in ${outputLang}. Source names and URLs remain as-is.

STYLE GUIDELINES:
- Write in authoritative, journalistic prose — not bullet points
- Be critical and analytical, not neutral — identify biases, omissions, and framing choices
- Compare how different sources cover the same story
- Highlight what's NOT being reported as much as what is
- Use direct quotes sparingly but effectively
- Each theme section should read like a mini-editorial
- ALWAYS include the direct article URL for each source analysis

CRITICAL RULES:
- Identify exactly ${themeCount} major themes from the articles provided — ensure DIVERSITY of topics
- For EVERY theme, you MUST include source analysis entries from AS MANY different sources as possible — ideally ALL sources that covered the topic. Aim for at least 3-5 source citations per theme, more when available. Never limit yourself to just 1-2 sources per theme.
- Scan ALL provided articles thoroughly for each theme — if multiple sources covered a story, include ALL of them
- Be skeptical — note contradictions, sensationalism, and potential spin
- Include the articleUrl from the provided articles for each source
- Do NOT mention or reference any interactive features such as commenting, sharing, liking, user accounts, or any platform functionality. This is a static read-only report.
- You MUST respond with a valid JSON object using tool calling${mondcivitanInstruction}${ethicalInstruction}`;

    const todayUTC = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

    const userPrompt = `TODAY'S DATE IS: ${todayUTC} (UTC). Use this exact date when referring to today in your report. Do NOT guess or use a different date.

Analyze the following news articles from the last 24 hours and produce a critical daily news briefing in ${outputLang}.

${articlesSummary}

Sources to analyze: ${safeSourceNames.join(', ')}

Create a comprehensive report with exactly ${themeCount} major themes/stories covering DIVERSE topics. For each theme:
1. Write a compelling headline in ${outputLang}
2. Summarize the story in 2-3 sentences in ${outputLang}
3. Analyze how each source covered it (stance, quotes, bias indicators) in ${outputLang}
4. Provide critical commentary on the overall media coverage in ${outputLang}
5. Rate significance (high/medium/low)
${mondcivitanEnabled ? `6. Write a Mondcivitan Reflection paragraph applying the seven principles to this story in ${outputLang}` : ''}
${schweitzerEnabled ? `${mondcivitanEnabled ? '7' : '6'}. At the end, write ethical considerations from eight different perspectives (Schweitzer, Jesus, Covey, Gandhi, Buddha, Mohammed, Torah, Oshi) in ${outputLang}` : ''}

If source material is written in another language, translate and rewrite all output into ${outputLang}.

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
                  description: 'A 2-3 paragraph introduction setting the stage for today\'s news landscape.' 
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
                      ...(mondcivitanEnabled ? {
                        mondcivitanReflection: {
                          type: 'string',
                          description: 'A thoughtful paragraph reflecting on this news story through the Mondcivitan Republic principles: No-one is an Enemy, No-one is a Foreigner, Service to All, Complete Impartiality, Work for Peace, True Democracy, Equity and Justice.',
                        },
                      } : {}),
                      significance: { 
                        type: 'string', 
                        enum: ['high', 'medium', 'low'],
                        description: 'How significant is this story?' 
                      },
                    },
                    required: ['headline', 'summary', 'sourceAnalysis', 'criticalCommentary', 'significance', ...(mondcivitanEnabled ? ['mondcivitanReflection'] : [])],
                    additionalProperties: false,
                  },
                },
                conclusion: { 
                  type: 'string', 
                  description: '1-2 paragraphs summarizing key takeaways and what to watch for' 
                },
                ...(schweitzerEnabled ? {
                  schweitzerEthical: { type: 'string', description: 'Albert Schweitzer — Reverence for Life ethical analysis.' },
                  ethicalJesus: { type: 'string', description: 'Jesus of Nazareth — love, forgiveness, Golden Rule ethical analysis.' },
                  ethicalCovey: { type: 'string', description: 'Stephen R. Covey — 7 Habits principles applied to global events.' },
                  ethicalGandhi: { type: 'string', description: 'Mahatma Gandhi — non-violence, truth, moral courage analysis.' },
                  ethicalBuddha: { type: 'string', description: 'Buddha — compassion, mindfulness, interdependence analysis.' },
                  ethicalMohammed: { type: 'string', description: 'Prophet Mohammed — justice, mercy, community solidarity analysis.' },
                  ethicalTorah: { type: 'string', description: 'Torah — justice, tikkun olam, loving-kindness analysis.' },
                  ethicalOshi: { type: 'string', description: 'Oshi/Shinto — reverence for nature, harmony, purity analysis.' },
                } : {}),
              },
              required: ['introduction', 'themes', 'conclusion', ...(schweitzerEnabled ? ['schweitzerEthical', 'ethicalJesus', 'ethicalCovey', 'ethicalGandhi', 'ethicalBuddha', 'ethicalMohammed', 'ethicalTorah', 'ethicalOshi'] : [])],
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

    const aiText = await response.text();
    let aiData: any;
    try {
      aiData = JSON.parse(aiText);
    } catch {
      console.error('Failed to parse AI response, length=', aiText.length);
      return new Response(
        JSON.stringify({ error: 'AI returned invalid JSON' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response:', JSON.stringify(aiData).slice(0, 500));
      return new Response(
        JSON.stringify({ error: 'AI did not return structured data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error('Failed to parse tool_call arguments');
      return new Response(
        JSON.stringify({ error: 'AI returned malformed arguments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dateLocale = normalizedLanguage === 'de' ? 'de-DE' : 'en-GB';
    const titlePrefix = normalizedLanguage === 'de' ? 'Nachrichten des Tages' : 'News of the Day';
    const report = {
      title: `${titlePrefix} — ${new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} (UTC)`,
      generatedAt: new Date().toISOString(),
      language: normalizedLanguage,
      introduction: parsed.introduction,
      themes: parsed.themes.map((t: any, i: number) => ({
        id: `theme-${i}`,
        ...t,
      })),
      conclusion: parsed.conclusion,
      ...(parsed.schweitzerEthical ? { schweitzerEthical: parsed.schweitzerEthical } : {}),
      ...(parsed.ethicalJesus ? { ethicalJesus: parsed.ethicalJesus } : {}),
      ...(parsed.ethicalCovey ? { ethicalCovey: parsed.ethicalCovey } : {}),
      ...(parsed.ethicalGandhi ? { ethicalGandhi: parsed.ethicalGandhi } : {}),
      ...(parsed.ethicalBuddha ? { ethicalBuddha: parsed.ethicalBuddha } : {}),
      ...(parsed.ethicalMohammed ? { ethicalMohammed: parsed.ethicalMohammed } : {}),
      ...(parsed.ethicalTorah ? { ethicalTorah: parsed.ethicalTorah } : {}),
      ...(parsed.ethicalOshi ? { ethicalOshi: parsed.ethicalOshi } : {}),
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
