const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callAIChatCompletion } from '../_shared/ai-gateway.ts';
import { enforceReportLanguage } from '../_shared/language-enforcer.ts';
import { requireAdminOrService } from '../_shared/auth.ts';

// Convert perspective name to a safe JSON key
function toFieldKey(name: string): string {
  return 'ethical_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAdminOrService(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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
      .select('*');

    // For manual immediate triggers, bypass the `enabled` filter so an admin can
    // run a one-off generation without first toggling the schedule on.
    if (!(forceImmediate && manualScheduleId)) {
      schedulesQuery = schedulesQuery.eq('enabled', true);
    }

    if (manualScheduleId) {
      schedulesQuery = schedulesQuery.eq('id', manualScheduleId);
    }

    const { data: schedules, error: schedErr } = await schedulesQuery;

    if (schedErr || !schedules?.length) {
      console.warn('generate-scheduled-report: no schedules matched', { manualScheduleId, forceImmediate, schedErr });
      return new Response(
        JSON.stringify({ message: 'No active schedules' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UTC start of "today" — used to check what's already been generated this calendar day
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const EN_LANG = { code: 'en', outputLang: 'English', titlePrefix: 'News of the Day', dateLocale: 'en-GB' };
    const DE_LANG = { code: 'de', outputLang: 'German', titlePrefix: 'Nachrichten des Tages', dateLocale: 'de-DE' };

    // Determine which languages are due for each schedule based on frequency + time-of-day,
    // PLUS catch-up: any language that hasn't been produced yet today (UTC) gets emitted on
    // any eligible run. This prevents loss when cron fires off-hour.
    async function getLanguagesDue(schedule: any): Promise<typeof EN_LANG[]> {
      if (forceImmediate) {
        const codes = requestedLanguages.length > 0 ? requestedLanguages : ['en', 'de'];
        return codes.map((code) => code === 'de' ? DE_LANG : EN_LANG);
      }

      const freq = schedule.frequency;
      if (freq === 'immediate') {
        if (schedule.last_run_at) return [];
        return [EN_LANG, DE_LANG];
      }

      // Trigger hours: configurable per schedule (default 6 UTC for EN). DE runs 1 hour later.
      const baseHour = Number.isInteger(schedule.schedule_hour_utc) ? schedule.schedule_hour_utc : 6;
      const enHours = freq === 'twice_daily' ? [baseHour, (baseHour + 12) % 24] : [baseHour];
      const deHours = enHours.map(h => (h + 1) % 24); // DE is nominally 1 hour later

      const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
      const minutesSinceLastRun = lastRun ? (now.getTime() - lastRun.getTime()) / (1000 * 60) : 999999;
      // Minimum gap to prevent double-firing within the same minute (cron retries).
      // Must be < 60 min so that the EN run at 06:00 does not block the DE run at 07:00.
      if (minutesSinceLastRun < 30) return [];

      // Window is open once we've reached the earliest EN trigger hour for the day
      const earliestHour = Math.min(...enHours);
      if (currentHour < earliestHour) return [];

      // Check what was already produced today by this schedule
      const { data: todays } = await supabase
        .from('generated_reports')
        .select('language')
        .eq('schedule_id', schedule.id)
        .gte('created_at', startOfTodayUtc.toISOString());
      const producedToday = new Set((todays ?? []).map((r: any) => r.language));

      const due: typeof EN_LANG[] = [];

      // Catch-up trigger: once the scheduled hour has passed for the day,
      // fire on any subsequent hourly tick UNTIL a report exists for the day.
      // The `producedToday` check makes this idempotent — only one EN and one
      // DE report per UTC day per schedule — so a missed cron tick at the
      // exact hour no longer skips the day entirely.
      const enDue = enHours.some(h => currentHour >= h) && !producedToday.has('en');
      const deDue = deHours.some(h => currentHour >= h) && !producedToday.has('de');
      if (enDue) due.push(EN_LANG);
      if (deDue) due.push(DE_LANG);

      // For twice_daily, allow a second run in the evening window once the
      // second scheduled hour has passed.
      if (freq === 'twice_daily' && enHours.length > 1) {
        const eveningEnHour = enHours[1];
        const eveningDeHour = deHours[1];
        const enCount = (todays ?? []).filter((r: any) => r.language === 'en').length;
        const deCount = (todays ?? []).filter((r: any) => r.language === 'de').length;
        if (currentHour >= eveningEnHour && enCount < 2 && !due.some(l => l.code === 'en')) due.push(EN_LANG);
        if (currentHour >= eveningDeHour && deCount < 2 && !due.some(l => l.code === 'de')) due.push(DE_LANG);
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

    // Fetch admin-editable Mondcivitan prompt instruction
    const { data: mondcivitanRow } = await supabase
      .from('mondcivitan_settings')
      .select('prompt_instruction')
      .eq('id', 1)
      .maybeSingle();
    const mondcivitanPromptOverride = (mondcivitanRow?.prompt_instruction || '').trim();

    const results: string[] = [];

    const triggerDailyNotification = async (
      scheduleId: string,
      reportId: string,
      language: string,
      context: 'post-generation' | 'catch-up',
    ): Promise<boolean> => {
      try {
        // Use an explicit server-to-server request. Nested functions.invoke calls
        // have intermittently forwarded the wrong Authorization header here,
        // causing send-notification to reject the scheduler with HTTP 401.
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'daily_report', reportId, language }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          console.error(`Schedule ${scheduleId}: ${context} notification invocation failed for ${language}:`, {
            status: response.status,
            data,
          });
          results.push(`Schedule ${scheduleId}: notification FAILED for ${language} (${context})`);
          return false;
        }

        const sent = typeof data?.sent === 'number' ? data.sent : 0;
        if (sent === 0) {
          console.warn(`Schedule ${scheduleId}: ${context} notification queued 0 emails for ${language}:`, data);
          results.push(`Schedule ${scheduleId}: notification queued 0 emails for ${language} (${context})`);
          return false;
        }

        console.log(`Schedule ${scheduleId}: ${context} notification queued ${sent} emails for ${language} (report ${reportId})`);
        return true;
      } catch (error) {
        console.error(`Schedule ${scheduleId}: ${context} notification threw for ${language}:`, error);
        results.push(`Schedule ${scheduleId}: notification FAILED for ${language} (${context})`);
        return false;
      }
    };

    const runScheduleWork = async () => {
      for (const schedule of schedules) {
      // Use new time-of-day trigger logic with catch-up
      let languagesDue = await getLanguagesDue(schedule);
      // Honor the schedule's language field: a DE schedule should only ever
      // produce DE reports (and vice versa). Without this filter, every enabled
      // schedule would emit BOTH EN and DE.
      const scheduleLang = (schedule.language || '').toLowerCase().startsWith('de') ? 'de'
        : (schedule.language || '').toLowerCase().startsWith('en') ? 'en' : null;
      if (scheduleLang && !forceImmediate) {
        languagesDue = languagesDue.filter(l => l.code === scheduleLang);
      }
      if (languagesDue.length === 0) {
        // A report may have been stored near the edge-runtime limit before its
        // notification call completed. On later hourly ticks, retry any report
        // that has no email log rows yet instead of treating the day as done.
        const { data: latestReport } = await supabase
          .from('generated_reports')
          .select('id, language, created_at')
          .eq('schedule_id', schedule.id)
          .gte('created_at', startOfTodayUtc.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestReport?.id) {
          const { data: existingNotification } = await supabase
            .from('email_send_log')
            .select('id')
            .eq('template_name', 'daily-report-notification')
            .gte('created_at', latestReport.created_at)
            .limit(1)
            .maybeSingle();

          if (!existingNotification) {
            const queued = await triggerDailyNotification(
              schedule.id,
              latestReport.id,
              latestReport.language || scheduleLang || 'en',
              'catch-up',
            );
            if (queued) {
              results.push(`Schedule ${schedule.id}: notification catch-up completed`);
              continue;
            }
          }
        }

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
      const allQueries = isHighThemes ? [
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

      // With many enabled sources, firing every source x every query at once
      // rate-limits Firecrawl and most requests fail — which silently collapses
      // the report down to a handful of publications. Scale queries per source
      // down as the source list grows, and cap concurrency.
      const langQueries = schedule.language === 'de'
        ? allQueries.filter(q => /nachrichten|welt politik|gesundheit wissenschaft/.test(q))
        : allQueries.filter(q => !/nachrichten|welt politik|gesundheit wissenschaft/.test(q));
      const baseQueries = langQueries.length ? langQueries : allQueries;
      const queriesPerSource = sources.length > 30 ? 1 : sources.length > 15 ? 2 : baseQueries.length;
      const queries = baseQueries.slice(0, queriesPerSource);

      const fetchTasks: { source: typeof sources[0]; query: string; perQuery: number }[] = [];
      for (const source of sources) {
        const perQuery = Math.max(2, Math.ceil(schedule.articles_per_source / queries.length));
        for (const q of queries) {
          fetchTasks.push({ source, query: q, perQuery });
        }
      }

      let fetchFailures = 0;
      const articlesBySourceId: Record<string, number> = {};
      const runTask = async (task: typeof fetchTasks[0], attempts = 3, pace = 0) => {
        if (pace) await new Promise(r => setTimeout(r, pace));
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
        let data: any = null;
        for (let attempt = 0; attempt < attempts; attempt++) {
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
          }).catch(() => null);

          if (resp?.ok) {
            data = await resp.json().catch(() => null);
            break;
          }
          // Retry rate limits / transient upstream errors with backoff
          if (resp && resp.status !== 429 && resp.status < 500) {
            fetchFailures++;
            console.warn(`Fetch ${task.source.name}: HTTP ${resp.status} — giving up`);
            return [];
          }
          if (attempt === attempts - 1) {
            console.warn(`Fetch ${task.source.name}: exhausted retries (last status ${resp?.status ?? 'network error'})`);
          }
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1) + Math.random() * 600));
        }


        if (!data?.success || !Array.isArray(data.data)) {
          fetchFailures++;
          return [];
        }

        // Reject URLs whose path clearly contains an old year (e.g. /2022/...)
        // Google's qdr:d filter occasionally surfaces stale evergreen URLs.
        const nowYear = new Date().getUTCFullYear();
        const isOldUrl = (u: string): boolean => {
          const m = u && u.match(/\/(19|20)(\d{2})\//);
          if (!m) return false;
          const y = parseInt(`${m[1]}${m[2]}`, 10);
          return y < nowYear - 1 || y > nowYear + 1;
        };

        const extractDate = (item: any): string | null => {
          const md = item?.metadata || {};
          const candidates = [
            md.publishedDate, md.published_date, md.publishedTime, md.published_time,
            md['article:published_time'], md.datePublished, md.date,
            item.publishedDate, item.published_date, item.date,
          ];
          for (const c of candidates) {
            if (typeof c === 'string' && c.length >= 4) {
              const d = new Date(c);
              if (!isNaN(d.getTime())) return d.toISOString();
            }
          }
          return null;
        };

        return data.data
          .filter((item: any) => item.url && !isOldUrl(item.url))
          .map((item: any) => {
            const publishedAt = extractDate(item);
            return {
              sourceName: task.source.name,
              title: item.title || 'Untitled',
              url: item.url,
              publishedAt, // ISO string or null
              content: (item.markdown || item.description || '').slice(0, isHighThemes ? 320 : (isImmediateRun ? 320 : 500)),
            };
          })
          .filter((a: any) => {
            // If we have a publish date, drop anything older than 48h
            if (!a.publishedAt) return true;
            const ageMs = Date.now() - new Date(a.publishedAt).getTime();
            return ageMs <= 48 * 60 * 60 * 1000;
          });
      };

      // Bounded concurrency so Firecrawl doesn't rate-limit us into a
      // 3-publication report when dozens of sources are enabled.
      const CONCURRENCY = 6;
      const runPass = async (tasks: typeof fetchTasks, concurrency: number, attempts: number, pace: number) => {
        let idx = 0;
        const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
          while (idx < tasks.length) {
            const task = tasks[idx++];
            try {
              const items = await runTask(task, attempts, pace);
              if (Array.isArray(items) && items.length) {
                articlesBySourceId[task.source.id] = (articlesBySourceId[task.source.id] || 0) + items.length;
                allArticles.push(...items);
              }
            } catch {
              fetchFailures++;
            }
          }
        });
        await Promise.all(workers);
      };

      await runPass(fetchTasks, CONCURRENCY, 3, 0);

      // Recovery pass: any source that returned nothing at all was almost
      // certainly rate-limited or timed out. Without this, a bad Firecrawl
      // window collapses the whole report onto one publication.
      const emptySources = sources.filter(s => !articlesBySourceId[s.id]);
      if (emptySources.length) {
        console.log(`Schedule ${schedule.id}: retrying ${emptySources.length} empty sources (pass 2)`);
        const retryTasks = emptySources.map(source => ({
          source,
          query: queries[0],
          perQuery: Math.max(2, Math.ceil(schedule.articles_per_source / queries.length)),
        }));
        await runPass(retryTasks, 3, 4, 400);
      }

      const publicationsWithArticles = Object.keys(articlesBySourceId).length;
      console.log(`Schedule ${schedule.id}: fetched ${allArticles.length} articles from ${publicationsWithArticles}/${sources.length} sources (${fetchTasks.length} queries, ${fetchFailures} failed)`);

      // Guard against publishing a single-publication report when many sources
      // are configured — better to abort and let the hourly catch-up retry.
      const diversityFloor = Math.min(4, sources.length);
      if (publicationsWithArticles < diversityFloor) {
        console.error(`Schedule ${schedule.id}: aborting — only ${publicationsWithArticles} of ${sources.length} sources returned articles`);
        results.push(`Schedule ${schedule.id}: aborted, insufficient source diversity (${publicationsWithArticles}/${sources.length})`);
        continue;
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
      const requestedSourcesPerTheme = Number(schedule.sources_per_theme) || 2;
      // Honor admin's sources_per_theme as-is, only clamped by available sources.
      const sourcesPerTheme = Math.max(1, Math.min(requestedSourcesPerTheme, Math.max(1, sourceNames.length)));

      const articlesSummary = balanced.map((a: any, i: number) =>
        `<article index="${i + 1}" source="${a.sourceName}">\n<title>${a.title}</title>\n<url>${a.url}</url>\n<content>${a.content}</content>\n</article>`
      ).join('\n\n');

      // Use languages determined by the time-of-day trigger
      const languages = languagesDue;

      const mondcivitanEnabled = schedule.mondcivitan_enabled === true;
      const schweitzerEnabled = schedule.schweitzer_enabled === true;
      const ethicalPerspectives = schweitzerEnabled ? allEthicalPerspectives : [];
      const prioritizedEthicalPerspectives = ethicalPerspectives;

      const mondcivitanDefault = `MONDCIVITAN REFLECTION: For EACH theme, write a "mondcivitanReflection" — a thoughtful paragraph reflecting on the news from the standpoint of the Mondcivitan Republic — Servant of Mankind. Constituted in 1953 by Hugh J. Schonfield and others (embodying the International Arbitration League of Nobel laureate Sir William Randal Cremer; ideals echoed in John Lennon's "Imagine"), it is an international servant nation that exists today in the minds and lives of those who consider themselves its citizens.

In the 1970s, it was established as a virtual nation. Citizenship is a personal choice: you decide to join and strive to live according to our principles. We maintain no central register of citizens; instead, we are all Servants of Mankind, serving wherever we have the opportunity and the means.

Its citizens live by seven principles: No-one is an Enemy, No-one is a Foreigner, Service to All, Complete Impartiality, Work for Peace, True Democracy, Equity and Justice. Write in DIRECT PRESENT TENSE (indicative mood) from the lived perspective of these citizens — how they ACTUALLY understand and respond to each story right now. NEVER use the conditional tense or hypothetical framing. FORBIDDEN words and phrases include: "would", "could", "should", "might", "may", "if", "were", "imagine if", "if nations followed", "were leaders to adopt", "ought to". State what citizens DO, BELIEVE, INSIST, and ACT ON.`;
      const mondcivitanInstruction = mondcivitanEnabled
        ? `\n\n${mondcivitanPromptOverride || mondcivitanDefault}`
        : '';

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
LANGUAGE RULE — ABSOLUTE, NO EXCEPTIONS: Every single field you output (title, introduction, summary, stance, bias indicators, key quotes, critical commentary, conclusion, mondcivitanReflection, ethical considerations) MUST be written entirely in ${lang.outputLang}. If a source quote is originally in another language (French, German, Spanish, Italian, etc.), you MUST translate it into ${lang.outputLang} — output ONLY the translation, never the original-language text and never both. This applies to EVERY keyQuote without exception. There must be ZERO words in any other language in your output, except for source/publication names in the sourceName field which MUST stay exactly as provided in the original list. URLs must also remain unchanged.
INTRODUCTION RULE — ABSOLUTE: The introduction MUST NOT mention any specific number of themes, topics, or articles (e.g. never write "ten themes", "20 topics", "the following 15 stories"). Write a natural editorial introduction without counting.
CONCLUSION RULE — ABSOLUTE: The conclusion MUST NOT reference any specific count of themes, topics, or articles either (never write "these ten themes", "the twenty stories above", "across these 15 topics"). Refer to the coverage in general terms only (e.g. "today's themes", "the stories above").
SOURCE-SPECIFIC ANALYSIS RULE — ABSOLUTE: For every source analysis, the "stance" field MUST describe how that specific publication framed THIS specific theme — not a generic boilerplate description of the outlet. NEVER output generic outlet self-descriptions such as "Latest news, sport, business, comment, analysis and reviews from the Guardian, the world's leading liberal voice." or anything resembling marketing copy or a publication's tagline. The stance must reference concrete details from the article (angle, framing, what they emphasised or omitted, tone) and be unique to this theme.
SOURCE DIVERSITY RULE: Across the ${batchThemeCount} themes you produce, vary which publications you cite. Do NOT reuse the same two publications for every theme when other relevant sources are available. Each theme should ideally feature a different combination of publications drawn from the article list.
ARTICLE EXCLUSIVITY RULE — ABSOLUTE: Each article URL may appear in AT MOST ONE theme's sourceAnalysis across the entire report. NEVER cite the same article URL in two different themes. If an article could fit several themes, assign it to the single most relevant one. Prefer fewer citations in a theme over reusing an article already used in another theme.
RULES: Identify exactly ${batchThemeCount} diverse themes. Include exactly ${sourcesPerTheme} source analyses per theme, each from a DIFFERENT publication. Only CURRENT news from today/last 24h. Be skeptical. Include articleUrl. Use only these exact sourceName values when citing publications: ${sourceNames.join(', ')}. Respond via tool calling.${mondcivitanEnabled ? '\nInclude a detailed mondcivitanReflection paragraph per theme applying Mondcivitan Republic principles thoughtfully.' : ''}${ethicalInstruction}`;

        const todayUTC = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
        const userMsg = `DATE: ${todayUTC} (UTC). ${batchLabel}. Create exactly ${batchThemeCount} themes in ${lang.outputLang}.\n\n${batchArticles}\n\nSources: ${sourceNames.join(', ')}`;

        const primaryModel = schedule.ai_model || 'openai/gpt-5-mini';
        const fallbackModel = 'openai/gpt-5-mini';

        const makeAIRequest = async (model: string) => {
          // Skip the Google free-tier path: our structured-output schema (many themes
          // + ethical perspectives) routinely triggers Gemini's "schema produces too
          // many states for serving" 400 error, costing 5–10s per failed batch and
          // sometimes letting the edge runtime time out before the EN run finishes.
          // Going straight to Lovable AI (gpt-5-mini) is reliable for this workload.
          const { response: aiResp, provider } = await callAIChatCompletion({
            model,
            max_completion_tokens: 32768,
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
                            type: 'array', minItems: sourcesPerTheme, maxItems: sourcesPerTheme,
                            items: {
                              type: 'object',
                              properties: {
                                sourceName: { type: 'string', description: `Must exactly match one of these original publication names: ${sourceNames.join(', ')}` },
                                stance: { type: 'string', description: 'How THIS publication framed THIS specific theme. Must reference concrete article details. Never a generic outlet description or tagline.' },
                                keyQuotes: { type: 'array', items: { type: 'string', description: `A short representative quote, FULLY TRANSLATED into ${lang.outputLang}. If the original quote is in another language (French, German, Spanish, etc.), translate it — do NOT output the original-language text. No bilingual output.` }, minItems: 1, maxItems: 1 },
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
          }, { preferFree: false });
          console.log(`[scheduled-report] lang=${lang.code} batch="${batchLabel}" model=${model} provider=${provider} status=${aiResp.status}`);
          return aiResp;
        };

        let aiResp = await makeAIRequest(primaryModel);

        // Fallback to a reliable model on 400 errors (model may not support tool calling)
        if (!aiResp.ok && aiResp.status === 400 && primaryModel !== fallbackModel) {
          console.warn(`AI model ${primaryModel} returned 400, falling back to ${fallbackModel}`);
          aiResp = await makeAIRequest(fallbackModel);
        }

        if (!aiResp.ok) {
          const errText = await aiResp.text().catch(() => '');
          console.error(`AI failed (${aiResp.status}): ${errText.slice(0, 200)}`);
          return null;
        }
        let aiData = await aiResp.json();
        let args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

        // Fallback: if model returned 200 but no tool_call (some models ignore tool_choice)
        if (!args && primaryModel !== fallbackModel) {
          console.warn(`AI model ${primaryModel} returned no tool_call, falling back to ${fallbackModel}`);
          const retryResp = await makeAIRequest(fallbackModel);
          if (!retryResp.ok) {
            const errText = await retryResp.text().catch(() => '');
            console.error(`Fallback AI failed (${retryResp.status}): ${errText.slice(0, 200)}`);
            return null;
          }
          aiData = await retryResp.json();
          args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        }

        if (!args) { console.error('No tool_call in AI response'); return null; }
        try { return JSON.parse(args); } catch { console.error('Failed to parse tool_call args'); return null; }
      };

      // Helper: generate ONLY introduction + conclusion + ethical considerations.
      // Used as a recovery pass when the main call was truncated by the token limit
      // (which previously left the report ending abruptly at "Conclusion").
      const callWrapup = async (lang: typeof languages[0], headlines: string[]) => {
        const ethicalProperties: Record<string, any> = {};
        const ethicalRequired: string[] = [];
        for (const p of prioritizedEthicalPerspectives) {
          const key = toFieldKey(p.name);
          ethicalProperties[key] = { type: 'string', description: `${p.name} — ethical analysis` };
          ethicalRequired.push(key);
        }
        const ethicalInstruction = prioritizedEthicalPerspectives.length > 0
          ? `\n\nETHICAL CONSIDERATIONS: Write a thoughtful, detailed paragraph (at least 4-6 sentences) for EACH perspective below:\n${prioritizedEthicalPerspectives.map((p, i) => `${i+1}. "${toFieldKey(p.name)}" — ${p.prompt_instruction}`).join('\n')}`
          : '';
        const sysPrompt = `You are a senior investigative journalist writing the framing sections of a daily news briefing entirely in ${lang.outputLang}. ZERO words in any other language.
Write an editorial introduction and a conclusion. Neither may mention any specific count of themes, topics or articles.${ethicalInstruction}
Respond via tool calling.`;
        const userMsg = `Today's report covers these themes:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\nWrite the introduction, the conclusion${ethicalRequired.length ? ', and each ethical consideration' : ''} in ${lang.outputLang}.`;

        try {
          const { response } = await callAIChatCompletion({
            model: 'openai/gpt-5-mini',
            max_completion_tokens: 16384,
            messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userMsg }],
            tools: [{
              type: 'function',
              function: {
                name: 'generate_wrapup',
                description: 'Generate introduction, conclusion and ethical considerations',
                parameters: {
                  type: 'object',
                  properties: {
                    introduction: { type: 'string' },
                    conclusion: { type: 'string' },
                    ...ethicalProperties,
                  },
                  required: ['introduction', 'conclusion', ...ethicalRequired],
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'generate_wrapup' } },
          }, { preferFree: false });
          if (!response.ok) { console.error(`[wrapup] failed status=${response.status}`); return null; }
          const data = await response.json();
          const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (!args) { console.error('[wrapup] no tool_call'); return null; }
          return JSON.parse(args);
        } catch (e) {
          console.error('[wrapup] error', e);
          return null;
        }
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
          if (!result?.themes) {
            console.error(`Schedule ${schedule.id}: ${lang.code} aborted — AI returned no themes (single-batch mode)`);
            return;
          }
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

        // If the main call was truncated (missing conclusion, introduction or ethical
        // sections), regenerate just those framing sections so the report never ends
        // abruptly at the "Conclusion" heading.
        const ethicalMissing = prioritizedEthicalPerspectives.length > 0 && ethicalConsiderations.length === 0;
        if (allThemes.length > 0 && (!conclusion?.trim() || !introduction?.trim() || ethicalMissing)) {
          console.warn(`Schedule ${schedule.id}: ${lang.code} wrap-up recovery (intro=${!!introduction} conclusion=${!!conclusion} ethical=${ethicalConsiderations.length})`);
          const wrapup = await callWrapup(lang, allThemes.map((t: any) => String(t?.headline || '')).filter(Boolean));
          if (wrapup) {
            if (!introduction?.trim()) introduction = wrapup.introduction || '';
            if (!conclusion?.trim()) conclusion = wrapup.conclusion || '';
            if (ethicalMissing) {
              for (const p of prioritizedEthicalPerspectives) {
                const key = toFieldKey(p.name);
                if (wrapup[key]) {
                  ethicalConsiderations.push({ id: p.id, name: p.name, content: wrapup[key] });
                  legacyFields[key] = wrapup[key];
                }
              }
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

        // Article exclusivity: ensure no article URL is cited in more than one theme.
        // Keep the first occurrence; strip duplicates from later themes.
        const seenArticleUrls = new Set<string>();
        allThemes = allThemes.map((theme: any) => {
          const sa = Array.isArray(theme?.sourceAnalysis) ? theme.sourceAnalysis : [];
          const filtered = sa.filter((s: any) => {
            const url = String(s?.articleUrl || '').trim();
            if (!url) return true;
            if (seenArticleUrls.has(url)) return false;
            seenArticleUrls.add(url);
            return true;
          });
          return { ...theme, sourceAnalysis: filtered };
        }).filter((theme: any) => Array.isArray(theme?.sourceAnalysis) && theme.sourceAnalysis.length > 0);

        // Accept partial results: at least 4 themes or half the target
        const minAcceptable = Math.max(4, Math.ceil(themeCount / 2));
        if (allThemes.length < minAcceptable) {
          console.error(`Schedule ${schedule.id}: ${lang.code} aborted — got ${allThemes.length} themes, need at least ${minAcceptable} of ${themeCount}`);
          return;
        }
        if (allThemes.length < themeCount) {
          console.warn(`Schedule ${schedule.id}: ${lang.code} partial — ${allThemes.length}/${themeCount} themes, proceeding`);
        }

        console.log(`Schedule ${schedule.id}: got ${allThemes.length} themes for ${lang.code}`);

        // Scrub any source-language leakage (e.g. German quotes in an English report)
        allThemes = await enforceReportLanguage(allThemes, lang.code);

        const report: any = {
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

        // Optional: generate editorial banner image when global toggle is on.
        // Reuse the banner from the OTHER language of this schedule if produced recently
        // (EN/DE typically run ~1h apart; the image is wordless so it's identical for both).
        try {
          const { data: settings } = await supabase
            .from('app_settings')
            .select('banner_images_enabled')
            .eq('id', 1)
            .maybeSingle();
          if ((settings as any)?.banner_images_enabled) {
            // Generate a fresh deterministic wordless SVG for every report. The seed is
            // language-neutral so EN/DE scheduled reports receive the same visual, without
            // copying stale AI images that may contain garbled text.
            const dateSeed = now.toISOString().slice(0, 10);
            const themeText = `newsfriend-${schedule.id}-${dateSeed}-${sourceNames.join('-')}`.slice(0, 400);
            const { data: banner, error: bannerErr } = await supabase.functions.invoke('generate-banner-image', {
              body: { themeText, kind: 'daily', reportId: `${schedule.id}-${lang.code}-${Date.now()}` },
            });
            if (banner?.url) {
              report.bannerImageUrl = banner.url as string;
              console.log(`Schedule ${schedule.id}: wordless banner generated for ${lang.code}`);
            } else if (bannerErr) {
              console.warn(`Schedule ${schedule.id}: banner generation failed for ${lang.code}:`, bannerErr);
            }
          }
        } catch (bannerErr) {
          console.warn(`Schedule ${schedule.id}: banner generation threw for ${lang.code}:`, bannerErr);
        }

        const { data: insertedReport, error: insertErr } = await supabase.from('generated_reports').insert({
          schedule_id: schedule.id, title: report.title, report_data: report, language: lang.code,
        }).select('id').single();

        if (insertErr) {
          console.error(`Failed to store ${lang.code} report:`, insertErr);
          return;
        }
        const newReportId = insertedReport?.id as string | undefined;

        generatedLanguages.push(lang.code);
        console.log(`Schedule ${schedule.id}: ${lang.code} report stored with ${allThemes.length} themes`);

        // Persist last_run_at AND trigger notification immediately per-language so that
        // a per-language failure or edge-function timeout on the OTHER language does not
        // lose the notification for the language that already succeeded.
        const { error: updateErr } = await supabase
          .from('report_schedules')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', schedule.id);
        if (updateErr) {
          console.error(`Schedule ${schedule.id}: failed to update last_run_at after ${lang.code}:`, updateErr);
        }

        // Fire notification (subscribers receive their preferred-language email).
        // send-notification is idempotent per (template, recipient, date), so being
        // called twice in a single run (once per language) is safe.
        if (newReportId) {
          await triggerDailyNotification(schedule.id, newReportId, lang.code, 'post-generation');
        } else {
          console.error(`Schedule ${schedule.id}: report stored without an id; notification cannot be triggered for ${lang.code}`);
          results.push(`Schedule ${schedule.id}: notification FAILED for ${lang.code} (missing report id)`);
        }
      };

      // Run languages SEQUENTIALLY: parallel runs were occasionally letting one
      // language starve the other of compute time within the edge runtime's soft
      // shutdown window, so e.g. DE finished but EN never completed.
      for (const lang of languages) {
        try {
          console.log(`Schedule ${schedule.id}: starting generation for ${lang.code}`);
          await generateForLang(lang);
          console.log(`Schedule ${schedule.id}: finished generation for ${lang.code}`);
        } catch (langErr) {
          console.error(`Schedule ${schedule.id}: failed for ${lang.code}:`, langErr instanceof Error ? `${langErr.message}\n${langErr.stack}` : langErr);
        }
      }

      if (generatedLanguages.length === 0) {
        console.error(`Schedule ${schedule.id}: no reports generated at all`);
      }

      if (generatedLanguages.length > 0) {
        results.push(`Schedule ${schedule.id}: generated ${generatedLanguages.join('+')}`);
      } else {
        results.push(`Schedule ${schedule.id}: no reports generated`);
      }
      }
    };

    const work = runScheduleWork()
      .then(() => console.log('scheduled report background complete:', results))
      .catch((e) => console.error('scheduled report background error:', e));

    const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
    if (typeof waitUntil === 'function') {
      waitUntil(work);
      return new Response(
        JSON.stringify({ status: 'accepted', message: forceImmediate ? 'Generation started' : 'Scheduled generation started', schedules: schedules.length }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await work;
    return new Response(
      JSON.stringify({ status: 'complete', message: forceImmediate ? 'Generation complete' : 'Scheduled generation complete', results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scheduled report error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate scheduled reports' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
