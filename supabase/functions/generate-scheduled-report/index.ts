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
    const requestBody = await req.json().catch(() => null);
    const manualScheduleId = typeof requestBody?.scheduleId === 'string' ? requestBody.scheduleId : null;
    const forceImmediate = requestBody?.forceImmediate === true;
    const requestedLanguages = Array.isArray(requestBody?.languages)
      ? requestBody.languages.filter((value: unknown): value is 'en' | 'de' => value === 'en' || value === 'de')
      : [];

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
    const currentHour = now.getUTCHours();
    let schedulesQuery = supabase
      .from('report_schedules')
      .select('*')
      .eq('enabled', true);

    if (manualScheduleId) {
      schedulesQuery = schedulesQuery.eq('id', manualScheduleId);
    }

    const { data: schedules, error: schedErr } = await schedulesQuery;

    if (schedErr || !schedules?.length) {
      return new Response(
        JSON.stringify({ message: 'No active schedules' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which languages are due for each schedule based on frequency + time-of-day
    // EN triggers at specific hours, DE triggers 1 hour later
    function getLanguagesDue(schedule: any): { code: string; outputLang: string; titlePrefix: string; dateLocale: string }[] {
      if (forceImmediate) {
        const codes = requestedLanguages.length > 0 ? requestedLanguages : ['en', 'de'];
        return codes.map((code) => code === 'de'
          ? { code: 'de', outputLang: 'German', titlePrefix: 'Nachrichten des Tages', dateLocale: 'de-DE' }
          : { code: 'en', outputLang: 'English', titlePrefix: 'News of the Day', dateLocale: 'en-GB' });
      }

      const freq = schedule.frequency;
      if (freq === 'immediate') {
        // Immediate: run both languages now, but only if not already run
        if (schedule.last_run_at) return [];
        return [
          { code: 'en', outputLang: 'English', titlePrefix: 'News of the Day', dateLocale: 'en-GB' },
          { code: 'de', outputLang: 'German', titlePrefix: 'Nachrichten des Tages', dateLocale: 'de-DE' },
        ];
      }

      // Trigger hours: daily = [6], twice_daily = [6, 18]
      const enHours = freq === 'twice_daily' ? [6, 18] : [6];
      const deHours = enHours.map(h => h + 1); // DE is 1 hour later

      const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
      const hoursSinceLastRun = lastRun ? (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60) : 999;
      // Minimum gap to prevent double-firing (must be at least 2 hours since last run)
      if (hoursSinceLastRun < 2) return [];

      const due: { code: string; outputLang: string; titlePrefix: string; dateLocale: string }[] = [];

      if (enHours.includes(currentHour)) {
        due.push({ code: 'en', outputLang: 'English', titlePrefix: 'News of the Day', dateLocale: 'en-GB' });
      }
      if (deHours.includes(currentHour)) {
        due.push({ code: 'de', outputLang: 'German', titlePrefix: 'Nachrichten des Tages', dateLocale: 'de-DE' });
    }


      return due;
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
      // Use new time-of-day trigger logic
      const languagesDue = getLanguagesDue(schedule);
      if (languagesDue.length === 0) {
        results.push(`Schedule ${schedule.id}: not due yet`);
        continue;
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

      const isImmediateRun = schedule.frequency === 'immediate';
      const themeCountEarly = (schedule.target_themes && schedule.target_themes >= 4 && schedule.target_themes <= 20)
        ? schedule.target_themes : 8;
      const isHighThemes = themeCountEarly > 10;

      // Search articles from each source via Firecrawl
      const allArticles: any[] = [];
      // For high theme counts, use more diverse queries but fewer results each
      const queries = isHighThemes ? [
        'latest news today breaking',
        'world politics economy technology',
        'health science environment culture',
        'aktuelle nachrichten heute eilmeldung',
        'welt politik wirtschaft technologie',
        'gesundheit wissenschaft umwelt kultur',
      ] : [
        'latest news today breaking',
        'world politics economy technology health science',
        'aktuelle nachrichten heute eilmeldung',
        'welt politik wirtschaft technologie gesundheit wissenschaft',
      ];

      const fetchTasks: { source: typeof sources[0]; query: string; perQuery: number }[] = [];
      for (const source of sources) {
        const perQuery = Math.max(2, Math.ceil(schedule.articles_per_source / queries.length));
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
          content: (item.markdown || item.description || '').slice(0, isHighThemes ? 320 : (isImmediateRun ? 320 : 500)),
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
      const maxTotal = isHighThemes ? Math.min(schedule.max_articles || 80, 60) : (isImmediateRun ? Math.min(schedule.max_articles || 80, 48) : (schedule.max_articles || 80));
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

      const preferredLanguage = schedule.language === 'de' ? 'de' : 'en';
      const themeCount = (schedule.target_themes && schedule.target_themes >= 4 && schedule.target_themes <= 20)
        ? schedule.target_themes
        : Math.min(8, Math.max(4, Math.round(balanced.length / 6)));
      const sourcesPerTheme = Math.min(3, Math.max(2, Math.ceil(sourceNames.length / Math.max(themeCount * 3, 1))));

      const articlesSummary = balanced.map((a: any, i: number) =>
        `<article index="${i + 1}" source="${a.sourceName}">\n<title>${a.title}</title>\n<url>${a.url}</url>\n<content>${a.content}</content>\n</article>`
      ).join('\n\n');

      // Use languages determined by the time-of-day trigger
      const languages = languagesDue;

      const mondcivitanEnabled = schedule.mondcivitan_enabled === true;
      const schweitzerEnabled = schedule.schweitzer_enabled === true;
      const ethicalPerspectives = schweitzerEnabled ? allEthicalPerspectives : [];
      const prioritizedEthicalPerspectives = ethicalPerspectives;

      const mondcivitanInstruction = mondcivitanEnabled ? `

MONDCIVITAN REFLECTION: For EACH theme, write a "mondcivitanReflection" — a thoughtful paragraph reflecting on the news through the Mondcivitan Republic principles (constituted 1953 by Hugh J. Schonfield et al., embodying the International Arbitration League of Nobel laureate Sir William Randal Cremer, influential on John Lennon's "Imagine"). The seven principles: No-one is an Enemy, No-one is a Foreigner, Service to All, Complete Impartiality, Work for Peace, True Democracy, Equity and Justice. Apply these to analyse how each story could be approached differently.` : '';

      const generatedLanguages: string[] = [];

      // Helper: make a single AI call for N themes
      const callAI = async (lang: typeof languages[0], batchThemeCount: number, batchArticles: string, batchLabel: string, includeEthical: boolean) => {
        const ethicalInstruction = includeEthical && prioritizedEthicalPerspectives.length > 0
          ? `\n\nETHICAL CONSIDERATIONS: Write a thoughtful, detailed paragraph (at least 4-6 sentences) for EACH perspective below. Provide genuine philosophical depth, not brief summaries:\n${prioritizedEthicalPerspectives.map((p, i) => `${i+1}. "${toFieldKey(p.name)}" — ${p.prompt_instruction}`).join('\n')}`
          : '';
        const ethicalProperties: Record<string, any> = {};
        const ethicalRequired: string[] = [];
        if (includeEthical) {
          for (const p of prioritizedEthicalPerspectives) {
            const key = toFieldKey(p.name);
            ethicalProperties[key] = { type: 'string', description: `${p.name} — ethical analysis` };
            ethicalRequired.push(key);
          }
        }

        const styleInstructions: Record<string, string> = {
          newspaper: 'WRITING STYLE: Write in a formal newspaper editorial style — authoritative, measured tone. Use proper journalistic structure with inverted pyramid. Maintain objectivity while offering sharp analysis.',
          brief: 'WRITING STYLE: Write in an executive briefing style — concise, bullet-point-friendly, action-oriented. Prioritize key facts and implications. Keep summaries tight and commentary focused.',
          analytical: 'WRITING STYLE: Write in a detailed analytical style — thorough examination of causes, context, and consequences. Draw connections between events. Provide in-depth critical analysis.',
          conversational: 'WRITING STYLE: Write in a conversational, accessible blog style — engaging, relatable tone. Explain complex topics simply. Use rhetorical questions and vivid examples to draw readers in.',
          philosophical: 'WRITING STYLE: Write in a philosophical, reflective style — explore deeper meaning, ethical dimensions, and historical parallels. Question assumptions. Consider multiple philosophical frameworks and their implications for humanity.',
        };
        const reportStyle = schedule.report_style || 'analytical';
        const styleInstruction = styleInstructions[reportStyle] || styleInstructions.analytical;

        const sysPrompt = `You are a senior investigative journalist writing a daily news briefing in ${lang.outputLang}. ALL report content MUST be in ${lang.outputLang}.
${styleInstruction}
CRITICAL TRANSLATION RULE — ABSOLUTE, NO EXCEPTIONS: Translate every narrative field into ${lang.outputLang}, including quotes, bias indicators, stance, summary, introduction, conclusion, critical commentary, and reflections. HOWEVER, source/publication names in sourceName MUST stay exactly as provided in the source list, in their original language and spelling. URLs must also remain unchanged. When a source article is in another language, translate the content but preserve the original source name exactly.
RULES: Identify exactly ${batchThemeCount} diverse themes. Include 2 source analyses per theme. Only CURRENT news from today/last 24h. Be skeptical. Include articleUrl. Use only these exact sourceName values when citing publications: ${sourceNames.join(', ')}. Respond via tool calling. IMPORTANT: In the introduction, do NOT mention the number of themes or topics covered — write a natural editorial introduction.${mondcivitanEnabled ? '\nInclude a detailed mondcivitanReflection paragraph per theme applying Mondcivitan Republic principles thoughtfully.' : ''}${ethicalInstruction}`;

        const todayUTC = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
        const userMsg = `DATE: ${todayUTC} (UTC). ${batchLabel}. Create exactly ${batchThemeCount} themes in ${lang.outputLang}.\n\n${batchArticles}\n\nSources: ${sourceNames.join(', ')}`;

        console.log(`Schedule ${schedule.id}: AI call for ${batchThemeCount} themes (${batchLabel})`);
        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: schedule.ai_model || 'openai/gpt-5-mini',
            max_completion_tokens: 16384,
            messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userMsg }],
            tools: [{
              type: 'function',
              function: {
                name: 'generate_themes',
                description: 'Generate news themes',
                parameters: {
                  type: 'object',
                  properties: {
                    ...(includeEthical ? { introduction: { type: 'string' } } : {}),
                    themes: {
                      type: 'array', minItems: batchThemeCount, maxItems: batchThemeCount,
                      items: {
                        type: 'object',
                        properties: {
                          headline: { type: 'string' },
                          summary: { type: 'string' },
                          sourceAnalysis: {
                            type: 'array', minItems: 2, maxItems: 2,
                            items: {
                              type: 'object',
                              properties: {
                                sourceName: { type: 'string', description: `Must exactly match one of these original publication names: ${sourceNames.join(', ')}` }, stance: { type: 'string' },
                                keyQuotes: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 1 },
                                biasIndicators: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 1 },
                                articleUrl: { type: 'string' },
                              },
                              required: ['sourceName', 'stance', 'keyQuotes', 'biasIndicators', 'articleUrl'],
                            },
                          },
                          criticalCommentary: { type: 'string' },
                          ...(mondcivitanEnabled ? { mondcivitanReflection: { type: 'string' } } : {}),
                          significance: { type: 'string', enum: ['high', 'medium', 'low'] },
                        },
                        required: ['headline', 'summary', 'sourceAnalysis', 'criticalCommentary', 'significance', ...(mondcivitanEnabled ? ['mondcivitanReflection'] : [])],
                      },
                    },
                    ...(includeEthical ? { conclusion: { type: 'string' }, ...ethicalProperties } : {}),
                  },
                  required: ['themes', ...(includeEthical ? ['introduction', 'conclusion', ...ethicalRequired] : [])],
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'generate_themes' } },
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text().catch(() => '');
          console.error(`AI failed (${aiResp.status}): ${errText.slice(0, 200)}`);
          return null;
        }
        const aiData = await aiResp.json();
        const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!args) { console.error('No tool_call in AI response'); return null; }
        try { return JSON.parse(args); } catch { console.error('Failed to parse tool_call args'); return null; }
      };

      const generateForLang = async (lang: typeof languages[0]) => {
        let allThemes: any[] = [];
        let introduction = '';
        let conclusion = '';
        const ethicalConsiderations: any[] = [];
        const legacyFields: Record<string, any> = {};

        if (isHighThemes) {
          // Split into two batches
          const half1 = Math.ceil(themeCount / 2);
          const half2 = themeCount - half1;
          const midIdx = Math.floor(balanced.length / 2);
          const arts1 = balanced.slice(0, midIdx);
          const arts2 = balanced.slice(midIdx);
          const toSummary = (arts: any[]) => arts.map((a: any, i: number) =>
            `<article index="${i+1}" source="${a.sourceName}"><title>${a.title}</title><url>${a.url}</url><content>${a.content}</content></article>`
          ).join('\n');

          const [r1, r2] = await Promise.all([
            callAI(lang, half1, toSummary(arts1), `Batch 1 of 2 — first ${half1} themes`, true),
            callAI(lang, half2, toSummary(arts2), `Batch 2 of 2 — next ${half2} themes (different topics from batch 1)`, false),
          ]);

          if (r1?.themes) allThemes.push(...r1.themes);
          if (r2?.themes) allThemes.push(...r2.themes);
          introduction = r1?.introduction || '';
          conclusion = r1?.conclusion || '';

          // Gather ethical from first batch
          for (const p of prioritizedEthicalPerspectives) {
            const key = toFieldKey(p.name);
            if (r1?.[key]) {
              ethicalConsiderations.push({ id: p.id, name: p.name, content: r1[key] });
              legacyFields[key] = r1[key];
            }
          }

          if (allThemes.length < themeCount) {
            const missingThemeCount = themeCount - allThemes.length;
            console.warn(`Schedule ${schedule.id}: recovery pass for ${missingThemeCount} missing themes in ${lang.code}`);
            const recovery = await callAI(lang, missingThemeCount, articlesSummary, `Recovery pass for ${missingThemeCount} remaining themes. Avoid duplicating these existing headlines: ${allThemes.map((theme: any) => theme?.headline || '').filter(Boolean).join(' | ')}`, false);
            if (recovery?.themes?.length) {
              allThemes.push(...recovery.themes);
            }
          }
        } else {
          const result = await callAI(lang, themeCount, articlesSummary, 'Full report', true);
          if (!result?.themes) return;
          allThemes = result.themes;
          introduction = result.introduction || '';
          conclusion = result.conclusion || '';
          for (const p of prioritizedEthicalPerspectives) {
            const key = toFieldKey(p.name);
            if (result[key]) {
              ethicalConsiderations.push({ id: p.id, name: p.name, content: result[key] });
              legacyFields[key] = result[key];
            }
          }
        }

        const seenHeadlines = new Set<string>();
        allThemes = allThemes.filter((theme: any) => {
          const key = String(theme?.headline || '').trim().toLowerCase();
          if (!key || seenHeadlines.has(key)) return false;
          seenHeadlines.add(key);
          return true;
        }).slice(0, themeCount);

        // Accept partial results: at least 4 themes or half the target
        const minAcceptable = Math.max(4, Math.ceil(themeCount / 2));
        if (allThemes.length < minAcceptable) {
          console.error(`Schedule ${schedule.id}: expected ~${themeCount} themes, got ${allThemes.length} (min ${minAcceptable})`);
          return;
        }
        if (allThemes.length < themeCount) {
          console.warn(`Schedule ${schedule.id}: partial result — ${allThemes.length}/${themeCount} themes, proceeding`);
        }

        console.log(`Schedule ${schedule.id}: got ${allThemes.length} themes for ${lang.code}`);

        const report = {
          title: `${lang.titlePrefix} — ${now.toLocaleDateString(lang.dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} (UTC)`,
          generatedAt: now.toISOString(),
          language: lang.code,
          introduction,
          themes: allThemes.map((t: any, i: number) => ({ id: `theme-${i}`, ...t })),
          conclusion,
          ...(ethicalConsiderations.length > 0 ? { ethicalConsiderations } : {}),
          ...legacyFields,
          sourcesAnalyzed: sourceNames,
        };

        const { error: insertErr } = await supabase.from('generated_reports').insert({
          schedule_id: schedule.id, title: report.title, report_data: report, language: lang.code,
        });

        if (insertErr) {
          console.error(`Failed to store ${lang.code} report:`, insertErr);
        } else {
          generatedLanguages.push(lang.code);
          console.log(`Schedule ${schedule.id}: ${lang.code} report stored with ${allThemes.length} themes`);
        }
      };

      // Run languages in parallel for speed (especially important for "both" immediate runs)
      await Promise.all(languages.map(async (lang) => {
        try {
          await generateForLang(lang);
        } catch (langErr) {
          console.error(`Schedule ${schedule.id}: failed for ${lang.code}:`, langErr);
        }
      }));

      if (generatedLanguages.length > 0) {
        const { error: updateErr } = await supabase
          .from('report_schedules')
          .update({ last_run_at: now.toISOString() })
          .eq('id', schedule.id);
        if (updateErr) {
          console.error(`Schedule ${schedule.id}: failed to update last_run_at:`, updateErr);
        } else {
          console.log(`Schedule ${schedule.id}: last_run_at updated to ${now.toISOString()}`);
        }

        // Trigger notification to subscribers
        try {
          await supabase.functions.invoke('send-notification', {
            body: { type: 'daily_report' },
          });
          console.log(`Schedule ${schedule.id}: notification triggered`);
        } catch (notifErr) {
          console.error(`Schedule ${schedule.id}: notification failed:`, notifErr);
        }
      } else {
        console.error(`Schedule ${schedule.id}: no reports generated at all`);
      }

      if (generatedLanguages.length > 0) {
        results.push(`Schedule ${schedule.id}: generated ${generatedLanguages.join('+')}`);
      } else {
        results.push(`Schedule ${schedule.id}: no reports generated`);
      }
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
