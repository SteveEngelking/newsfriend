import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NewsSource } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Clock, Download, Trash2, CalendarClock, ExternalLink, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { generateDailyNewsHtml, openReportInNewTab, downloadReportHtml } from '@/lib/generateReportHtml';
import { DailyNewsReport } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  sources: NewsSource[];
}

interface Schedule {
  id: string;
  frequency: string;
  language: 'en' | 'de';
  source_ids: string[];
  articles_per_source: number;
  enabled: boolean;
  mondcivitan_enabled: boolean;
  schweitzer_enabled: boolean;
  target_themes: number;
  sources_per_theme: number;
  report_style: string;
  schedule_hour_utc: number;
  last_run_at: string | null;
  created_at: string;
}

interface GeneratedReport {
  id: string;
  schedule_id: string;
  title: string;
  report_data: DailyNewsReport;
  created_at: string;
}

export function ScheduleManager({ sources }: Props) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [frequency, setFrequency] = useState('daily');
  const [mondcivitanEnabled, setMondcivitanEnabled] = useState(false);
  const [schweitzerEnabled, setSchweitzerEnabled] = useState(false);
  const [maxArticles, setMaxArticles] = useState(80);
  const [targetThemes, setTargetThemes] = useState(0);
  const [sourcesPerTheme, setSourcesPerTheme] = useState(2);
  const [aiModel, setAiModel] = useState('openai/gpt-5-mini');
  const [reportStyle, setReportStyle] = useState('analytical');
  const [scheduleHourUtc, setScheduleHourUtc] = useState(6);
  const [outputLanguage, setOutputLanguage] = useState<'en' | 'de'>('en');
  const [immediateLanguage, setImmediateLanguage] = useState<'en' | 'de' | 'both'>('both');
  const [isLoading, setIsLoading] = useState(false);
  const [bannerImagesEnabled, setBannerImagesEnabled] = useState(false);
  const [specialBannerImagesEnabled, setSpecialBannerImagesEnabled] = useState(false);
  const [themeCommentsEnabled, setThemeCommentsEnabled] = useState(false);
  const [bannerToggleSaving, setBannerToggleSaving] = useState(false);
  const [specialBannerToggleSaving, setSpecialBannerToggleSaving] = useState(false);
  const [themeCommentsSaving, setThemeCommentsSaving] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const loadData = useCallback(async () => {
    const [schedRes, repRes, settingsRes] = await Promise.all([
      supabase.from('report_schedules').select('*').limit(1).single(),
      supabase.from('generated_reports').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('app_settings').select('banner_images_enabled, special_edition_banners_enabled, theme_comments_enabled').eq('id', 1).maybeSingle(),
    ]);

    if (settingsRes.data) {
      setBannerImagesEnabled(!!settingsRes.data.banner_images_enabled);
      setSpecialBannerImagesEnabled(!!(settingsRes.data as any).special_edition_banners_enabled);
      setThemeCommentsEnabled(!!(settingsRes.data as any).theme_comments_enabled);
    }

    if (schedRes.data) {
      const sched = schedRes.data as Schedule;
      setSchedule(sched);
      setFrequency(sched.frequency);
      setMondcivitanEnabled(sched.mondcivitan_enabled ?? false);
      setSchweitzerEnabled(sched.schweitzer_enabled ?? false);
      setMaxArticles((sched as any).max_articles ?? 80);
      setTargetThemes((sched as any).target_themes ?? 0);
      setSourcesPerTheme((sched as any).sources_per_theme ?? 2);
      setAiModel((sched as any).ai_model || 'openai/gpt-5-mini');
      setReportStyle((sched as any).report_style || 'analytical');
      setScheduleHourUtc(Number.isInteger((sched as any).schedule_hour_utc) ? (sched as any).schedule_hour_utc : 6);
      setOutputLanguage(sched.language || language);
    } else {
      setOutputLanguage(language);
    }
    if (repRes.data) setReports(repRes.data as unknown as GeneratedReport[]);
  }, [language]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!schedule) return;
    const enabledIds = sources.filter(s => s.enabled).map(s => s.id);
    const same = enabledIds.length === schedule.source_ids.length && enabledIds.every(id => schedule.source_ids.includes(id));
    if (!same && enabledIds.length > 0) {
      supabase.from('report_schedules').update({ source_ids: enabledIds }).eq('id', schedule.id).then(() => loadData());
    }
  }, [sources, schedule, loadData]);

  const handleSaveSchedule = async () => {
    const enabledSources = sources.filter(s => s.enabled);
    if (enabledSources.length === 0) {
      toast({ title: t('scheduleNoSources'), description: t('scheduleNoSourcesDesc'), variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const sourceIds = enabledSources.map(s => s.id);

    if (schedule) {
      const updateData: Record<string, unknown> = { frequency, language, source_ids: sourceIds, enabled: true, mondcivitan_enabled: mondcivitanEnabled, schweitzer_enabled: schweitzerEnabled, max_articles: maxArticles, target_themes: targetThemes, sources_per_theme: sourcesPerTheme, ai_model: aiModel, report_style: reportStyle, schedule_hour_utc: scheduleHourUtc };
      if (frequency === 'immediate') updateData.last_run_at = null;
      const { error } = await supabase.from('report_schedules').update(updateData as any).eq('id', schedule.id);
      if (error) {
        toast({ title: t('sourceError'), description: error.message || t('scheduleUpdateFailed'), variant: 'destructive' });
      } else {
        toast({ title: t('scheduleUpdated') });
        if (frequency === 'immediate') await triggerImmediateGeneration(schedule.id);
        loadData();
      }
    } else {
      const { data, error } = await supabase
        .from('report_schedules')
        .insert({ frequency, language: language, source_ids: sourceIds, articles_per_source: 8, enabled: true, mondcivitan_enabled: mondcivitanEnabled, schweitzer_enabled: schweitzerEnabled, max_articles: maxArticles, target_themes: targetThemes, sources_per_theme: sourcesPerTheme, ai_model: aiModel, report_style: reportStyle, schedule_hour_utc: scheduleHourUtc } as any)
        .select('id')
        .single();
      if (error) {
        toast({ title: t('sourceError'), description: t('scheduleCreateFailed'), variant: 'destructive' });
      } else {
        toast({ title: t('scheduleCreated') });
        if (frequency === 'immediate' && data?.id) await triggerImmediateGeneration(data.id);
        loadData();
      }
    }
    setIsLoading(false);
  };

  const triggerImmediateGeneration = async (scheduleId: string) => {
    const languages = immediateLanguage === 'both' ? ['en', 'de'] : [immediateLanguage];
    toast({ title: t('scheduleRunningNow'), description: language === 'de' ? 'Dies kann 3–6 Minuten dauern. Die Liste wird automatisch aktualisiert.' : 'This can take 3–6 minutes. The list will refresh automatically.' });
    // Fire one invocation per language IN PARALLEL so they don't share the same
    // edge-function wall-clock budget (each language can take 3–5 min on its own).
    for (const lang of languages) {
      supabase.functions.invoke('generate-scheduled-report', {
        body: { forceImmediate: true, scheduleId, languages: [lang] },
      }).then(({ error, data }) => {
        if (error) {
          console.error(`Background generation error (${lang}):`, error);
          toast({ title: t('sourceError'), description: `${lang.toUpperCase()}: ${t('scheduleRunFailed')}`, variant: 'destructive' });
          return;
        }
        console.log(`Generation accepted (${lang}):`, data);
      }).catch(e => console.error(`Background generation error (${lang}):`, e));
    }
    // Poll for results every 30s for up to 8 minutes — each successful language
    // will appear in the past-reports list as soon as it finishes.
    let polls = 0;
    const maxPolls = 16;
    const interval = setInterval(() => {
      polls += 1;
      loadData();
      if (polls >= maxPolls) clearInterval(interval);
    }, 30000);
  };

  const handleToggleSchedule = async () => {
    if (!schedule) return;
    const { error } = await supabase.from('report_schedules').update({ enabled: !schedule.enabled }).eq('id', schedule.id);
    if (!error) loadData();
  };

  const handleToggleBannerImages = async (checked: boolean) => {
    setBannerToggleSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 1, banner_images_enabled: checked, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    setBannerToggleSaving(false);
    if (error) {
      toast({
        title: t('sourceError') || 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    setBannerImagesEnabled(checked);
    toast({
      title: checked
        ? (language === 'de' ? 'Banner-Bilder aktiviert' : 'Banner images enabled')
        : (language === 'de' ? 'Banner-Bilder deaktiviert' : 'Banner images disabled'),
    });
  };

  const handleToggleSpecialBannerImages = async (checked: boolean) => {
    setSpecialBannerToggleSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 1, special_edition_banners_enabled: checked, updated_at: new Date().toISOString() } as any, { onConflict: 'id' });
    setSpecialBannerToggleSaving(false);
    if (error) {
      toast({ title: t('sourceError') || 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setSpecialBannerImagesEnabled(checked);
    toast({
      title: checked
        ? (language === 'de' ? 'Sonderausgaben-Banner aktiviert' : 'Special edition banners enabled')
        : (language === 'de' ? 'Sonderausgaben-Banner deaktiviert' : 'Special edition banners disabled'),
    });
  };

  const handleToggleThemeComments = async (checked: boolean) => {
    setThemeCommentsSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 1, theme_comments_enabled: checked, updated_at: new Date().toISOString() } as any, { onConflict: 'id' });
    setThemeCommentsSaving(false);
    if (error) {
      toast({ title: t('sourceError') || 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setThemeCommentsEnabled(checked);
    toast({
      title: checked
        ? (language === 'de' ? 'Kommentare aktiviert' : 'Comments enabled')
        : (language === 'de' ? 'Kommentare deaktiviert' : 'Comments disabled'),
    });
  };

  const handleDeleteReport = async (id: string) => {
    await supabase.from('generated_reports').delete().eq('id', id);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const getReportHtml = (report: GeneratedReport) => {
    const reportLanguage = (report.report_data as any)?.language === 'de' ? 'de' : outputLanguage;
    return generateDailyNewsHtml(report.report_data as unknown as DailyNewsReport, reportLanguage);
  };

  const fmtH = (h: number) => String(((h % 24) + 24) % 24).padStart(2, '0') + ':00';
  const deH = (scheduleHourUtc + 1) % 24;

  // ---- Rough cost estimator (client-side, no AI call) ----
  // Pricing per 1M tokens (input / output) — approximate Lovable AI Gateway list prices.
  const MODEL_PRICING: Record<string, { in: number; out: number }> = {
    'openai/gpt-5-mini': { in: 0.25, out: 2.0 },
    'openai/gpt-5': { in: 1.25, out: 10.0 },
    'openai/gpt-5.2': { in: 1.25, out: 10.0 },
    'google/gemini-3-flash-preview': { in: 0.30, out: 2.50 },
    'google/gemini-2.5-pro': { in: 1.25, out: 10.0 },
    'google/gemini-2.5-flash': { in: 0.30, out: 2.50 },
    'google/gemini-3.1-pro-preview': { in: 1.25, out: 10.0 },
  };
  // (sources count not used in estimate; themes drives most token volume)
  const themes = targetThemes > 0 ? targetThemes : 8; // auto ≈ 8
  const price = MODEL_PRICING[aiModel] || { in: 1, out: 5 };

  // Per language: theme extraction + per-theme synthesis
  const extractionIn = maxArticles * 300;
  const extractionOut = themes * 200;
  const synthesisIn = themes * sourcesPerTheme * 1500;
  const synthesisOut = themes * 1500;
  let tokenCostPerLang =
    ((extractionIn + synthesisIn) / 1_000_000) * price.in +
    ((extractionOut + synthesisOut) / 1_000_000) * price.out;
  if (mondcivitanEnabled) {
    tokenCostPerLang += (themes * 500 / 1_000_000) * price.in + (themes * 800 / 1_000_000) * price.out;
  }
  if (schweitzerEnabled) {
    tokenCostPerLang += (themes * 500 / 1_000_000) * price.in + (themes * 800 / 1_000_000) * price.out;
  }
  // Theme comments use a cheap model (~gpt-5-nano-ish)
  const commentsCostPerLang = themeCommentsEnabled
    ? (themes * 200 / 1_000_000) * 0.05 + (themes * 400 / 1_000_000) * 0.40
    : 0;
  // Banner image (per language run)
  const bannerCostPerLang = bannerImagesEnabled ? 0.04 : 0;

  const costPerLangRun = tokenCostPerLang + commentsCostPerLang + bannerCostPerLang;
  const languagesPerRun = frequency === 'immediate'
    ? (immediateLanguage === 'both' ? 2 : 1)
    : 2;
  const costPerRun = costPerLangRun * languagesPerRun;
  const runsPerMonth = frequency === 'daily' ? 30 : frequency === 'twice_daily' ? 60 : 0;
  const costPerMonth = costPerRun * runsPerMonth;
  const fmt$ = (n: number) => n < 0.01 ? `< $0.01` : `$${n.toFixed(2)}`;

  const frequencyLabels: Record<string, string> = {
    immediate: language === 'de' ? '⚡ Sofort (einmalig)' : '⚡ Immediate (one-time)',
    daily: language === 'de' ? '📅 Täglich' : '📅 Daily',
    twice_daily: language === 'de' ? '🔄 Zweimal täglich' : '🔄 Twice daily',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {t('scheduleTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="w-auto min-w-[260px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">{frequencyLabels.immediate}</SelectItem>
                <SelectItem value="daily">{frequencyLabels.daily}</SelectItem>
                <SelectItem value="twice_daily">{frequencyLabels.twice_daily}</SelectItem>
              </SelectContent>
            </Select>
            {frequency === 'immediate' && (
              <Select value={immediateLanguage} onValueChange={(value) => setImmediateLanguage(value as 'en' | 'de' | 'both')}>
                <SelectTrigger className="w-auto min-w-[220px]"><SelectValue placeholder={t('scheduleImmediateLanguageLabel')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">{t('scheduleImmediateBoth')}</SelectItem>
                  <SelectItem value="en">{t('scheduleImmediateEnglish')}</SelectItem>
                  <SelectItem value="de">{t('scheduleImmediateGerman')}</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleSaveSchedule} disabled={isLoading} size="sm">
              {schedule ? t('scheduleUpdate') : t('scheduleCreate')}
            </Button>
            {schedule && (
              <div className="flex items-center gap-2">
                <Switch checked={schedule.enabled} onCheckedChange={handleToggleSchedule} />
                <span className="text-sm text-muted-foreground">
                  {schedule.enabled ? t('scheduleActive') : t('schedulePaused')}
                </span>
              </div>
            )}
          </div>
          {frequency !== 'immediate' && (
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium">{language === 'de' ? 'Startzeit (EN, UTC)' : 'Start hour (EN, UTC)'}</label>
              <Select value={String(scheduleHourUtc)} onValueChange={(v) => setScheduleHourUtc(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <SelectItem key={h} value={String(h)}>{fmtH(h)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {language === 'de' ? `DE läuft 1 Std. später um ${fmtH(deH)} UTC` : `DE runs 1 hour later at ${fmtH(deH)} UTC`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">{t('scheduleMaxArticles')}</label>
            <Select value={String(maxArticles)} onValueChange={(v) => setMaxArticles(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[40, 60, 80, 100, 120, 150].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">{language === 'de' ? 'KI-Modell' : 'AI Model'}</label>
            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai/gpt-5-mini">GPT-5 Mini (fast)</SelectItem>
                <SelectItem value="openai/gpt-5">GPT-5 (quality)</SelectItem>
                <SelectItem value="openai/gpt-5.2">GPT-5.2 (latest)</SelectItem>
                <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (fast)</SelectItem>
                <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (quality)</SelectItem>
                <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="google/gemini-3.1-pro-preview">Z-AI (Gemini 3.1 Pro)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">{language === 'de' ? 'Berichtsstil' : 'Report Style'}</label>
            <Select value={reportStyle} onValueChange={setReportStyle}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newspaper">{language === 'de' ? '📰 Zeitung / Editorial' : '📰 Newspaper / Editorial'}</SelectItem>
                <SelectItem value="brief">{language === 'de' ? '📋 Kurzbericht' : '📋 Brief / Executive Summary'}</SelectItem>
                <SelectItem value="analytical">{language === 'de' ? '🔍 Analytisch' : '🔍 Analytical / Deep Dive'}</SelectItem>
                <SelectItem value="conversational">{language === 'de' ? '💬 Konversationell' : '💬 Conversational / Blog'}</SelectItem>
                <SelectItem value="philosophical">{language === 'de' ? '🤔 Philosophisch' : '🤔 Philosophical'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">{language === 'de' ? 'Themen pro Bericht' : 'Themes per report'}</label>
            <Select value={String(targetThemes)} onValueChange={(v) => setTargetThemes(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{language === 'de' ? 'Auto' : 'Auto'}</SelectItem>
                {[4, 5, 6, 7, 8, 10, 12, 15, 20].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">{language === 'de' ? 'Quellen pro Thema' : 'Sources per theme'}</label>
            <Select value={String(sourcesPerTheme)} onValueChange={(v) => setSourcesPerTheme(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="mondcivitan" checked={mondcivitanEnabled} onCheckedChange={(checked) => setMondcivitanEnabled(checked === true)} />
            <label htmlFor="mondcivitan" className="text-sm cursor-pointer">
              <span className="font-medium">{t('mondcivitanLabel')}</span>
              <span className="text-muted-foreground ml-1 text-xs">— {t('mondcivitanDesc')}</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="schweitzer" checked={schweitzerEnabled} onCheckedChange={(checked) => setSchweitzerEnabled(checked === true)} />
            <label htmlFor="schweitzer" className="text-sm cursor-pointer">
              <span className="font-medium">{t('schweitzerLabel')}</span>
              <span className="text-muted-foreground ml-1 text-xs">— {t('schweitzerDesc')}</span>
            </label>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
            <ImageIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Switch
                  id="banner-images"
                  checked={bannerImagesEnabled}
                  onCheckedChange={handleToggleBannerImages}
                  disabled={bannerToggleSaving}
                />
                <label htmlFor="banner-images" className="text-sm font-medium cursor-pointer">
                  {language === 'de' ? 'KI-Banner für Tagesberichte' : 'AI banners for daily reports'}
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'de'
                  ? 'Erstellt ein redaktionelles 16:9-Illustrationsbanner für jeden Tagesbericht (mit Wiederholung und Modell-Fallback). Wird in der App, im HTML-Download und in E-Mails angezeigt.'
                  : 'Creates an editorial 16:9 illustration banner for each daily report (with retry and model fallback). Shown in the app, HTML download, and emails.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
            <ImageIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Switch
                  id="special-banner-images"
                  checked={specialBannerImagesEnabled}
                  onCheckedChange={handleToggleSpecialBannerImages}
                  disabled={specialBannerToggleSaving}
                />
                <label htmlFor="special-banner-images" className="text-sm font-medium cursor-pointer">
                  {language === 'de' ? 'KI-Banner für Sonderausgaben' : 'AI banners for special editions'}
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'de'
                  ? 'Unabhängig vom Schalter für Tagesberichte. Aktivieren, um für jede Sonderausgabe ein Banner zu erzeugen.'
                  : 'Independent from the daily report toggle. Enable to generate a banner for each special edition.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
            <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Switch
                  id="theme-comments"
                  checked={themeCommentsEnabled}
                  onCheckedChange={handleToggleThemeComments}
                  disabled={themeCommentsSaving}
                />
                <label htmlFor="theme-comments" className="text-sm font-medium cursor-pointer">
                  {t('scheduleThemeCommentsLabel')}
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('scheduleThemeCommentsHelp')}
              </p>
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <div className="text-sm font-medium">
              {language === 'de' ? 'Geschätzte KI-Kosten' : 'Estimated AI cost'}
            </div>
            <div className="text-xs text-muted-foreground">
              {language === 'de'
                ? `Pro Lauf (${languagesPerRun} Sprache${languagesPerRun > 1 ? 'n' : ''}): `
                : `Per run (${languagesPerRun} language${languagesPerRun > 1 ? 's' : ''}): `}
              <span className="font-mono text-foreground">{fmt$(costPerRun)}</span>
              {runsPerMonth > 0 && (
                <>
                  {' • '}
                  {language === 'de' ? 'Pro Monat: ' : 'Per month: '}
                  <span className="font-mono text-foreground">{fmt$(costPerMonth)}</span>
                  <span className="opacity-70"> ({runsPerMonth}×)</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground italic">
              {language === 'de'
                ? 'Grobe Schätzung basierend auf Modell-Listenpreisen und typischen Token-Mengen. Tatsächliche Kosten können abweichen.'
                : 'Rough estimate based on model list prices and typical token volumes. Actual cost may vary.'}
            </div>
          </div>
          {schedule && (

            <p className="text-xs text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              {frequencyLabels[schedule.frequency] || frequencyLabels.daily} • {t('scheduleUsingSources')} {schedule.source_ids.length} {t('scheduleSources')}
              {schedule.last_run_at && ` • ${t('scheduleLastRun')} ${new Date(schedule.last_run_at).toLocaleString()}`}
            </p>
          )}
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('schedulePastReports')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reports.map(report => (
                <div key={report.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                      {' • '}
                      {(report.report_data as any)?.themes?.length || 0} {t('scheduleThemes')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openReportInNewTab(getReportHtml(report))}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadReportHtml(getReportHtml(report), report.title || 'scheduled-report')}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteReport(report.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
