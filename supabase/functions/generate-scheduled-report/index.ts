const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const results: string[] = [];

    for (const schedule of schedules) {
      // Check if it's time to run
      if (schedule.last_run_at) {
        const lastRun = new Date(schedule.last_run_at);
        const hoursSince = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
        const requiredHours = schedule.frequency === 'hourly' ? 0.9
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

      // Search articles from each source via Firecrawl (parallelized)
      const allArticles: any[] = [];
      // Use 2 broad queries with higher limits to reduce API calls
      const queries = [
        'latest news today breaking',
        'world politics economy technology health science',
      ];

      // Build all fetch tasks upfront
      const fetchTasks: { source: typeof sources[0]; query: string; perQuery: number }[] = [];
      for (const source of sources) {
        const perQuery = Math.max(3, Math.ceil(schedule.articles_per_source / queries.length));
        for (const q of queries) {
          fetchTasks.push({ source, query: q, perQuery });
        }
      }

      // Run ALL fetch tasks in parallel (no batching - search without scrape is fast)
      const results = await Promise.allSettled(fetchTasks.map(async (task) => {
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

      for (const result of results) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allArticles.push(...result.value);
        }
      }

      // Deduplicate by URL
      const seenUrls = new Set<string>();
      const dedupedArticles = allArticles.filter(a => {
        if (!a.url || seenUrls.has(a.url)) return false;
        seenUrls.add(a.url);
        return true;
      });

      if (dedupedArticles.length === 0) {
        results.push(`Schedule ${schedule.id}: no articles found`);
        continue;
      }

      console.log(`Schedule ${schedule.id}: ${dedupedArticles.length} unique articles from ${sources.length} sources`);

      // Round-robin balance articles across sources
      const bySource: Record<string, any[]> = {};
      for (const a of dedupedArticles) {
        if (!bySource[a.sourceName]) bySource[a.sourceName] = [];
        bySource[a.sourceName].push(a);
      }
      const sourceNames = Object.keys(bySource);
      const maxTotal = 250;
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

      // Call daily-news analysis via AI
      const articlesSummary = balanced.map((a: any, i: number) =>
        `[Article ${i + 1}] Source: ${a.sourceName}\nTitle: ${a.title}\nURL: ${a.url}\nContent:\n${a.content}`
      ).join('\n\n---\n\n');

      const systemPrompt = `You are a senior investigative journalist and media critic writing a daily news briefing. Your role is to provide sharp, critical analysis of the day's news across multiple sources.

CRITICAL RULES:
- Identify exactly ${themeCount} major themes from the articles provided — ensure DIVERSITY of topics
- For EVERY theme, you MUST include source analysis entries from AS MANY different sources as possible — ideally ALL sources that covered the topic. Aim for at least 3-5 source citations per theme, more when available. Never limit yourself to just 1-2 sources per theme.
- Scan ALL provided articles thoroughly for each theme — if multiple sources covered a story, include ALL of them
- Be skeptical — note contradictions, sensationalism, and potential spin
- Include the articleUrl from the provided articles for each source
- Do NOT mention or reference any interactive features such as commenting, sharing, liking, user accounts, or any platform functionality
- You MUST respond with a valid JSON object using tool calling`;

      const userPrompt = `Analyze these articles and produce a critical daily news briefing.\n\n${articlesSummary}\n\nSources: ${sourceNames.join(', ')}\n\nCreate ${themeCount} diverse themes.`;

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
                        significance: { type: 'string', enum: ['high', 'medium', 'low'] },
                      },
                      required: ['headline', 'summary', 'sourceAnalysis', 'criticalCommentary', 'significance'],
                    },
                  },
                  conclusion: { type: 'string' },
                },
                required: ['introduction', 'themes', 'conclusion'],
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'generate_daily_news_report' } },
        }),
      });

      if (!aiResp.ok) {
        results.push(`Schedule ${schedule.id}: AI analysis failed (${aiResp.status})`);
        continue;
      }

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        results.push(`Schedule ${schedule.id}: no structured response from AI`);
        continue;
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      const report = {
        title: `News of the Day — ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        generatedAt: now.toISOString(),
        introduction: parsed.introduction,
        themes: parsed.themes.map((t: any, i: number) => ({ id: `theme-${i}`, ...t })),
        conclusion: parsed.conclusion,
        sourcesAnalyzed: sourceNames,
      };

      // Store the report
      const { error: insertErr } = await supabase.from('generated_reports').insert({
        schedule_id: schedule.id,
        title: report.title,
        report_data: report,
      });

      if (insertErr) {
        console.error('Failed to store report:', insertErr);
        results.push(`Schedule ${schedule.id}: failed to store report`);
        continue;
      }

      // Update last_run_at
      await supabase
        .from('report_schedules')
        .update({ last_run_at: now.toISOString() })
        .eq('id', schedule.id);

      results.push(`Schedule ${schedule.id}: report generated successfully`);
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
