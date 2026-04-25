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
import { Clock, Download, Trash2, CalendarClock, ExternalLink, Image as ImageIcon } from 'lucide-react';
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
  report_style: string;
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
  const [aiModel, setAiModel] = useState('openai/gpt-5-mini');
  const [reportStyle, setReportStyle] = useState('analytical');
  const [outputLanguage, setOutputLanguage] = useState<'en' | 'de'>('en');
  const [immediateLanguage, setImmediateLanguage] = useState<'en' | 'de' | 'both'>('both');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const loadData = useCallback(async () => {
    const [schedRes, repRes] = await Promise.all([
      supabase.from('report_schedules').select('*').limit(1).single(),
      supabase.from('generated_reports').select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    if (schedRes.data) {
      const sched = schedRes.data as Schedule;
      setSchedule(sched);
      setFrequency(sched.frequency);
      setMondcivitanEnabled(sched.mondcivitan_enabled ?? false);
      setSchweitzerEnabled(sched.schweitzer_enabled ?? false);
      setMaxArticles((sched as any).max_articles ?? 80);
      setTargetThemes((sched as any).target_themes ?? 0);
      setAiModel((sched as any).ai_model || 'openai/gpt-5-mini');
      setReportStyle((sched as any).report_style || 'analytical');
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
      const updateData: Record<string, unknown> = { frequency, language, source_ids: sourceIds, enabled: true, mondcivitan_enabled: mondcivitanEnabled, schweitzer_enabled: schweitzerEnabled, max_articles: maxArticles, target_themes: targetThemes, ai_model: aiModel, report_style: reportStyle };
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
        .insert({ frequency, language: language, source_ids: sourceIds, articles_per_source: 8, enabled: true, mondcivitan_enabled: mondcivitanEnabled, schweitzer_enabled: schweitzerEnabled, max_articles: maxArticles, target_themes: targetThemes, ai_model: aiModel, report_style: reportStyle } as any)
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
    toast({ title: t('scheduleRunningNow') });
    // Fire and forget — don't await, the edge function can take 2-3 minutes
    supabase.functions.invoke('generate-scheduled-report', {
      body: { forceImmediate: true, scheduleId, languages },
    }).then(({ error }) => {
      if (error) {
        console.error('Background generation error:', error);
        toast({ title: t('sourceError'), description: t('scheduleRunFailed'), variant: 'destructive' });
      } else {
        toast({ title: t('scheduleRunReady') });
        loadData();
      }
    }).catch(e => console.error('Background generation error:', e));
  };

  const handleToggleSchedule = async () => {
    if (!schedule) return;
    const { error } = await supabase.from('report_schedules').update({ enabled: !schedule.enabled }).eq('id', schedule.id);
    if (!error) loadData();
  };

  const handleDeleteReport = async (id: string) => {
    await supabase.from('generated_reports').delete().eq('id', id);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const getReportHtml = (report: GeneratedReport) => {
    const reportLanguage = (report.report_data as any)?.language === 'de' ? 'de' : outputLanguage;
    return generateDailyNewsHtml(report.report_data as unknown as DailyNewsReport, reportLanguage);
  };

  const frequencyLabels: Record<string, string> = {
    immediate: language === 'de' ? '⚡ Sofort (einmalig)' : '⚡ Immediate (one-time)',
    daily: language === 'de' ? '📅 Täglich (EN 06:00 · DE 07:00 UTC)' : '📅 Daily (EN 06:00 · DE 07:00 UTC)',
    twice_daily: language === 'de' ? '🔄 Zweimal täglich (EN 06:00/18:00 · DE 07:00/19:00 UTC)' : '🔄 Twice daily (EN 06:00/18:00 · DE 07:00/19:00 UTC)',
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
