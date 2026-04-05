const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Convert perspective name to a safe JSON key
function toFieldKey(name: string): string {
  return 'ethical_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing API keys' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find due schedules
    const now = new Date();
    const { data: schedules, error: schedErr } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('enabled', true);

    if (schedErr || !schedules?.length) {
      return new Response(
        JSON.stringify({ message: 'No active schedules' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch enabled ethical perspectives once for all schedules
    const { data: ethicalPerspectivesData } = await supabase
      .from('ethical_perspectives')
      .select('id, name, prompt_instruction')
      .eq('enabled', true)
      .order('sort_order', { ascending: true });
    const allEthicalPerspectives = ethicalPerspectivesData || [];

    const results: string[] = [];

    for (const schedule of schedules) {
      // Check if it's time to run
      if (schedule.last_run_at) {
        const lastRun = new Date(schedule.last_run_at);
        const hoursSince = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
        const requiredHours = schedule.frequency === 'immediate' ? 0
          : schedule.frequency === 'hourly' ? 0.9
          : schedule.frequency === 'every_6_hours' ? 5.5
          : schedule.frequency === 'every_12_hours' ? 11.5
          : schedule.frequency === 'daily' ? 23
          : schedule.frequency === 'every_other_day' ? 47
          : 167; // weekly
        if (hoursSince < requiredHours) {
          results.push(`Schedule ${schedule.id}: not due yet`);
          continue;
        }
      }

      // Get source details from DB
      const { data: sources } = await supabase
        .from('news_sources')
        .select('id, name, url')
        .in('id', schedule.source_ids);

      if (!sources?.length) {
        results.push(`Schedule ${schedule.id}: no valid sources`);
        continue;
      }

      // Search articles from each source via Firecrawl
      const allArticles: any[] = [];
      const queries = [
        'latest news today breaking',
        'world politics economy technology health science',
        'aktuelle nachrichten heute eilmeldung',
        'welt politik wirtschaft technologie gesundheit wissenschaft',
      ];

      const fetchTasks: { source: typeof sources[0]; query: string; perQuery: number }[] = [];
      for (const source of sources) {
        const perQuery = Math.max(3, Math.ceil(schedule.articles_per_source / queries.length));
        for (const q of queries) {
          fetchTasks.push({ source, query: q, perQuery });
        }
      }

      const fetchResults = await Promise.allSettled(fetchTasks.map(async (task) => {
        let sourceUrl = task.source.url.trim();
        if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
          sourceUrl = `https://${sourceUrl}`;
        }
        let hostname: string;
        try {
          hostname = new URL(sourceUrl).hostname;
        } catch {
          return [];
        }

        const searchQuery = `${task.query} site:${hostname}`;
        const resp = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: task.perQuery,
            tbs: 'qdr:d',
          }),
        });

        if (!resp.ok) return [];
        const data = await resp.json();
        if (!data.success || !Array.isArray(data.data)) return [];
        return data.data.map((item: any) => ({
          sourceName: task.source.name,
          title: item.title || 'Untitled',
          url: item.url,
          content: (item.markdown || item.description || '').slice(0, 3000),
        }));
      }));

      for (const fetchResult of fetchResults) {
        if (fetchResult.status === 'fulfilled' && Array.isArray(fetchResult.value)) {
          allArticles.push(...fetchResult.value);
        }
      }

      // Deduplicate by URL
      const seenUrls = new Set<string>();
      const dedupedArticles = allArticles.filter(a => {
        if (!a.url || seenUrls.has(a.url)) return false;
        seenUrls.add(a.url);
        return true;
      });

      for (let i = dedupedArticles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dedupedArticles[i], dedupedArticles[j]] = [dedupedArticles[j], dedupedArticles[i]];
      }

      if (dedupedArticles.length === 0) {
        results.push(`Schedule ${schedule.id}: no articles found`);
        continue;
      }

      console.log(`Schedule ${schedule.id}: ${dedupedArticles.length} unique articles from ${sources.length} sources`);

      // Round-robin balance
      const bySource: Record<string, any[]> = {};
      for (const a of dedupedArticles) {
        if (!bySource[a.sourceName]) bySource[a.sourceName] = [];
        bySource[a.sourceName].push(a);
      }
      const sourceNames = Object.keys(bySource);
      const maxTotal = schedule.max_articles || 80;
      const perSource = Math.max(1, Math.floor(maxTotal / sourceNames.length));
      const balanced: any[] = [];
      for (const src of sourceNames) balanced.push(...bySource[src].slice(0, perSource));
      if (balanced.length < maxTotal) {
        for (const src of sourceNames) {
          for (const a of bySource[src].slice(perSource)) {
            if (balanced.length >= maxTotal) break;
            balanced.push(a);
          }
          if (balanced.length >= maxTotal) break;
        }
      }

      const totalRequested = schedule.articles_per_source * sources.length;
      const themeCount = Math.min(20, Math.max(5, Math.round(totalRequested / 4)));

      const articlesSummary = balanced.map((a: any, i: number) =>
        `[Article ${i + 1}] Source: ${a.sourceName}\nTitle: ${a.title}\nURL: ${a.url}\nContent:\n${a.content}`
      ).join('\n\n---\n\n');

      // Generate reports in BOTH languages
      const languages = [
        { code: 'en', outputLang: 'English', titlePrefix: 'News of the Day', dateLocale: 'en-GB' },
        { code: 'de', outputLang: 'German', titlePrefix: 'Nachrichten des Tages', dateLocale: 'de-DE' },
      ];

      const mondcivitanEnabled = schedule.mondcivitan_enabled === true;
      const schweitzerEnabled = schedule.schweitzer_enabled === true;
      const ethicalPerspectives = schweitzerEnabled ? allEthicalPerspectives : [];

      const mondcivitanInstruction = mondcivitanEnabled ? `

MONDCIVITAN REFLECTION: For EACH theme, write a "mondcivitanReflection" — a thoughtful paragraph reflecting on the news through the Mondcivitan Republic principles (constituted 1953 by Hugh J. Schonfield et al., embodying the International Arbitration League of Nobel laureate Sir William Randal Cremer, influential on John Lennon's "Imagine"). The seven principles: No-one is an Enemy, No-one is a Foreigner, Service to All, Complete Impartiality, Work for Peace, True Democracy, Equity and Justice. Apply these to analyse how each story could be approached differently.` : '';

      const generateForLang = async (lang: typeof languages[0]) => {
        // Build ethical instruction dynamically
        let ethicalInstruction = '';
        if (ethicalPerspectives.length > 0) {
          ethicalInstruction = `\n\nETHICAL CONSIDERATIONS: At the END of the report, write SEPARATE ethical consideration fields for EACH of the following thinkers/traditions (2-3 paragraphs each, in ${lang.outputLang}):\n\n`;
          ethicalPerspectives.forEach((p, i) => {
            const key = toFieldKey(p.name);
            ethicalInstruction += `${i + 1}. "${key}" — ${p.prompt_instruction}\n\n`;
          });
        }

        // Build ethical tool schema properties dynamically
        const ethicalProperties: Record<string, any> = {};
        const ethicalRequired: string[] = [];
        for (const p of ethicalPerspectives) {
          const key = toFieldKey(p.name);
          ethicalProperties[key] = { type: 'string', description: `${p.name} — ethical analysis` };
          ethicalRequired.push(key);
        }

        const systemPrompt = `You are a senior investigative journalist and media critic writing a daily news briefing. Your role is to provide sharp, critical analysis of the day's news across multiple sources.

LANGUAGE: You MUST write the ENTIRE report in ${lang.outputLang}. Every single word of headlines, summaries, commentary, analysis, and conclusions must be in ${lang.outputLang}. The ONLY exceptions are source names and URLs which remain as-is.

CRITICAL RULES:
- Identify exactly ${themeCount} major themes from the articles provided — ensure DIVERSITY of topics
- For EVERY theme, include source analysis from AS MANY different sources as possible (3-5+ per theme)
- If source material is in another language, you MUST translate it into ${lang.outputLang}
- Be skeptical — note contradictions, sensationalism, and potential spin
- Include the articleUrl from the provided articles for each source
- Do NOT mention interactive features
- You MUST respond with a valid JSON object using tool calling${mondcivitanInstruction}${ethicalInstruction}`;

        const todayUTC = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
        const userPrompt = `TODAY'S DATE IS: ${todayUTC} (UTC). Use this exact date when referring to today in your report. Do NOT guess or use a different date.\n\nAnalyze these articles and produce a critical daily news briefing. ALL output text MUST be in ${lang.outputLang}.${mondcivitanEnabled ? ' Include a Mondcivitan Reflection for each theme.' : ''}${ethicalPerspectives.length > 0 ? ` Include ethical considerations from ${ethicalPerspectives.length} perspectives at the end.` : ''}\n\n${articlesSummary}\n\nSources: ${sourceNames.join(', ')}\n\nCreate ${themeCount} diverse themes. Translate any non-${lang.outputLang} content.`;

        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                description: 'Generate a daily news briefing',
                parameters: {
                  type: 'object',
                  properties: {
                    introduction: { type: 'string' },
                    themes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          headline: { type: 'string' },
                          summary: { type: 'string' },
                          sourceAnalysis: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                sourceName: { type: 'string' },
                                stance: { type: 'string' },
                                keyQuotes: { type: 'array', items: { type: 'string' } },
                                biasIndicators: { type: 'array', items: { type: 'string' } },
                                articleUrl: { type: 'string' },
                              },
                              required: ['sourceName', 'stance', 'keyQuotes', 'biasIndicators', 'articleUrl'],
                            },
                          },
                          criticalCommentary: { type: 'string' },
                          ...(mondcivitanEnabled ? {
                            mondcivitanReflection: {
                              type: 'string',
                              description: 'Reflection through Mondcivitan Republic principles.',
                            },
                          } : {}),
                          significance: { type: 'string', enum: ['high', 'medium', 'low'] },
                        },
                        required: ['headline', 'summary', 'sourceAnalysis', 'criticalCommentary', 'significance', ...(mondcivitanEnabled ? ['mondcivitanReflection'] : [])],
                      },
                    },
                    conclusion: { type: 'string' },
                    ...ethicalProperties,
                  },
                  required: ['introduction', 'themes', 'conclusion', ...ethicalRequired],
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'generate_daily_news_report' } },
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text().catch(() => 'no body');
          console.error(`Schedule ${schedule.id}: AI failed for ${lang.code} (${aiResp.status}): ${errText}`);
          return;
        }

        const aiText = await aiResp.text();
        let aiData: any;
        try {
          aiData = JSON.parse(aiText);
        } catch (parseErr) {
          console.error(`Schedule ${schedule.id}: Failed to parse AI response for ${lang.code}, length=${aiText.length}`);
          return;
        }

        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) {
          console.error(`Schedule ${schedule.id}: no structured response for ${lang.code}`, JSON.stringify(aiData).slice(0, 500));
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(toolCall.function.arguments);
        } catch {
          console.error(`Schedule ${schedule.id}: Failed to parse tool_call arguments for ${lang.code}`);
          return;
        }

        // Build ethical considerations array dynamically
        const ethicalConsiderations: any[] = [];
        const legacyFields: Record<string, any> = {};
        for (const p of ethicalPerspectives) {
          const key = toFieldKey(p.name);
          if (parsed[key]) {
            ethicalConsiderations.push({ id: p.id, name: p.name, content: parsed[key] });
            legacyFields[key] = parsed[key];
          }
        }

        const report = {
          title: `${lang.titlePrefix} — ${now.toLocaleDateString(lang.dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} (UTC)`,
          generatedAt: now.toISOString(),
          language: lang.code,
          introduction: parsed.introduction,
          themes: parsed.themes.map((t: any, i: number) => ({ id: `theme-${i}`, ...t })),
          conclusion: parsed.conclusion,
          ...(ethicalConsiderations.length > 0 ? { ethicalConsiderations } : {}),
          ...legacyFields,
          sourcesAnalyzed: sourceNames,
        };

        const { error: insertErr } = await supabase.from('generated_reports').insert({
          schedule_id: schedule.id,
          title: report.title,
          report_data: report,
        });

        if (insertErr) {
          console.error(`Failed to store ${lang.code} report:`, insertErr);
        } else {
          console.log(`Schedule ${schedule.id}: ${lang.code} report stored`);
        }
      };

      // Run both languages in parallel
      await Promise.allSettled(languages.map(lang => generateForLang(lang)));

      // Update last_run_at
      await supabase
        .from('report_schedules')
        .update({ last_run_at: now.toISOString() })
        .eq('id', schedule.id);

      results.push(`Schedule ${schedule.id}: reports generated in EN+DE`);
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scheduled report error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate scheduled reports' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
